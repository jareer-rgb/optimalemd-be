import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicationDto {
  @ApiProperty({ 
    description: 'Medication name', 
    example: 'Aspirin 100mg' 
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ 
    description: 'Regular price of the medication', 
    example: '25.99' 
  })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({ 
    description: 'Discounted price of the medication (optional)', 
    example: '19.99',
    required: false 
  })
  @IsOptional()
  @IsString()
  discountedPrice?: string;

  @ApiProperty({ 
    description: 'Active status', 
    example: true, 
    required: false,
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMedicationDto {
  @ApiProperty({ 
    description: 'Medication name', 
    example: 'Updated Medication Name', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ 
    description: 'Regular price of the medication', 
    example: '29.99', 
    required: false 
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ 
    description: 'Discounted price of the medication', 
    example: '24.99', 
    required: false 
  })
  @IsOptional()
  @IsString()
  discountedPrice?: string;

  @ApiProperty({ 
    description: 'Active status', 
    example: true, 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Response DTOs
export class MedicationResponseDto {
  @ApiProperty({ description: 'Medication ID' })
  id: string;

  @ApiProperty({ description: 'Medication name' })
  name: string;

  @ApiProperty({ description: 'Regular price' })
  price: string | any; // Allow both string and Decimal

  @ApiProperty({ description: 'Discounted price', required: false })
  discountedPrice: string | any | null; // Allow both string and Decimal

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

