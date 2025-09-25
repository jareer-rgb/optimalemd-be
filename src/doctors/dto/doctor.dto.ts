import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsJSON, Min, Max, MaxLength, IsBoolean, IsEmail, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorDto {
  @ApiProperty({ description: 'Email address', example: 'doctor@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password', example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Title', example: 'Dr' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Middle name', example: 'Michael', required: false })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Last name', example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Date of birth', example: '1980-01-01' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ description: 'Gender', example: 'Male' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ description: 'Complete address', example: '123 Main St, Apt 4B' })
  @IsString()
  @IsNotEmpty()
  completeAddress: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State', example: 'NY' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Zipcode', example: '10001' })
  @IsString()
  @IsNotEmpty()
  zipcode: string;

  @ApiProperty({ description: 'Alternative email', example: 'john.smith@example.com', required: false })
  @IsOptional()
  @IsEmail()
  alternativeEmail?: string;

  @ApiProperty({ description: 'Primary phone', example: '+1-555-123-4567' })
  @IsString()
  @IsNotEmpty()
  primaryPhone: string;

  @ApiProperty({ description: 'Alternative phone', example: '+1-555-987-6543', required: false })
  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @ApiProperty({ description: 'Medical license number', example: 'MD12345678' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ description: 'Medical specialization', example: 'Cardiology' })
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @ApiProperty({ description: 'Professional qualifications', example: ['MBBS', 'MD Cardiology', 'FACC'] })
  @IsArray()
  @IsString({ each: true })
  qualifications: string[];

  @ApiProperty({ description: 'Years of experience', example: 15, minimum: 0, maximum: 50 })
  @IsNumber()
  @Min(0)
  @Max(50)
  experience: number;

  @ApiProperty({ description: 'Professional biography', example: 'Dr. Smith is a board-certified cardiologist with over 15 years of experience...', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ description: 'Consultation fee', example: '150.00' })
  @IsString()
  @IsNotEmpty()
  consultationFee: string;

  // workingHours removed - now using WorkingHours model
}

export class UpdateDoctorDto {
  @ApiProperty({ description: 'Title', example: 'Dr', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'First name', example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'Middle name', example: 'Michael', required: false })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Last name', example: 'Smith', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'Date of birth', example: '1980-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'Gender', example: 'Male', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ description: 'Complete address', example: '123 Main St, Apt 4B', required: false })
  @IsOptional()
  @IsString()
  completeAddress?: string;

  @ApiProperty({ description: 'City', example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'State', example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Zipcode', example: '10001', required: false })
  @IsOptional()
  @IsString()
  zipcode?: string;

  @ApiProperty({ description: 'Alternative email', example: 'john.smith@example.com', required: false })
  @IsOptional()
  @IsEmail()
  alternativeEmail?: string;

  @ApiProperty({ description: 'Primary phone', example: '+1-555-123-4567', required: false })
  @IsOptional()
  @IsString()
  primaryPhone?: string;

  @ApiProperty({ description: 'Alternative phone', example: '+1-555-987-6543', required: false })
  @IsOptional()
  @IsString()
  alternativePhone?: string;

  @ApiProperty({ description: 'Medical specialization', example: 'Cardiology', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ description: 'Professional qualifications', example: ['MBBS', 'MD Cardiology', 'FACC'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiProperty({ description: 'Years of experience', example: 15, minimum: 0, maximum: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  experience?: number;

  @ApiProperty({ description: 'Professional biography', example: 'Updated bio...', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ description: 'Consultation fee', example: '150.00', required: false })
  @IsOptional()
  @IsString()
  consultationFee?: string;

  // workingHours removed - now using WorkingHours model

  @ApiProperty({ description: 'Availability status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ description: 'Active status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryDoctorsDto {
  @ApiProperty({ description: 'Specialization filter', example: 'Cardiology', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ description: 'City filter', example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'State filter', example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Availability filter', example: true, required: false })
  @IsOptional()
  @IsString()
  isAvailable?: string;

  @ApiProperty({ description: 'Active status filter', example: true, required: false })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({ description: 'Verified status filter', example: true, required: false })
  @IsOptional()
  @IsString()
  isVerified?: string;

  @ApiProperty({ description: 'Service ID filter', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsString()
  serviceId?: string;

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

// Response DTOs
export class DoctorResponseDto {
  @ApiProperty({ description: 'Doctor ID' })
  id: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Middle name', required: false })
  middleName: string | null;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Date of birth' })
  dateOfBirth: Date;

  @ApiProperty({ description: 'Gender' })
  gender: string;

  @ApiProperty({ description: 'Complete address' })
  completeAddress: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiProperty({ description: 'Zipcode' })
  zipcode: string;

  @ApiProperty({ description: 'Alternative email', required: false })
  alternativeEmail: string | null;

  @ApiProperty({ description: 'Primary phone' })
  primaryPhone: string;

  @ApiProperty({ description: 'Alternative phone', required: false })
  alternativePhone: string | null;

  @ApiProperty({ description: 'Medical license number' })
  licenseNumber: string;

  @ApiProperty({ description: 'Medical specialization' })
  specialization: string;

  @ApiProperty({ description: 'Professional qualifications' })
  qualifications: string[];

  @ApiProperty({ description: 'Years of experience' })
  experience: number;

  @ApiProperty({ description: 'Professional biography', required: false })
  bio: string | null;

  @ApiProperty({ description: 'Availability status' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Consultation fee' })
  consultationFee: string | any; // Allow both string and Decimal

  @ApiProperty({ description: 'Working hours', required: false })
  workingHours?: any;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Verification status' })
  isVerified: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class DoctorWithUserResponseDto extends DoctorResponseDto {
  // This DTO now includes all the user information directly since it's part of the Doctor model
  // No need for a separate user object
}

export class DoctorWithServicesResponseDto extends DoctorResponseDto {
  @ApiProperty({
    description: 'Doctor services with pricing',
    additionalProperties: true
  })
  services: {
    id: string;
    serviceId: string;
    customPrice: string | any; // Allow both string and Decimal
    isAvailable: boolean;
    service: {
      id: string;
      name: string;
      category: string;
      duration: number;
      basePrice: string | any; // Allow both string and Decimal
    };
  }[];
}

// Doctor Availability DTO
export class DoctorAvailabilityDto {
  @ApiProperty({
    description: 'Date to check availability (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Service ID for availability check',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  serviceId?: string;
}

// Doctor Schedule DTO
export class DoctorScheduleDto {
  @ApiProperty({
    description: 'Start date (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsString()
  @IsNotEmpty()
  endDate: string;
}
