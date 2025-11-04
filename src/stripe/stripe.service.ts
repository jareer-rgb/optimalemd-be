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
      console.error('STRIPE_SECRET_KEY is not configured in environment variables');
      throw new Error('STRIPE_SECRET_KEY is not configured. Please set it in your .env file.');
    }
    
    // Validate Stripe key format
    if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_')) {
      console.error('Invalid Stripe secret key format. Key should start with sk_test_ or sk_live_');
      throw new Error('Invalid Stripe secret key format');
    }
    
    try {
    this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-10-29.clover' as any, // Latest stable Stripe API version
    });
      console.log('Stripe initialized successfully with key:', stripeKey.substring(0, 12) + '...');
    } catch (error: any) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error(`Failed to initialize Stripe: ${error.message}`);
    }
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

    // Validate amount
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Create payment intent
    let paymentIntent;
    try {
      paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      description,
    });
    } catch (stripeError: any) {
      console.error('Stripe API Error:', stripeError);
      throw new BadRequestException(
        stripeError.message || 'Failed to create payment intent with Stripe'
      );
    }

    if (!paymentIntent || !paymentIntent.client_secret) {
      console.error('Payment intent created but missing client_secret:', paymentIntent);
      throw new BadRequestException('Failed to generate payment client secret');
    }

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
    const { paymentIntentId, appointmentId, isFreeAppointment } = confirmPaymentDto;

    // Handle free appointments
    if (isFreeAppointment) {
      console.log('Processing free appointment - skipping payment verification');
      
      // For free appointments, we don't need to verify payment intent
      // Just proceed with appointment confirmation
    } else {
      // Handle paid appointments
      if (!paymentIntentId) {
        throw new BadRequestException('Payment intent ID is required for paid appointments');
      }

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
    }

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

    // Update appointment status to confirmed, mark as paid, and store Google Meet link and event ID
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CONFIRMED',
        isPaid: true,
        confirmedAt: new Date(),
        googleMeetLink: meetResult.meetLink,
        googleEventId: meetResult.eventId || null,
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

  /**
   * Create a subscription for a patient
   */
  async createSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        primaryEmail: true, 
        email: true,
        stripeCustomerId: true,
        isSubscribed: true 
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSubscribed) {
      throw new BadRequestException('User already has an active subscription');
    }

    const email = user.primaryEmail || user.email;
    if (!email) {
      throw new BadRequestException('User email is required for subscription');
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get or create subscription price
    const priceId = this.configService.get('STRIPE_SUBSCRIPTION_PRICE_ID');
    if (!priceId) {
      throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID is not configured');
    }

    // Create subscription with payment intent
    let subscription: Stripe.Subscription;
    try {
      subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user.id,
        },
      });
    } catch (stripeError: any) {
      console.error('Stripe subscription creation error:', stripeError);
      throw new BadRequestException(
        stripeError.message || 'Failed to create subscription with Stripe'
      );
    }

    // Extract payment intent from the expanded invoice
    const invoiceRaw = subscription.latest_invoice;
    let paymentIntent: Stripe.PaymentIntent | null = null;
    let clientSecret: string | null = null;
    
    const invoiceId = typeof invoiceRaw === 'string' ? invoiceRaw : (invoiceRaw as Stripe.Invoice)?.id;
    console.log(`📋 Processing subscription ${subscription.id} - Invoice: ${invoiceId}`);

    // Handle case where invoice is an object (expanded)
    if (invoiceRaw && typeof invoiceRaw === 'object' && 'id' in invoiceRaw) {
      const invoice = invoiceRaw as Stripe.Invoice;
      
      // Check if payment_intent is directly on invoice
      if ('payment_intent' in invoice && invoice.payment_intent) {
        if (typeof invoice.payment_intent === 'object') {
          paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          clientSecret = paymentIntent.client_secret || null;
          console.log(`✅ Found payment intent in expanded invoice: ${paymentIntent.id}`);
        } else if (typeof invoice.payment_intent === 'string') {
          // Payment intent is an ID string, need to retrieve it
          try {
            paymentIntent = await this.stripe.paymentIntents.retrieve(invoice.payment_intent);
            clientSecret = paymentIntent.client_secret || null;
            console.log(`✅ Retrieved payment intent: ${paymentIntent.id}`);
          } catch (error: any) {
            console.error(`❌ Failed to retrieve payment intent: ${error.message}`);
          }
        }
      }
    }

    // If still no client secret, retrieve invoice separately
    if (!clientSecret && invoiceId) {
      try {
        console.log(`🔍 Retrieving invoice ${invoiceId} to find payment intent...`);
        const fullInvoice = await this.stripe.invoices.retrieve(invoiceId, {
          expand: ['payment_intent'],
        }) as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string };
        
        if (fullInvoice.payment_intent) {
          if (typeof fullInvoice.payment_intent === 'object') {
            paymentIntent = fullInvoice.payment_intent as Stripe.PaymentIntent;
            clientSecret = paymentIntent.client_secret || null;
            console.log(`✅ Found payment intent in invoice: ${paymentIntent.id}`);
          } else if (typeof fullInvoice.payment_intent === 'string') {
            // Payment intent is an ID, retrieve it
            paymentIntent = await this.stripe.paymentIntents.retrieve(fullInvoice.payment_intent);
            clientSecret = paymentIntent.client_secret || null;
            console.log(`✅ Retrieved payment intent from invoice: ${paymentIntent.id}`);
          }
        } else {
          console.log(`⚠️  Invoice ${invoiceId} has no payment intent attached`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to retrieve invoice: ${error.message}`);
      }
    }

    // If still no client secret, create payment intent manually for the invoice
    if (!clientSecret && invoiceId) {
      try {
        console.log(`💰 Creating payment intent manually for invoice ${invoiceId}...`);
        
        // Retrieve invoice to get amount and customer
        const invoiceForPayment = await this.stripe.invoices.retrieve(invoiceId);
        const amountDue = invoiceForPayment.amount_due / 100; // Convert from cents to dollars
        
        if (!invoiceForPayment.amount_due || invoiceForPayment.amount_due === 0) {
          throw new BadRequestException('Invoice has no amount due');
        }
        
        // Create payment intent for the invoice
        const customerId = typeof invoiceForPayment.customer === 'string' 
          ? invoiceForPayment.customer 
          : invoiceForPayment.customer?.id;
          
        if (!customerId) {
          throw new BadRequestException('Invoice has no customer');
        }
        
        paymentIntent = await this.stripe.paymentIntents.create({
          amount: invoiceForPayment.amount_due,
          currency: invoiceForPayment.currency || 'usd',
          customer: customerId,
          metadata: {
            invoiceId: invoiceId,
            subscriptionId: subscription.id,
            userId: user.id,
          },
          description: `Payment for subscription ${subscription.id}`,
          setup_future_usage: 'off_session', // Save payment method for future subscription payments
        });
        
        clientSecret = paymentIntent.client_secret || null;
        console.log(`✅ Created payment intent ${paymentIntent.id} for $${amountDue.toFixed(2)}`);
        
      } catch (error: any) {
        console.error(`❌ Failed to create payment intent: ${error.message}`);
        throw new BadRequestException(
          `Failed to create payment intent: ${error.message}`
        );
      }
    }

    if (!clientSecret) {
      console.error(`❌ Failed to generate payment client secret for subscription ${subscription.id}`);
      throw new BadRequestException('Failed to generate payment client secret for subscription');
    }

    // Update user subscription status
    const subscriptionData: any = {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      isSubscribed: subscription.status === 'active',
      subscriptionCanceledAt: null, // Clear canceled date when creating new subscription
    };

    // Only set dates if they exist (subscription might be incomplete initially)
    const sub = subscription as any;
    if (sub.current_period_start) {
      subscriptionData.subscriptionStartDate = new Date(sub.current_period_start * 1000);
    }
    if (sub.current_period_end) {
      subscriptionData.subscriptionEndDate = new Date(sub.current_period_end * 1000);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: subscriptionData,
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      paymentIntentId: paymentIntent?.id,
      status: subscription.status,
    };
  }

  /**
   * Confirm subscription payment and activate subscription
   */
  async confirmSubscriptionPayment(paymentIntentId: string, userId: string) {
    // Verify payment intent
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }

    // Get subscription ID from metadata
    const subscriptionId = paymentIntent.metadata?.subscriptionId;
    if (!subscriptionId) {
      throw new BadRequestException('Subscription ID not found in payment intent metadata');
    }

    // Retrieve subscription
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    
    // Pay the invoice if it exists and is open
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (invoiceId) {
      try {
        const invoice = await this.stripe.invoices.retrieve(invoiceId);
        if (invoice.status === 'open' && invoice.amount_due > 0) {
          // Pay the invoice using the payment intent
          // If payment intent has a payment method, use it; otherwise Stripe will use the payment intent
          const payParams: any = {};
          if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'string') {
            payParams.payment_method = paymentIntent.payment_method;
          } else if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
            payParams.payment_method = (paymentIntent.payment_method as any).id;
          }
          
          await this.stripe.invoices.pay(invoiceId, payParams);
          console.log('Invoice paid successfully:', invoiceId);
        } else {
          console.log('Invoice already paid or has no amount due:', {
            status: invoice.status,
            amount_due: invoice.amount_due,
          });
        }
      } catch (error: any) {
        console.error('Failed to pay invoice:', error.message);
        // Don't fail if invoice payment fails - Stripe might have already handled it
        // or the payment intent might have already paid it
      }
    }

    // Retrieve subscription again to get updated status after invoice payment
    let updatedSubscription: Stripe.Subscription;
    let invoicePeriodStart: number | null = null;
    let invoicePeriodEnd: number | null = null;
    
    try {
      updatedSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      console.log(`📊 Subscription ${subscriptionId} status: ${updatedSubscription.status}`);
      
      // Try to get period dates from invoice if subscription doesn't have them
      if (invoiceId) {
        try {
          const invoice = await this.stripe.invoices.retrieve(invoiceId);
          const inv = invoice as any;
          if (inv.period_start) {
            invoicePeriodStart = inv.period_start;
            console.log(`📅 Found period_start in invoice: ${invoicePeriodStart}`);
          }
          if (inv.period_end) {
            invoicePeriodEnd = inv.period_end;
            console.log(`📅 Found period_end in invoice: ${invoicePeriodEnd}`);
          }
        } catch (invError: any) {
          console.log(`⚠️  Could not retrieve invoice for period dates: ${invError.message}`);
        }
      }
      
      // Log subscription period info for debugging
      const sub = updatedSubscription as any;
      console.log(`📅 Subscription period - start: ${sub.current_period_start}, end: ${sub.current_period_end}`);
    } catch (error: any) {
      console.error(`❌ Failed to retrieve updated subscription: ${error.message}`);
      // Use the original subscription if retrieval fails
      updatedSubscription = subscription;
    }

    // Update user subscription status based on updated subscription
    const subscriptionData: any = {
      subscriptionStatus: updatedSubscription.status,
      isSubscribed: updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing',
      subscriptionCanceledAt: null, // Clear canceled date when confirming payment
    };

    // Access period dates - try subscription first, then invoice
    const sub = updatedSubscription as any;
    const periodStart = sub.current_period_start ?? invoicePeriodStart;
    const periodEnd = sub.current_period_end ?? invoicePeriodEnd;
    
    console.log(`🔍 Raw period values - start: ${periodStart} (type: ${typeof periodStart}), end: ${periodEnd} (type: ${typeof periodEnd})`);
    
    if (periodStart !== undefined && periodStart !== null && typeof periodStart === 'number') {
      subscriptionData.subscriptionStartDate = new Date(periodStart * 1000);
      console.log(`✅ Setting start date: ${subscriptionData.subscriptionStartDate.toISOString()}`);
    } else {
      console.log(`⚠️  No valid period_start found (value: ${periodStart}, type: ${typeof periodStart})`);
    }
    
    if (periodEnd !== undefined && periodEnd !== null && typeof periodEnd === 'number') {
      subscriptionData.subscriptionEndDate = new Date(periodEnd * 1000);
      console.log(`✅ Setting end date: ${subscriptionData.subscriptionEndDate.toISOString()}`);
    } else {
      console.log(`⚠️  No valid period_end found (value: ${periodEnd}, type: ${typeof periodEnd})`);
    }

    const startDate = subscriptionData.subscriptionStartDate 
      ? new Date(subscriptionData.subscriptionStartDate).toLocaleDateString() 
      : 'N/A';
    const endDate = subscriptionData.subscriptionEndDate 
      ? new Date(subscriptionData.subscriptionEndDate).toLocaleDateString() 
      : 'N/A';
    
    console.log(`💾 Updating user ${userId} subscription: ${subscriptionData.subscriptionStatus} (Subscribed: ${subscriptionData.isSubscribed})`);
    console.log(`   Period: ${startDate} to ${endDate}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: subscriptionData,
    });

    console.log(`✅ User subscription updated successfully in database`);

    // Send subscription confirmation email
    try {
      // Fetch updated user with subscription dates from database to ensure we have correct dates
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          primaryEmail: true,
          subscriptionStartDate: true,
          subscriptionEndDate: true,
        },
      });

      if (user && user.primaryEmail && user.subscriptionStartDate && user.subscriptionEndDate) {
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
        const monthlyAmount = 175; // $175 per month

        await this.mailerService.sendSubscriptionConfirmationEmail(
          user.primaryEmail,
          userName,
          user.subscriptionStartDate,
          user.subscriptionEndDate,
          monthlyAmount
        );
        console.log(`✅ Subscription confirmation email sent to ${user.primaryEmail}`);
      } else if (user && user.primaryEmail) {
        console.warn('⚠️  Subscription dates not available in database, skipping confirmation email');
      }
    } catch (emailError: any) {
      console.error('Failed to send subscription confirmation email:', emailError);
      // Don't throw - subscription is already confirmed, email failure shouldn't block the response
    }

    return {
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      message: 'Subscription activated successfully',
    };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeSubscriptionId: true,
        isSubscribed: true,
        firstName: true,
        lastName: true,
        primaryEmail: true,
        subscriptionEndDate: true,
      },
    });

    if (!user || !user.stripeSubscriptionId) {
      throw new NotFoundException('No active subscription found');
    }

    // Cancel subscription at period end
    const subscription = await this.stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Get subscription end date
    const subscriptionEndDate = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : user.subscriptionEndDate || new Date();

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionCanceledAt: new Date(),
        subscriptionStatus: 'canceling',
        subscriptionEndDate: subscriptionEndDate,
      },
    });

    // Send subscription cancellation email
    try {
      // Fetch updated user with subscription end date from database to ensure we have correct date
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          primaryEmail: true,
          subscriptionEndDate: true,
        },
      });

      if (updatedUser && updatedUser.primaryEmail && updatedUser.subscriptionEndDate) {
        const userName = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || 'Valued Customer';
        const monthlyAmount = 175; // $175 per month

        await this.mailerService.sendSubscriptionCancellationEmail(
          updatedUser.primaryEmail,
          userName,
          updatedUser.subscriptionEndDate,
          monthlyAmount
        );
        console.log(`✅ Subscription cancellation email sent to ${updatedUser.primaryEmail}`);
      } else if (updatedUser && updatedUser.primaryEmail) {
        console.warn('⚠️  Subscription end date not available in database, skipping cancellation email');
      }
    } catch (emailError: any) {
      console.error('Failed to send subscription cancellation email:', emailError);
      // Don't throw - cancellation is already processed, email failure shouldn't block the response
    }

    return {
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      endsAt: subscriptionEndDate,
    };
  }

  /**
   * Renew or reactivate a subscription
   * Handles:
   * 1. Reactivating a canceled subscription (removes cancel_at_period_end)
   * 2. Early renewal (creates invoice immediately)
   * 3. Creating new subscription if expired
   */
  async renewSubscription(userId: string) {
    console.log(`🔄 [RENEW] ========================================`);
    console.log(`🔄 [RENEW] Starting renewSubscription for user ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        isSubscribed: true,
      },
    });

    if (!user) {
      console.error(`❌ [RENEW] User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    console.log(`🔄 [RENEW] User data retrieved:`, {
      hasSubscriptionId: !!user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      isSubscribed: user.isSubscribed,
      hasCustomerId: !!user.stripeCustomerId,
    });

    // Case 1: User has an active subscription that's canceling - reactivate it
    if (user.stripeSubscriptionId && (user.subscriptionStatus === 'canceling' || user.subscriptionStatus === 'active')) {
      console.log(`🔄 [RENEW] User has active subscription, checking subscription details...`);
      try {
        const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        console.log(`🔄 [RENEW] Subscription retrieved:`, {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        // If subscription is canceling, reactivate it
        if (subscription.cancel_at_period_end) {
          console.log(`🔄 [RENEW] Subscription is canceling - reactivating...`);
          const updatedSubscription = await this.stripe.subscriptions.update(
            user.stripeSubscriptionId,
            {
              cancel_at_period_end: false,
            }
          );

          const sub = updatedSubscription as any;
          
          // Extract dates with robust fallback logic (same as getSubscriptionStatus)
          let periodStart: number | null = sub.current_period_start || null;
          let periodEnd: number | null = sub.current_period_end || null;

          // If subscription doesn't have dates, try to get from latest invoice
          if ((!periodStart || !periodEnd) && sub.latest_invoice) {
            try {
              const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
              if (invoiceId) {
                const invoice = await this.stripe.invoices.retrieve(invoiceId);
                const inv = invoice as any;
                if (inv.period_start) periodStart = inv.period_start;
                if (inv.period_end) periodEnd = inv.period_end;
                console.log(`📅 [REACTIVATION] Using invoice dates - start: ${periodStart}, end: ${periodEnd}`);
              }
            } catch (invError: any) {
              console.log(`⚠️ [REACTIVATION] Could not retrieve invoice for period dates: ${invError.message}`);
            }
          }

          // Convert to Date objects
          let subscriptionStartDate: Date | null = periodStart ? new Date(periodStart * 1000) : null;
          let subscriptionEndDate: Date | null = periodEnd ? new Date(periodEnd * 1000) : null;

          // If start and end dates are the same, calculate end as start + 1 month
          if (subscriptionStartDate && subscriptionEndDate && 
              subscriptionStartDate.getTime() === subscriptionEndDate.getTime()) {
            console.log(`⚠️ [REACTIVATION] Start and end dates are identical. Calculating end date as start + 1 month.`);
            subscriptionEndDate = new Date(subscriptionStartDate);
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            console.log(`📅 [REACTIVATION] Calculated end date: ${subscriptionEndDate.toISOString()}`);
          }

          console.log(`📅 [REACTIVATION] Final dates to save:`, {
            start: subscriptionStartDate?.toISOString(),
            end: subscriptionEndDate?.toISOString(),
          });

          await this.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'active',
              isSubscribed: true,
              subscriptionCanceledAt: null,
              subscriptionStartDate: subscriptionStartDate,
              subscriptionEndDate: subscriptionEndDate,
            },
          });

          // Send subscription reactivation email
          console.log(`📧 [REACTIVATION] Starting email send process for user ${userId}`);
          try {
            // Fetch user email and name
            const userForEmail = await this.prisma.user.findUnique({
              where: { id: userId },
              select: {
                firstName: true,
                lastName: true,
                primaryEmail: true,
              },
            });

            console.log(`📧 [REACTIVATION] User data fetched:`, {
              found: !!userForEmail,
              hasEmail: !!userForEmail?.primaryEmail,
              email: userForEmail?.primaryEmail,
              // Use the dates we just calculated and saved
              startDate: subscriptionStartDate?.toISOString(),
              endDate: subscriptionEndDate?.toISOString(),
            });

            if (userForEmail && userForEmail.primaryEmail && subscriptionStartDate && subscriptionEndDate) {
              const userName = `${userForEmail.firstName || ''} ${userForEmail.lastName || ''}`.trim() || 'Valued Customer';
              const monthlyAmount = 175; // $175 per month

              console.log(`📧 [REACTIVATION] Calling sendSubscriptionConfirmationEmail with:`, {
                email: userForEmail.primaryEmail,
                name: userName,
                startDate: subscriptionStartDate.toISOString(),
                endDate: subscriptionEndDate.toISOString(),
                amount: monthlyAmount,
              });

              await this.mailerService.sendSubscriptionConfirmationEmail(
                userForEmail.primaryEmail,
                userName,
                subscriptionStartDate,
                subscriptionEndDate,
                monthlyAmount
              );
              console.log(`✅ [REACTIVATION] Subscription reactivation email sent successfully to ${userForEmail.primaryEmail}`);
            } else {
              console.warn(`⚠️ [REACTIVATION] Email not sent - missing required data:`, {
                hasUser: !!userForEmail,
                hasEmail: !!userForEmail?.primaryEmail,
                hasStartDate: !!subscriptionStartDate,
                hasEndDate: !!subscriptionEndDate,
              });
            }
          } catch (emailError: any) {
            console.error(`❌ [REACTIVATION] Failed to send subscription reactivation email:`, {
              error: emailError.message,
              stack: emailError.stack,
              name: emailError.name,
            });
            // Don't throw - reactivation is already processed, email failure shouldn't block the response
          }

          return {
            success: true,
            message: 'Subscription reactivated successfully',
            subscriptionId: updatedSubscription.id,
            status: updatedSubscription.status,
            startDate: periodStart,
            endDate: periodEnd,
          };
        }

        // If subscription is active and user wants early renewal
        // Create invoice for immediate payment
        if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
          console.log(`🔄 [RENEW] Subscription is active - processing early renewal...`);
          // Create an invoice for the next billing period
          const invoice = await this.stripe.invoices.create({
            customer: subscription.customer as string,
            subscription: subscription.id,
            auto_advance: true, // Automatically finalize the invoice
          });

          // If invoice needs payment, create payment intent
          if (invoice.amount_due > 0) {
            // Get default payment method
            const customer = await this.stripe.customers.retrieve(subscription.customer as string);
            const defaultPaymentMethod = (customer as any).invoice_settings?.default_payment_method;

            if (defaultPaymentMethod && typeof defaultPaymentMethod === 'string' && invoice.id) {
              // Pay invoice with default payment method
              await this.stripe.invoices.pay(invoice.id, {
                payment_method: defaultPaymentMethod,
              });
            } else {
              // Return invoice ID for payment
              return {
                success: true,
                requiresPayment: true,
                invoiceId: invoice.id || '',
                amount: invoice.amount_due / 100,
                message: 'Payment required for early renewal',
              };
            }
          }

          // Retrieve updated subscription to get new period dates
          const updatedSubscription = await this.stripe.subscriptions.retrieve(subscription.id);
          const sub = updatedSubscription as any;
          
          // Extract dates with robust fallback logic (same as getSubscriptionStatus)
          let periodStart: number | null = sub.current_period_start || null;
          let periodEnd: number | null = sub.current_period_end || null;

          // If subscription doesn't have dates, try to get from latest invoice
          if ((!periodStart || !periodEnd) && sub.latest_invoice) {
            try {
              const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
              if (invoiceId) {
                const invoice = await this.stripe.invoices.retrieve(invoiceId);
                const inv = invoice as any;
                if (inv.period_start) periodStart = inv.period_start;
                if (inv.period_end) periodEnd = inv.period_end;
                console.log(`📅 [EARLY RENEWAL] Using invoice dates - start: ${periodStart}, end: ${periodEnd}`);
              }
            } catch (invError: any) {
              console.log(`⚠️ [EARLY RENEWAL] Could not retrieve invoice for period dates: ${invError.message}`);
            }
          }

          // Convert to Date objects
          let subscriptionStartDate: Date | null = periodStart ? new Date(periodStart * 1000) : null;
          let subscriptionEndDate: Date | null = periodEnd ? new Date(periodEnd * 1000) : null;

          // If start and end dates are the same, calculate end as start + 1 month
          if (subscriptionStartDate && subscriptionEndDate && 
              subscriptionStartDate.getTime() === subscriptionEndDate.getTime()) {
            console.log(`⚠️ [EARLY RENEWAL] Start and end dates are identical. Calculating end date as start + 1 month.`);
            subscriptionEndDate = new Date(subscriptionStartDate);
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            console.log(`📅 [EARLY RENEWAL] Calculated end date: ${subscriptionEndDate.toISOString()}`);
          }

          console.log(`📅 [EARLY RENEWAL] Final dates to save:`, {
            start: subscriptionStartDate?.toISOString(),
            end: subscriptionEndDate?.toISOString(),
          });

          await this.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'active',
              isSubscribed: true,
              subscriptionCanceledAt: null, // Clear canceled date on renewal
              subscriptionStartDate: subscriptionStartDate,
              subscriptionEndDate: subscriptionEndDate,
            },
          });

          // Send subscription renewal email
          console.log(`📧 [EARLY RENEWAL] Starting email send process for user ${userId}`);
          try {
            // Fetch user email and name
            const userForEmail = await this.prisma.user.findUnique({
              where: { id: userId },
              select: {
                firstName: true,
                lastName: true,
                primaryEmail: true,
              },
            });

            console.log(`📧 [EARLY RENEWAL] User data fetched:`, {
              found: !!userForEmail,
              hasEmail: !!userForEmail?.primaryEmail,
              email: userForEmail?.primaryEmail,
              // Use the dates we just calculated and saved
              startDate: subscriptionStartDate?.toISOString(),
              endDate: subscriptionEndDate?.toISOString(),
            });

            if (userForEmail && userForEmail.primaryEmail && subscriptionStartDate && subscriptionEndDate) {
              const userName = `${userForEmail.firstName || ''} ${userForEmail.lastName || ''}`.trim() || 'Valued Customer';
              const monthlyAmount = 175; // $175 per month

              console.log(`📧 [EARLY RENEWAL] Calling sendSubscriptionConfirmationEmail with:`, {
                email: userForEmail.primaryEmail,
                name: userName,
                startDate: subscriptionStartDate.toISOString(),
                endDate: subscriptionEndDate.toISOString(),
                amount: monthlyAmount,
              });

              await this.mailerService.sendSubscriptionConfirmationEmail(
                userForEmail.primaryEmail,
                userName,
                subscriptionStartDate,
                subscriptionEndDate,
                monthlyAmount
              );
              console.log(`✅ [EARLY RENEWAL] Subscription renewal email sent successfully to ${userForEmail.primaryEmail}`);
            } else {
              console.warn(`⚠️ [EARLY RENEWAL] Email not sent - missing required data:`, {
                hasUser: !!userForEmail,
                hasEmail: !!userForEmail?.primaryEmail,
                hasStartDate: !!subscriptionStartDate,
                hasEndDate: !!subscriptionEndDate,
              });
            }
          } catch (emailError: any) {
            console.error(`❌ [EARLY RENEWAL] Failed to send subscription renewal email:`, {
              error: emailError.message,
              stack: emailError.stack,
              name: emailError.name,
            });
            // Don't throw - renewal is already processed, email failure shouldn't block the response
          }

          return {
            success: true,
            message: 'Subscription renewed early successfully',
            subscriptionId: updatedSubscription.id,
            status: updatedSubscription.status,
            startDate: periodStart,
            endDate: periodEnd,
          };
        }
      } catch (error: any) {
        console.error('Error renewing existing subscription:', error);
        // If subscription doesn't exist in Stripe, continue to create new one
        if (error.code !== 'resource_missing') {
          throw new BadRequestException(`Failed to renew subscription: ${error.message}`);
        }
      }
    }

    // Case 2: No subscription or expired - create new subscription
    console.log(`🔄 [RENEW] Checking if new subscription needs to be created...`);
    if (!user.stripeCustomerId) {
      console.error(`❌ [RENEW] No Stripe customer found for user ${userId}`);
      throw new BadRequestException('No Stripe customer found. Please create a subscription first.');
    }

    console.log(`🔄 [RENEW] Creating new subscription for user ${userId}...`);
    // Create new subscription
    const subscription = await this.createSubscription(userId);
    console.log(`✅ [RENEW] New subscription created successfully`);
    
    return {
      success: true,
      message: 'New subscription created successfully',
      subscriptionId: subscription.subscriptionId,
      status: subscription.status,
      clientSecret: subscription.clientSecret,
      paymentIntentId: subscription.paymentIntentId,
    };
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSubscribed: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        subscriptionCanceledAt: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let stripeSubscription: any = null;
    let invoicePeriodStart: number | null = null;
    let invoicePeriodEnd: number | null = null;
    
    if (user.stripeSubscriptionId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Always get dates from Stripe subscription first
        const sub = stripeSubscription as any;
        console.log(`🔍 Subscription ${user.stripeSubscriptionId} - current_period_start: ${sub.current_period_start}, current_period_end: ${sub.current_period_end}`);
        console.log(`🔍 Subscription status: ${sub.status}, id: ${sub.id}`);
        
        // Try to get period dates from latest invoice ONLY if subscription doesn't have them
        if ((!sub.current_period_start || !sub.current_period_end) && sub.latest_invoice) {
          try {
            const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
            if (invoiceId) {
              const invoice = await this.stripe.invoices.retrieve(invoiceId);
              const inv = invoice as any;
              console.log(`🔍 Invoice ${invoiceId} - period_start: ${inv.period_start}, period_end: ${inv.period_end}`);
              
              // Only use invoice dates if subscription doesn't have them
              if (!sub.current_period_start && inv.period_start) {
                invoicePeriodStart = inv.period_start;
                console.log(`📅 Using period_start from invoice: ${invoicePeriodStart}`);
              }
              if (!sub.current_period_end && inv.period_end) {
                invoicePeriodEnd = inv.period_end;
                console.log(`📅 Using period_end from invoice: ${invoicePeriodEnd}`);
              }
            }
          } catch (invError: any) {
            console.log(`⚠️  Could not retrieve latest invoice for period dates: ${invError.message}`);
          }
        }
        
        // Access period dates - prefer subscription, fallback to invoice
        // IMPORTANT: Only use invoicePeriodStart if subscription period_start is missing
        // Only use invoicePeriodEnd if subscription period_end is missing
        const periodStart = sub.current_period_start ?? invoicePeriodStart;
        const periodEnd = sub.current_period_end ?? invoicePeriodEnd;
        
        console.log(`🔍 Final period values - start: ${periodStart} (type: ${typeof periodStart}), end: ${periodEnd} (type: ${typeof periodEnd})`);
        
        // Warn if dates are the same
        if (periodStart && periodEnd && periodStart === periodEnd) {
          console.warn(`⚠️  WARNING: Start and end dates are the same! This shouldn't happen for a subscription.`);
        }
        
        let stripeStartDate = (periodStart !== undefined && periodStart !== null && typeof periodStart === 'number')
          ? new Date(periodStart * 1000) 
          : null;
        let stripeEndDate = (periodEnd !== undefined && periodEnd !== null && typeof periodEnd === 'number')
          ? new Date(periodEnd * 1000) 
          : null;
        
        console.log(`📅 Parsed dates - start: ${stripeStartDate?.toISOString() || 'null'}, end: ${stripeEndDate?.toISOString() || 'null'}`);
        
        // If dates are the same, calculate end date from start date + 1 month
        if (stripeStartDate && stripeEndDate && stripeStartDate.getTime() === stripeEndDate.getTime()) {
          console.warn(`⚠️  Start and end dates are identical. Calculating end date as start + 1 month.`);
          const calculatedEndDate = new Date(stripeStartDate);
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
          stripeEndDate = calculatedEndDate;
          console.log(`📅 Calculated end date: ${stripeEndDate.toISOString()}`);
        }
        
        // If we have start date but no end date, calculate it
        if (stripeStartDate && !stripeEndDate) {
          console.warn(`⚠️  Missing end date. Calculating end date as start + 1 month.`);
          const calculatedEndDate = new Date(stripeStartDate);
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
          stripeEndDate = calculatedEndDate;
          console.log(`📅 Calculated end date: ${stripeEndDate.toISOString()}`);
        }
        
        // Sync subscription status if Stripe shows different status than database
        const stripeStatus = stripeSubscription.status;
        const dbStatus = user.subscriptionStatus;
        const isActiveInStripe = stripeStatus === 'active' || stripeStatus === 'trialing';
        
        // Check if we need to update database (status mismatch or missing dates)
        const needsUpdate = 
          stripeStatus !== dbStatus || 
          (isActiveInStripe && !user.isSubscribed) ||
          (!user.subscriptionStartDate && stripeStartDate) ||
          (!user.subscriptionEndDate && stripeEndDate);
        
        if (needsUpdate) {
          console.log('Syncing subscription status from Stripe:', {
            userId,
            dbStatus,
            stripeStatus,
            dbIsSubscribed: user.isSubscribed,
            shouldBeSubscribed: isActiveInStripe,
            updatingDates: !user.subscriptionStartDate || !user.subscriptionEndDate,
          });
          
          // Update database to match Stripe
          const subscriptionData: any = {
            subscriptionStatus: stripeStatus,
            isSubscribed: isActiveInStripe,
          };
          
          if (stripeStartDate) {
            subscriptionData.subscriptionStartDate = stripeStartDate;
          }
          if (stripeEndDate) {
            subscriptionData.subscriptionEndDate = stripeEndDate;
          }
          
          await this.prisma.user.update({
            where: { id: userId },
            data: subscriptionData,
          });
          
          console.log('Subscription status synced successfully');
        }
        
        // Always return dates from Stripe if available, otherwise use database values
        // Convert Date objects to ISO strings for consistent API response
        const startDateValue = stripeStartDate || user.subscriptionStartDate;
        const endDateValue = stripeEndDate || user.subscriptionEndDate;
        
        return {
          isSubscribed: isActiveInStripe,
          status: stripeStatus,
          startDate: startDateValue ? (startDateValue instanceof Date ? startDateValue.toISOString() : startDateValue) : null,
          endDate: endDateValue ? (endDateValue instanceof Date ? endDateValue.toISOString() : endDateValue) : null,
          canceledAt: user.subscriptionCanceledAt ? (user.subscriptionCanceledAt instanceof Date ? user.subscriptionCanceledAt.toISOString() : user.subscriptionCanceledAt) : null,
          stripeStatus: stripeStatus,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error('Error retrieving subscription from Stripe:', error);
      }
    }

    // Convert Date objects to ISO strings for consistent API response
    const startDateValue = user.subscriptionStartDate;
    const endDateValue = user.subscriptionEndDate;
    const canceledAtValue = user.subscriptionCanceledAt;
    
    return {
      isSubscribed: user.isSubscribed,
      status: user.subscriptionStatus,
      startDate: startDateValue ? (startDateValue instanceof Date ? startDateValue.toISOString() : startDateValue) : null,
      endDate: endDateValue ? (endDateValue instanceof Date ? endDateValue.toISOString() : endDateValue) : null,
      canceledAt: canceledAtValue ? (canceledAtValue instanceof Date ? canceledAtValue.toISOString() : canceledAtValue) : null,
      stripeStatus: stripeSubscription?.status,
      cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end,
    };
  }

  /**
   * Handle Stripe webhook for subscription events
   * This automatically updates subscription status when:
   * - Monthly renewal succeeds (invoice.payment_succeeded)
   * - Payment fails (invoice.payment_failed) 
   * - Subscription is canceled or expires
   */
  async handleSubscriptionWebhook(event: Stripe.Event) {
    console.log(`🎯 Processing webhook event: ${event.type}`);
    
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata.userId;

          if (!userId) {
            console.error('❌ No userId in subscription metadata');
            return { received: false, error: 'Missing userId' };
          }

          const sub = subscription as any;
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          
          console.log(`📊 Subscription ${event.type.split('.').pop()}: ${subscription.id}`);
          console.log(`   User: ${userId}, Status: ${subscription.status}, Active: ${isActive}`);
          
          // Extract dates with robust fallback logic (same as renewSubscription)
          let periodStart: number | null = sub.current_period_start || null;
          let periodEnd: number | null = sub.current_period_end || null;

          // If subscription doesn't have dates, try to get from latest invoice
          if ((!periodStart || !periodEnd) && sub.latest_invoice) {
            try {
              const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id;
              if (invoiceId) {
                const invoice = await this.stripe.invoices.retrieve(invoiceId);
                const inv = invoice as any;
                if (inv.period_start) periodStart = inv.period_start;
                if (inv.period_end) periodEnd = inv.period_end;
                console.log(`📅 [WEBHOOK] Using invoice dates - start: ${periodStart}, end: ${periodEnd}`);
              }
            } catch (invError: any) {
              console.log(`⚠️ [WEBHOOK] Could not retrieve invoice for period dates: ${invError.message}`);
            }
          }

          // Convert to Date objects
          let subscriptionStartDate: Date | null = periodStart ? new Date(periodStart * 1000) : null;
          let subscriptionEndDate: Date | null = periodEnd ? new Date(periodEnd * 1000) : null;

          // If start and end dates are the same, calculate end as start + 1 month
          if (subscriptionStartDate && subscriptionEndDate && 
              subscriptionStartDate.getTime() === subscriptionEndDate.getTime()) {
            console.log(`⚠️ [WEBHOOK] Start and end dates are identical. Calculating end date as start + 1 month.`);
            subscriptionEndDate = new Date(subscriptionStartDate);
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            console.log(`📅 [WEBHOOK] Calculated end date: ${subscriptionEndDate.toISOString()}`);
          }

          console.log(`📅 [WEBHOOK] Final dates:`, {
            start: subscriptionStartDate?.toISOString(),
            end: subscriptionEndDate?.toISOString(),
          });
          
          const updateData: any = {
            subscriptionStatus: subscription.status,
            isSubscribed: isActive,
            // Clear canceled date if subscription is active again
            subscriptionCanceledAt: isActive ? null : undefined,
          };
          
          // Set dates if they are valid
          if (subscriptionStartDate) {
            updateData.subscriptionStartDate = subscriptionStartDate;
          }
          
          if (subscriptionEndDate) {
            updateData.subscriptionEndDate = subscriptionEndDate;
          }

          await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
          });

          console.log(`✅ User ${userId} subscription updated in database`);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata.userId;

          if (!userId) {
            console.error('❌ No userId in subscription metadata');
            return { received: false, error: 'Missing userId' };
          }

          console.log(`🗑️  Subscription deleted: ${subscription.id} for user ${userId}`);

          await this.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'canceled',
              isSubscribed: false,
              subscriptionCanceledAt: new Date(),
            },
          });

          console.log(`✅ User ${userId} marked as unsubscribed`);
          break;
        }

        case 'invoice.payment_succeeded': {
          // This fires on successful monthly renewal payments
          const invoice = event.data.object as any;
          
          if (!invoice.subscription) {
            console.log('ℹ️  Invoice not related to subscription, skipping');
            return { received: true };
          }

          console.log(`💰 Payment succeeded for invoice ${invoice.id}`);
          console.log(`   Subscription: ${invoice.subscription}`);
          console.log(`   Amount: $${(invoice.amount_paid / 100).toFixed(2)}`);

          // Retrieve full subscription to get metadata and updated dates
          const sub: any = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = sub.metadata.userId;

          if (!userId) {
            console.error('❌ No userId in subscription metadata');
            return { received: false, error: 'Missing userId' };
          }

          console.log(`✅ Activating subscription for user ${userId}`);
          
          // Extract dates with robust fallback logic (same as renewSubscription)
          let periodStart: number | null = sub.current_period_start || null;
          let periodEnd: number | null = sub.current_period_end || null;

          // If subscription doesn't have dates, try to get from invoice
          if ((!periodStart || !periodEnd) && invoice.period_start) {
            if (invoice.period_start) periodStart = invoice.period_start;
            if (invoice.period_end) periodEnd = invoice.period_end;
            console.log(`📅 [WEBHOOK] Using invoice dates - start: ${periodStart}, end: ${periodEnd}`);
          }

          // Convert to Date objects
          let subscriptionStartDate: Date | null = periodStart ? new Date(periodStart * 1000) : null;
          let subscriptionEndDate: Date | null = periodEnd ? new Date(periodEnd * 1000) : null;

          // If start and end dates are the same, calculate end as start + 1 month
          if (subscriptionStartDate && subscriptionEndDate && 
              subscriptionStartDate.getTime() === subscriptionEndDate.getTime()) {
            console.log(`⚠️ [WEBHOOK] Start and end dates are identical. Calculating end date as start + 1 month.`);
            subscriptionEndDate = new Date(subscriptionStartDate);
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            console.log(`📅 [WEBHOOK] Calculated end date: ${subscriptionEndDate.toISOString()}`);
          }

          console.log(`📅 [WEBHOOK] Final dates:`, {
            start: subscriptionStartDate?.toISOString(),
            end: subscriptionEndDate?.toISOString(),
          });
          
          const updateData: any = {
            subscriptionStatus: 'active',
            isSubscribed: true,
            subscriptionCanceledAt: null, // Clear any previous cancellation
          };
          
          // Set dates if they are valid
          if (subscriptionStartDate) {
            updateData.subscriptionStartDate = subscriptionStartDate;
          }
          
          if (subscriptionEndDate) {
            updateData.subscriptionEndDate = subscriptionEndDate;
          }

          await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
          });

          console.log(`✅ User ${userId} subscription renewed successfully`);
          break;
        }

        case 'invoice.payment_failed': {
          // This fires when monthly renewal payment fails
          const invoice = event.data.object as any;
          
          if (!invoice.subscription) {
            console.log('ℹ️  Invoice not related to subscription, skipping');
            return { received: true };
          }

          console.log(`❌ Payment failed for invoice ${invoice.id}`);
          console.log(`   Subscription: ${invoice.subscription}`);
          console.log(`   Amount due: $${(invoice.amount_due / 100).toFixed(2)}`);
          console.log(`   Attempt: ${invoice.attempt_count}`);

          // Retrieve subscription to get userId
          const sub: any = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = sub.metadata.userId;

          if (!userId) {
            console.error('❌ No userId in subscription metadata');
            return { received: false, error: 'Missing userId' };
          }

          console.log(`⚠️  Marking user ${userId} subscription as past_due`);

          await this.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: 'past_due',
              isSubscribed: false, // User loses access when payment fails
            },
          });

          console.log(`✅ User ${userId} marked as past_due (access revoked)`);
          break;
        }

        default:
          console.log(`ℹ️  Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      console.error(`❌ Error processing webhook ${event.type}:`, error.message);
      throw error;
    }
  }
}
