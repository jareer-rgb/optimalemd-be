import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsBoolean, Min, Max, IsArray } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Schedule date (YYYY-MM-DD)', example: '2024-12-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '17:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'Maximum number of appointments for this time slot', example: 10, minimum: 1, maximum: 50 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxAppointments: number;
}

export class CreateMultipleSchedulesDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2024-12-25' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2024-12-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Working days (0=Sunday, 1=Monday, etc.)', example: [1, 2, 3, 4, 5] })
  @IsArray()
  @IsNumber({}, { each: true })
  workingDays: number[];

  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '17:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'Maximum number of appointments per day', example: 10, minimum: 1, maximum: 50 })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxAppointments: number;

  @ApiProperty({ description: 'Break time between appointments in minutes', example: 15, minimum: 0, maximum: 60, required: false })
  @IsOptional()
  @IsNumber()
  breakTime?: number;
}

export class UpdateScheduleDto {
  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '17:00', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Maximum number of appointments', example: 12, minimum: 1, maximum: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxAppointments?: number;

  @ApiProperty({ description: 'Availability status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class QuerySchedulesDto {
  @ApiProperty({ description: 'Doctor ID filter', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiProperty({ description: 'Start date filter (YYYY-MM-DD)', example: '2024-12-25', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date filter (YYYY-MM-DD)', example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Availability filter', example: true, required: false })
  @IsOptional()
  @IsString()
  isAvailable?: string;

  @ApiProperty({ description: 'Page number', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ description: 'Items per page', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CreateSlotDto {
  @ApiProperty({ description: 'Schedule ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '09:30' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class CreateMultipleSlotsDto {
  @ApiProperty({ description: 'Schedule ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ description: 'Slot duration in minutes', example: 30, minimum: 15, maximum: 120 })
  @IsNumber()
  @Min(15)
  @Max(120)
  slotDuration: number;

  @ApiProperty({ description: 'Break time between slots in minutes', example: 15, minimum: 0, maximum: 60, required: false })
  @IsOptional()
  @IsNumber()
  breakTime?: number;
}

export class UpdateSlotDto {
  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00', required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '09:30', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Availability status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class AvailableSlotsQueryDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)', example: '2024-12-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Service ID to filter by duration', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsString()
  serviceId?: string;
}

// Response DTOs
export class ScheduleResponseDto {
  @ApiProperty({ description: 'Schedule ID' })
  id: string;

  @ApiProperty({ description: 'Doctor ID' })
  doctorId: string;

  @ApiProperty({ description: 'Schedule date' })
  date: Date;

  @ApiProperty({ description: 'Start time' })
  startTime: string;

  @ApiProperty({ description: 'End time' })
  endTime: string;

  @ApiProperty({ description: 'Maximum appointments' })
  maxAppointments: number;

  @ApiProperty({ description: 'Availability status' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class ScheduleWithSlotsDto extends ScheduleResponseDto {
  @ApiProperty({
    description: 'Time slots',
    additionalProperties: true
  })
  slots: {
    id: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
}

export class ScheduleWithDoctorInfoDto extends ScheduleResponseDto {
  @ApiProperty({
    description: 'Doctor information',
    additionalProperties: true
  })
  doctor: {
    id: string;
    specialization: string;
    firstName: string;
    lastName: string;
  };
}

export class SlotResponseDto {
  @ApiProperty({ description: 'Slot ID' })
  id: string;

  @ApiProperty({ description: 'Schedule ID' })
  scheduleId: string;

  @ApiProperty({ description: 'Start time' })
  startTime: string;

  @ApiProperty({ description: 'End time' })
  endTime: string;

  @ApiProperty({ description: 'Availability status' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class SlotWithScheduleInfoDto extends SlotResponseDto {
  @ApiProperty({
    description: 'Schedule information',
    additionalProperties: true
  })
  schedule: {
    id: string;
    date: Date;
    doctorId: string;
  };
}
