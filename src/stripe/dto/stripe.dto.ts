import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Appointment ID' })
  @IsString()
  appointmentId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Stripe payment intent ID' })
  @IsString()
  paymentIntentId: string;

  @ApiProperty({ description: 'Appointment ID' })
  @IsString()
  appointmentId: string;
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
