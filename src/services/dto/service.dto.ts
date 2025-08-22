import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'Doctor ID who is creating this service', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Service name', example: 'General Consultation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Service description', example: 'Comprehensive health assessment and consultation with a healthcare provider', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Service category', example: 'Consultation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category: string;

  @ApiProperty({ description: 'Duration in minutes', example: 30, minimum: 15, maximum: 480 })
  @IsNumber()
  @Min(15)
  @Max(480)
  duration: number;

  @ApiProperty({ description: 'Base price for the service', example: '100.00' })
  @IsString()
  @IsNotEmpty()
  basePrice: string;
}

export class UpdateServiceDto {
  @ApiProperty({ description: 'Service name', example: 'Updated Service Name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Service description', example: 'Updated service description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Service category', example: 'Updated Category', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({ description: 'Duration in minutes', example: 45, minimum: 15, maximum: 480, required: false })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  duration?: number;

  @ApiProperty({ description: 'Base price for the service', example: '120.00', required: false })
  @IsOptional()
  @IsString()
  basePrice?: string;

  @ApiProperty({ description: 'Active status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryServicesDto {
  @ApiProperty({ description: 'Service name filter', example: 'Consultation', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Service category filter', example: 'Consultation', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Active status filter', example: true, required: false })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({ description: 'Doctor ID filter', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiProperty({ description: 'Page number', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ description: 'Items per page', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CreateDoctorServiceDto {
  @ApiProperty({ description: 'Doctor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'Service ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Price for this doctor-service combination', example: '150.00' })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({ description: 'Availability status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateDoctorServiceDto {
  @ApiProperty({ description: 'Price for this doctor-service combination', example: '160.00', required: false })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ description: 'Availability status', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

// Response DTOs
export class ServiceResponseDto {
  @ApiProperty({ description: 'Service ID' })
  id: string;

  @ApiProperty({ description: 'Doctor ID who created this service' })
  doctorId: string;

  @ApiProperty({ description: 'Service name' })
  name: string;

  @ApiProperty({ description: 'Service description', required: false })
  description: string | null;

  @ApiProperty({ description: 'Service category' })
  category: string;

  @ApiProperty({ description: 'Duration in minutes' })
  duration: number;

  @ApiProperty({ description: 'Base price' })
  basePrice: string | any; // Allow both string and Decimal

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class ServiceWithDoctorPricingDto extends ServiceResponseDto {
  @ApiProperty({
    description: 'Doctor who created this service',
    additionalProperties: true
  })
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };

  @ApiProperty({
    description: 'Doctor services with pricing',
    additionalProperties: true
  })
  doctorServices: {
    id: string;
    doctorId: string;
    price: string | any; // Allow both string and Decimal
    isAvailable: boolean;
    doctor: {
      id: string;
      specialization: string;
      firstName: string;
      lastName: string;
    };
  }[];
}

export class DoctorServiceResponseDto {
  @ApiProperty({ description: 'Doctor service ID' })
  id: string;

  @ApiProperty({ description: 'Doctor ID' })
  doctorId: string;

  @ApiProperty({ description: 'Service ID' })
  serviceId: string;

  @ApiProperty({ description: 'Price for this combination' })
  price: string | any; // Allow both string and Decimal

  @ApiProperty({ description: 'Availability status' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class DoctorServiceWithRelationsDto extends DoctorServiceResponseDto {
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

  @ApiProperty({
    description: 'Service information',
    additionalProperties: true
  })
  service: {
    id: string;
    name: string;
    category: string;
    duration: number;
    basePrice: string | any; // Allow both string and Decimal
  };
}
