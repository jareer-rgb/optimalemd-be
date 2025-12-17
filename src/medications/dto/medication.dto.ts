import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicationDto {
  @ApiProperty({ 
    description: 'Medication name', 
    example: 'Testosterone Cypionate' 
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ 
    description: 'Category name for grouping medications', 
    example: 'Hormone Therapy',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoryName?: string;

  @ApiProperty({ 
    description: 'Medication strength', 
    example: '200mg/ml',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  strength?: string;

  @ApiProperty({ 
    description: 'Dose amount', 
    example: '0.5ml',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dose?: string;

  @ApiProperty({ 
    description: 'Route of administration', 
    example: 'Intramuscular Injection',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @ApiProperty({ 
    description: 'Frequency of administration', 
    example: 'Twice weekly',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  frequency?: string;

  @ApiProperty({ 
    description: 'Detailed directions for use', 
    example: 'Inject 0.5ml intramuscularly twice per week. Rotate injection sites.',
    required: false 
  })
  @IsOptional()
  @IsString()
  directions?: string;

  @ApiProperty({ 
    description: 'Therapy category', 
    example: 'Hormone Replacement Therapy',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  therapyCategory?: string;

  @ApiProperty({ 
    description: 'Standard/regular price of the medication', 
    example: '125.00' 
  })
  @IsString()
  @IsNotEmpty()
  standardPrice: string;

  @ApiProperty({ 
    description: 'Membership/discounted price (optional)', 
    example: '99.00',
    required: false 
  })
  @IsOptional()
  @IsString()
  membershipPrice?: string;

  @ApiProperty({ 
    description: 'Additional pricing notes', 
    example: 'Price per vial. 10ml vial.',
    required: false 
  })
  @IsOptional()
  @IsString()
  pricingNotes?: string;

  @ApiProperty({ 
    description: 'Full prescription text', 
    example: 'Testosterone Cypionate 200mg/ml: Inject 0.5ml (100mg) intramuscularly twice weekly for testosterone replacement therapy.',
    required: false 
  })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiProperty({ 
    description: 'Active status', 
    example: true, 
    required: false,
    default: true 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Legacy fields for backward compatibility
  @ApiProperty({ 
    description: 'Legacy: Regular price (use standardPrice instead)', 
    example: '125.00',
    required: false,
    deprecated: true
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ 
    description: 'Legacy: Discounted price (use membershipPrice instead)', 
    example: '99.00',
    required: false,
    deprecated: true
  })
  @IsOptional()
  @IsString()
  discountedPrice?: string;
}

export class UpdateMedicationDto {
  @ApiProperty({ 
    description: 'Medication name', 
    example: 'Testosterone Cypionate', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ 
    description: 'Category name for grouping medications', 
    example: 'Hormone Therapy',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoryName?: string;

  @ApiProperty({ 
    description: 'Medication strength', 
    example: '200mg/ml',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  strength?: string;

  @ApiProperty({ 
    description: 'Dose amount', 
    example: '0.5ml',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dose?: string;

  @ApiProperty({ 
    description: 'Route of administration', 
    example: 'Intramuscular Injection',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @ApiProperty({ 
    description: 'Frequency of administration', 
    example: 'Twice weekly',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  frequency?: string;

  @ApiProperty({ 
    description: 'Detailed directions for use', 
    example: 'Inject 0.5ml intramuscularly twice per week. Rotate injection sites.',
    required: false 
  })
  @IsOptional()
  @IsString()
  directions?: string;

  @ApiProperty({ 
    description: 'Therapy category', 
    example: 'Hormone Replacement Therapy',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  therapyCategory?: string;

  @ApiProperty({ 
    description: 'Standard/regular price of the medication', 
    example: '125.00',
    required: false 
  })
  @IsOptional()
  @IsString()
  standardPrice?: string;

  @ApiProperty({ 
    description: 'Membership/discounted price', 
    example: '99.00',
    required: false 
  })
  @IsOptional()
  @IsString()
  membershipPrice?: string;

  @ApiProperty({ 
    description: 'Additional pricing notes', 
    example: 'Price per vial. 10ml vial.',
    required: false 
  })
  @IsOptional()
  @IsString()
  pricingNotes?: string;

  @ApiProperty({ 
    description: 'Full prescription text', 
    example: 'Testosterone Cypionate 200mg/ml: Inject 0.5ml (100mg) intramuscularly twice weekly for testosterone replacement therapy.',
    required: false 
  })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiProperty({ 
    description: 'Active status', 
    example: true, 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Legacy fields for backward compatibility
  @ApiProperty({ 
    description: 'Legacy: Regular price (use standardPrice instead)', 
    example: '125.00',
    required: false,
    deprecated: true
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ 
    description: 'Legacy: Discounted price (use membershipPrice instead)', 
    example: '99.00',
    required: false,
    deprecated: true
  })
  @IsOptional()
  @IsString()
  discountedPrice?: string;
}

// Response DTOs
export class MedicationResponseDto {
  @ApiProperty({ description: 'Medication ID' })
  id: string;

  @ApiProperty({ description: 'Medication name' })
  name: string;

  @ApiProperty({ description: 'Category name', required: false })
  categoryName?: string | null;

  @ApiProperty({ description: 'Medication strength', required: false })
  strength?: string | null;

  @ApiProperty({ description: 'Dose amount', required: false })
  dose?: string | null;

  @ApiProperty({ description: 'Route of administration', required: false })
  route?: string | null;

  @ApiProperty({ description: 'Frequency of administration', required: false })
  frequency?: string | null;

  @ApiProperty({ description: 'Detailed directions', required: false })
  directions?: string | null;

  @ApiProperty({ description: 'Therapy category', required: false })
  therapyCategory?: string | null;

  @ApiProperty({ description: 'Standard price' })
  standardPrice: string | any; // Allow both string and Decimal

  @ApiProperty({ description: 'Membership price', required: false })
  membershipPrice?: string | any | null; // Allow both string and Decimal

  @ApiProperty({ description: 'Pricing notes', required: false })
  pricingNotes?: string | null;

  @ApiProperty({ description: 'Full prescription text', required: false })
  prescription?: string | null;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  // Legacy fields for backward compatibility
  @ApiProperty({ description: 'Legacy: Regular price', deprecated: true })
  price: string | any;

  @ApiProperty({ description: 'Legacy: Discounted price', required: false, deprecated: true })
  discountedPrice?: string | any | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

