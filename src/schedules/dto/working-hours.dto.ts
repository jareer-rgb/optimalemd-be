import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkingHoursDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)', example: 1, minimum: 0, maximum: 6 })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: 'Start time (HH:MM)', example: '08:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '16:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'Duration of each slot in minutes', example: 20, minimum: 15, maximum: 60 })
  @IsNumber()
  @Min(15)
  @Max(60)
  slotDuration: number;

  @ApiProperty({ description: 'Duration of break between slots in minutes', example: 10, minimum: 5, maximum: 30 })
  @IsNumber()
  @Min(5)
  @Max(30)
  breakDuration: number;

  @ApiProperty({ description: 'Whether this working hour is active', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateMultipleWorkingHoursDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ 
    description: 'Array of working hours for different days',
    type: [CreateWorkingHoursDto],
    example: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDuration: 20, breakDuration: 10 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDuration: 20, breakDuration: 10 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkingHoursDto)
  workingHours: Omit<CreateWorkingHoursDto, 'doctorId'>[];
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ description: 'Start time (HH:MM)', example: '09:00', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '17:00', required: false })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ description: 'Duration of each slot in minutes', example: 30, minimum: 15, maximum: 60, required: false })
  @IsNumber()
  @Min(15)
  @Max(60)
  @IsOptional()
  slotDuration?: number;

  @ApiProperty({ description: 'Duration of break between slots in minutes', example: 15, minimum: 5, maximum: 30, required: false })
  @IsNumber()
  @Min(5)
  @Max(30)
  @IsOptional()
  breakDuration?: number;

  @ApiProperty({ description: 'Whether this working hour is active', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class WorkingHoursResponseDto {
  @ApiProperty({ description: 'Working hours ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  doctorId: string;

  @ApiProperty({ description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)', example: 1 })
  dayOfWeek: number;

  @ApiProperty({ description: 'Start time (HH:MM)', example: '08:00' })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)', example: '16:00' })
  endTime: string;

  @ApiProperty({ description: 'Duration of each slot in minutes', example: 20 })
  slotDuration: number;

  @ApiProperty({ description: 'Duration of break between slots in minutes', example: 10 })
  breakDuration: number;

  @ApiProperty({ description: 'Whether this working hour is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class WorkingHoursWithDoctorDto extends WorkingHoursResponseDto {
  @ApiProperty({ description: 'Doctor information' })
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
}

export class GenerateScheduleFromWorkingHoursDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Start date for schedule generation (YYYY-MM-DD)', example: '2024-12-25' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date for schedule generation (YYYY-MM-DD)', example: '2024-12-31' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Whether to regenerate existing schedules', example: false })
  @IsBoolean()
  @IsOptional()
  regenerateExisting?: boolean;
}

export class QueryWorkingHoursDto {
  @ApiProperty({ description: 'Filter by doctor ID', required: false })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiProperty({ description: 'Filter by day of week', required: false, minimum: 0, maximum: 6 })
  @IsNumber()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @ApiProperty({ description: 'Filter by active status', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Page number', required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
