import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsArray, MaxLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus, UrgencyLevel } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Service ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Preferred date (YYYY-MM-DD)', example: '2024-12-25' })
  @IsDateString()
  preferredDate: string;

  @ApiProperty({ description: 'Preferred time (HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  preferredTime: string;

  @ApiProperty({ description: 'Alternative preferred dates', example: ['2024-12-26', '2024-12-27'], required: false })
  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  alternativeDates?: string[];

  @ApiProperty({ description: 'Alternative preferred times', example: ['10:00', '14:00'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeTimes?: string[];

  @ApiProperty({ description: 'Patient notes', example: 'Experiencing chest pain for the last 2 days', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patientNotes?: string;

  @ApiProperty({ description: 'Patient symptoms', example: 'Chest pain, shortness of breath', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  symptoms?: string;

  @ApiProperty({ description: 'Urgency level', enum: UrgencyLevel, example: UrgencyLevel.ROUTINE, required: false })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel;
}

export class UpdateBookingDto {
  @ApiProperty({ description: 'Booking status', enum: BookingStatus, required: false })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ description: 'Doctor notes', example: 'Patient needs urgent care', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  doctorNotes?: string;

  @ApiProperty({ description: 'Suggested date (YYYY-MM-DD)', example: '2024-12-26', required: false })
  @IsOptional()
  @IsDateString()
  suggestedDate?: string;

  @ApiProperty({ description: 'Suggested time (HH:MM)', example: '10:00', required: false })
  @IsOptional()
  @IsString()
  suggestedTime?: string;

  @ApiProperty({ description: 'Patient notes', example: 'Updated notes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patientNotes?: string;

  @ApiProperty({ description: 'Patient symptoms', example: 'Updated symptoms', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  symptoms?: string;
}

export class QueryBookingsDto {
  @ApiProperty({ description: 'Patient ID filter', required: false })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ description: 'Doctor ID filter', required: false })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiProperty({ description: 'Service ID filter', required: false })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ description: 'Status filter', enum: BookingStatus, required: false })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ description: 'Urgency level filter', enum: UrgencyLevel, required: false })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel;

  @ApiProperty({ description: 'Start date filter (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Page number', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({ description: 'Items per page', example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class RespondToBookingDto {
  @ApiProperty({ description: 'Response action', enum: ['approve', 'reject', 'suggest'], example: 'approve' })
  @IsString()
  @IsNotEmpty()
  action: 'approve' | 'reject' | 'suggest';

  @ApiProperty({ description: 'Doctor notes', example: 'I can accommodate this request', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  doctorNotes?: string;

  @ApiProperty({ description: 'Suggested date (YYYY-MM-DD)', example: '2024-12-26', required: false })
  @IsOptional()
  @IsDateString()
  suggestedDate?: string;

  @ApiProperty({ description: 'Suggested time (HH:MM)', example: '10:00', required: false })
  @IsOptional()
  @IsString()
  suggestedTime?: string;
}

// Response DTOs
export class BookingResponseDto {
  @ApiProperty({ description: 'Booking ID' })
  id: string;

  @ApiProperty({ description: 'Patient ID' })
  patientId: string;

  @ApiProperty({ description: 'Doctor ID' })
  doctorId: string;

  @ApiProperty({ description: 'Service ID' })
  serviceId: string;

  @ApiProperty({ description: 'Preferred date' })
  preferredDate: Date;

  @ApiProperty({ description: 'Preferred time' })
  preferredTime: string;

  @ApiProperty({ description: 'Alternative preferred dates', required: false })
  alternativeDates: Date[] | string[] | null; // Allow both Date[] and string[]

  @ApiProperty({ description: 'Alternative preferred times', required: false })
  alternativeTimes: string[] | null;

  @ApiProperty({ description: 'Patient notes', required: false })
  patientNotes: string | null;

  @ApiProperty({ description: 'Patient symptoms', required: false })
  symptoms: string | null;

  @ApiProperty({ description: 'Urgency level', enum: UrgencyLevel })
  urgency: UrgencyLevel;

  @ApiProperty({ description: 'Booking status', enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ description: 'Doctor notes', required: false })
  doctorNotes: string | null;

  @ApiProperty({ description: 'Suggested date', required: false })
  suggestedDate: Date | null;

  @ApiProperty({ description: 'Suggested time', required: false })
  suggestedTime: string | null;

  @ApiProperty({ description: 'Requested at timestamp' })
  requestedAt: Date;

  @ApiProperty({ description: 'Responded at timestamp', required: false })
  respondedAt: Date | null;

  @ApiProperty({ description: 'Expires at timestamp', required: false })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class BookingWithRelationsResponseDto extends BookingResponseDto {
  @ApiProperty({
    description: 'Patient information',
    additionalProperties: true
  })
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    primaryEmail: string;
    primaryPhone: string;
  };

  @ApiProperty({
    description: 'Doctor information',
    additionalProperties: true
  })
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    licenseNumber: string;
  };

  @ApiProperty({
    description: 'Service information',
    additionalProperties: true
  })
  service: {
    id: string;
    name: string;
    duration: number;
    category: string;
  };
}
