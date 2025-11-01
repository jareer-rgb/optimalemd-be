import { Controller, Post, Body, Get, Param, UseGuards, Request, BadRequestException, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto, RefundPaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import Stripe from 'stripe';

@ApiTags('Stripe Payments')
@Controller('stripe')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('create-payment-intent')
  @ApiOperation({ summary: 'Create a payment intent for an appointment' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Request() req,
  ) {
    try {
      const result = await this.stripeService.createPaymentIntent(createPaymentIntentDto);
      
      // Ensure we return a consistent response format
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      
      // Return error in consistent format
      throw error; // Let NestJS handle the error response
    }
  }

  @Post('confirm-payment')
  @ApiOperation({ summary: 'Confirm payment and book appointment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @Request() req,
  ) {
    return this.stripeService.confirmPayment(confirmPaymentDto);
  }

  @Get('payment-status/:paymentIntentId')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(@Param('paymentIntentId') paymentIntentId: string) {
    return this.stripeService.getPaymentStatus(paymentIntentId);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get Stripe configuration' })
  @ApiResponse({ status: 200, description: 'Stripe configuration retrieved successfully' })
  async getStripeConfig() {
    return {
      publishableKey: this.configService.get('STRIPE_PUBLISHABLE_KEY'),
    };
  }

  @Post('refund-payment')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Body() refundPaymentDto: RefundPaymentDto,
    @Request() req,
  ) {
    return this.stripeService.refundPayment(
      refundPaymentDto.paymentIntentId,
      refundPaymentDto.reason,
    );
  }

  @Post('subscription/create')
  @ApiOperation({ summary: 'Create a subscription for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createSubscription(@Request() req) {
    try {
      const userId = req.user.id;
      const result = await this.stripeService.createSubscription(userId);
      
      // Ensure clientSecret is present
      if (!result.clientSecret) {
        console.error('Subscription created but missing clientSecret:', result);
        throw new BadRequestException('Failed to generate payment client secret');
      }
      
      // Return consistent response format
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  @Post('subscription/confirm-payment')
  @ApiOperation({ summary: 'Confirm subscription payment and activate subscription' })
  @ApiResponse({ status: 200, description: 'Subscription payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async confirmSubscriptionPayment(
    @Body() body: { paymentIntentId: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    const result = await this.stripeService.confirmSubscriptionPayment(body.paymentIntentId, userId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('subscription/cancel')
  @ApiOperation({ summary: 'Cancel subscription for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async cancelSubscription(@Request() req) {
    const userId = req.user.id;
    return this.stripeService.cancelSubscription(userId);
  }

  @Get('subscription/status')
  @ApiOperation({ summary: 'Get subscription status for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved successfully' })
  async getSubscriptionStatus(@Request() req) {
    const userId = req.user.id;
    return this.stripeService.getSubscriptionStatus(userId);
  }

  @Post('subscription/renew')
  @ApiOperation({ summary: 'Renew or reactivate subscription for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Subscription renewed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  async renewSubscription(@Request() req) {
    const userId = req.user.id;
    const result = await this.stripeService.renewSubscription(userId);
    return {
      success: true,
      data: result,
    };
  }
}

// Separate controller for webhook (no auth guard)
@ApiTags('Stripe Webhooks')
@Controller('stripe/webhook')
export class StripeWebhookController {
  private stripe: Stripe;

  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover' as any, // Latest stable Stripe API version (must match webhook version)
    });
  }

  @Post()
  @ApiExcludeEndpoint() // Hide from Swagger docs
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured. Webhook signature verification disabled.');
      console.warn('⚠️  This is insecure for production. Set STRIPE_WEBHOOK_SECRET in your .env file.');
    }

    let event: Stripe.Event;

    try {
      // Get raw body for signature verification
      const rawBody = request.rawBody;
      
      if (!rawBody) {
        throw new BadRequestException('Missing raw body for webhook verification');
      }

      if (webhookSecret && signature) {
        // Verify webhook signature for security
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        );
        console.log(`✅ Webhook signature verified for event: ${event.type}`);
      } else {
        // For development: accept webhook without verification
        // WARNING: This should never be used in production!
        event = JSON.parse(rawBody.toString());
        console.warn(`⚠️  Processing webhook WITHOUT signature verification: ${event.type}`);
      }

      // Process the webhook event
      const result = await this.stripeService.handleSubscriptionWebhook(event);
      
      return result;
    } catch (err: any) {
      console.error(`❌ Webhook Error: ${err.message}`);
      
      if (err.type === 'StripeSignatureVerificationError') {
        throw new BadRequestException('Invalid webhook signature');
      }
      
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
