import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto, RefundPaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
    return this.stripeService.createPaymentIntent(createPaymentIntentDto);
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
}
