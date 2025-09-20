import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsNumber, IsBoolean, IsDecimal, Min, MaxLength } from 'class-validator';
import { AppointmentStatus, UrgencyLevel } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Patient ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiProperty({ description: 'Service ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Slot ID', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsString()
  slotId?: string;

  @ApiProperty({ description: 'Primary Service ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  primaryServiceId: string;

  @ApiProperty({ description: 'Appointment date (YYYY-MM-DD)', example: '2024-12-25' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ description: 'Appointment time (HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  appointmentTime: string;

  @ApiProperty({ description: 'Selected slot time (HH:MM)', example: '09:00', required: false })
  @IsOptional()
  @IsString()
  selectedSlotTime?: string;

  @ApiProperty({ description: 'Duration in minutes', example: 30, minimum: 15, maximum: 480 })
  @IsNumber()
  @Min(15)
  duration: number;

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

  @ApiProperty({ description: 'Appointment amount', example: '150.00' })
  @IsDecimal()
  @IsNotEmpty()
  amount: string;
}

export class UpdateAppointmentDto {
  @ApiProperty({ description: 'Appointment status', enum: AppointmentStatus, required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

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

  @ApiProperty({ description: 'Appointment amount', example: '150.00', required: false })
  @IsOptional()
  @IsDecimal()
  amount?: string;

  @ApiProperty({ description: 'Payment status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiProperty({ description: 'Payment method', example: 'Credit Card', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class QueryAppointmentsDto {
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

  @ApiProperty({ description: 'Status filter', enum: AppointmentStatus, required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

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
  @IsNumber()
  page?: number;

  @ApiProperty({ description: 'Items per page', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CancelAppointmentDto {
  @ApiProperty({ description: 'Cancellation reason', example: 'Patient requested cancellation', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'New slot ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  newSlotId: string;

  @ApiProperty({ description: 'Rescheduling reason', example: 'Doctor unavailable', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// Response DTOs
export class AppointmentResponseDto {
  @ApiProperty({ description: 'Appointment ID' })
  id: string;

  @ApiProperty({ description: 'Patient ID' })
  patientId: string;

  @ApiProperty({ description: 'Doctor ID', required: false })
  doctorId: string | null;

  @ApiProperty({ description: 'Service ID' })
  serviceId: string;

  @ApiProperty({ description: 'Slot ID', required: false })
  slotId: string | null;

  @ApiProperty({ description: 'Appointment date' })
  appointmentDate: Date;

  @ApiProperty({ description: 'Appointment time' })
  appointmentTime: string;

  @ApiProperty({ description: 'Selected slot time', required: false })
  selectedSlotTime: string | null;

  @ApiProperty({ description: 'Duration in minutes' })
  duration: number;

  @ApiProperty({ description: 'Appointment status', enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ description: 'Patient notes', required: false })
  patientNotes: string | null;

  @ApiProperty({ description: 'Patient symptoms', required: false })
  symptoms: string | null;

  @ApiProperty({ description: 'Appointment amount' })
  amount: string | any; // Allow both string and Decimal

  @ApiProperty({ description: 'Payment status' })
  isPaid: boolean;

  @ApiProperty({ description: 'Payment method', required: false })
  paymentMethod: string | null;

  @ApiProperty({ description: 'Google Meet link for video consultation', required: false })
  googleMeetLink: string | null;

  @ApiProperty({ description: 'Cancellation reason', required: false })
  cancellationReason: string | null;

  @ApiProperty({ description: 'Rescheduled from appointment ID', required: false })
  rescheduledFrom: string | null;

  @ApiProperty({ description: 'Scheduled at timestamp' })
  scheduledAt: Date;

  @ApiProperty({ description: 'Confirmed at timestamp', required: false })
  confirmedAt: Date | null;

  @ApiProperty({ description: 'Cancelled at timestamp', required: false })
  cancelledAt: Date | null;

  @ApiProperty({ description: 'Completed at timestamp', required: false })
  completedAt: Date | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class AppointmentWithRelationsResponseDto extends AppointmentResponseDto {
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
    additionalProperties: true,
    required: false
  })
  doctor: {
    id: string;
    licenseNumber: string;
    specialization: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;

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

  @ApiProperty({
    description: 'Slot information',
    additionalProperties: true,
    required: false
  })
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    schedule: {
      date: Date;
    };
  } | null;
}
