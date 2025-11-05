import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Appointment ID (optional)' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiProperty({ description: 'Welcome Order ID (optional)' })
  @IsOptional()
  @IsString()
  welcomeOrderId?: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Stripe payment intent ID (optional for free appointments)' })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @ApiProperty({ description: 'Appointment ID' })
  @IsString()
  appointmentId: string;

  @ApiProperty({ description: 'Is this a free appointment?', required: false })
  @IsOptional()
  isFreeAppointment?: boolean;

  @ApiProperty({ description: 'Patient timezone (IANA format, e.g., "America/New_York", "Europe/London")', example: 'America/New_York', required: false })
  @IsOptional()
  @IsString()
  patientTimezone?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Stripe payment intent ID' })
  @IsString()
  paymentIntentId: string;

  @ApiProperty({ description: 'Refund reason', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
