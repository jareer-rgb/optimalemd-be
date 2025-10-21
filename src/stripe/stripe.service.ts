import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { MailerService } from '../mailer/mailer.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private appointmentsService: AppointmentsService,
    private mailerService: MailerService,
    private googleCalendarService: GoogleCalendarService
  ) {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  /**
   * Create a payment intent for an appointment or welcome order
   */
  async createPaymentIntent(createPaymentIntentDto: CreatePaymentIntentDto) {
    const { appointmentId, welcomeOrderId, amount, currency = 'usd' } = createPaymentIntentDto;

    let metadata: any = {};
    let description = '';

    if (appointmentId) {
      // Handle appointment payment
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, primaryEmail: true } },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      if (appointment.isPaid) {
        throw new BadRequestException('Appointment is already paid');
      }

      metadata.appointmentId = appointmentId;
      description = `Payment for appointment with ${appointment.doctor ? `${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'To be assigned'}`;
    } else if (welcomeOrderId) {
      // Handle welcome order payment
      const welcomeOrder = await this.prisma.welcomeOrder.findUnique({
        where: { id: welcomeOrderId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, primaryEmail: true } },
        },
      });

      if (!welcomeOrder) {
        throw new NotFoundException('Welcome order not found');
      }

      if (welcomeOrder.paymentStatus === 'SUCCEEDED') {
        throw new BadRequestException('Welcome order is already paid');
      }

      metadata.welcomeOrderId = welcomeOrderId;
      description = `Payment for welcome order - ${welcomeOrder.orderNumber}`;
    } else {
      throw new BadRequestException('Either appointmentId or welcomeOrderId must be provided');
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      description,
    });

    // Create payment record
    if (appointmentId) {
      await this.prisma.payment.create({
        data: {
          appointmentId,
          stripePaymentId: paymentIntent.id,
          amount,
          currency,
          status: 'PENDING',
          paymentIntent: paymentIntent.id,
        },
      });
    }
    // For welcome orders, we don't create a separate payment record
    // The payment info is stored in the welcome order itself

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    };
  }

  /**
   * Confirm payment and update appointment status
   */
  async confirmPayment(confirmPaymentDto: ConfirmPaymentDto) {
    const { paymentIntentId, appointmentId } = confirmPaymentDto;

    // Verify payment intent
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { paymentIntent: paymentIntentId },
      data: {
        status: 'SUCCEEDED',
        paidAt: new Date(),
      },
    });

    // Generate Google Meet link for the appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const doctorName = appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'To be assigned';
    
    // Generate Google Meet link
    const meetResult = await this.googleCalendarService.generateMeetLink(
      appointment.appointmentDate,
      appointment.appointmentTime,
      appointment.duration,
      doctorName,
      patientName,
      appointment.service.name,
      appointment.patient.primaryEmail || undefined, // Pass patient email
      appointment.doctor?.email // Pass doctor email if available
    );

    // Update appointment status to confirmed, mark as paid, and store Google Meet link
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CONFIRMED',
        isPaid: true,
        confirmedAt: new Date(),
        googleMeetLink: meetResult.meetLink,
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    // Update calendar event with patient email if Google Calendar API is working
    if (meetResult.eventId) {
      try {
        await this.googleCalendarService.updateEventWithPatientEmail(
          meetResult.eventId,
          appointment.patient.primaryEmail || ''
        );
      } catch (error) {
        console.log('Could not update calendar event with patient email:', error.message);
      }
    }

    // Update slot availability (if slotId exists)
    if (updatedAppointment.slotId) {
      await this.prisma.slot.update({
        where: { id: updatedAppointment.slotId },
        data: {
          isAvailable: false,
        },
      });
    }

    // Send email notifications to both patient and doctor (if assigned)
    try {
      const patientName = `${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}`;
      const appointmentDate = updatedAppointment.appointmentDate.toISOString().split('T')[0];
      const amount = updatedAppointment.amount.toString();
      const doctorName = updatedAppointment.doctor ? `Dr. ${updatedAppointment.doctor.firstName} ${updatedAppointment.doctor.lastName}` : 'To be assigned';

      // Send confirmation email to patient
      await this.mailerService.sendAppointmentConfirmationEmail(
        updatedAppointment.patient.primaryEmail || '',
        patientName,
        doctorName,
        updatedAppointment.service.name,
        appointmentDate,
        updatedAppointment.appointmentTime,
        amount,
        updatedAppointment.googleMeetLink || undefined
      );

      // Send email to doctor if assigned
      if (updatedAppointment.doctor && updatedAppointment.doctor.email) {
        await this.mailerService.sendAppointmentConfirmationEmail(
          updatedAppointment.doctor.email,
          doctorName,
          patientName, // For doctor email, patient is the "other party"
          updatedAppointment.service.name,
          appointmentDate,
          updatedAppointment.appointmentTime,
          amount,
          updatedAppointment.googleMeetLink || undefined
        );
      }
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't throw error to avoid breaking the payment confirmation process
    }

    return {
      success: true,
      message: 'Payment confirmed and appointment booked successfully',
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentIntentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentIntent: paymentIntentId },
      include: {
        appointment: {
          include: {
            patient: { select: { firstName: true, lastName: true, primaryEmail: true } },
            doctor: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentIntentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentIntent: paymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException('Payment cannot be refunded');
    }

    // Process refund through Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason ? 'requested_by_customer' : 'duplicate',
      metadata: {
        reason: reason || 'No reason provided',
      },
    });

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
      },
    });

    // Update appointment status
    await this.prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'Payment refunded',
        cancelledAt: new Date(),
      },
    });

    return {
      success: true,
      refundId: refund.id,
      message: 'Payment refunded successfully',
    };
  }
}
