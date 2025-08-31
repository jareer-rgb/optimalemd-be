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
   * Create a payment intent for an appointment
   */
  async createPaymentIntent(createPaymentIntentDto: CreatePaymentIntentDto) {
    const { appointmentId, amount, currency = 'usd' } = createPaymentIntentDto;

    // Verify appointment exists and is not already paid
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

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        appointmentId,
        patientId: appointment.patient.id,
        doctorId: appointment.doctor.id,
        serviceName: appointment.service.name,
      },
      description: `Payment for appointment with Dr. ${appointment.doctor.lastName} - ${appointment.service.name}`,
    });

    // Create payment record
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
    const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;
    
    // Generate Google Meet link
    const meetResult = await this.googleCalendarService.generateMeetLink(
      appointment.appointmentDate,
      appointment.appointmentTime,
      appointment.duration,
      doctorName,
      patientName,
      appointment.service.name,
      appointment.patient.primaryEmail // Pass patient email
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
          appointment.patient.primaryEmail
        );
      } catch (error) {
        console.log('Could not update calendar event with patient email:', error.message);
      }
    }

    await this.prisma.slot.update({
      where: { id: updatedAppointment.slotId },
      data: {
        isAvailable: false,
      },
    });

    // Send email notifications
    try {
      const patientName = `${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}`;
      const doctorName = `Dr. ${updatedAppointment.doctor.firstName} ${updatedAppointment.doctor.lastName}`;
      const appointmentDate = updatedAppointment.appointmentDate.toISOString().split('T')[0];
      const amount = updatedAppointment.amount.toString();

      // Send confirmation email to patient with Google Meet link
      await this.mailerService.sendAppointmentConfirmationEmail(
        updatedAppointment.patient.primaryEmail,
        patientName,
        doctorName,
        updatedAppointment.service.name,
        appointmentDate,
        updatedAppointment.appointmentTime,
        amount,
        updatedAppointment.googleMeetLink || undefined
      );

      // Send notification to doctor with Google Meet link
      await this.mailerService.sendDoctorAppointmentNotification(
        updatedAppointment.doctor.email,
        doctorName,
        patientName,
        updatedAppointment.service.name,
        appointmentDate,
        updatedAppointment.appointmentTime,
        amount,
        updatedAppointment.googleMeetLink || undefined
      );
    } catch (error) {
      console.error('Failed to send confirmation emails:', error);
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
