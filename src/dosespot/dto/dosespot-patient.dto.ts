import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class DoseSpotPatientDto {
  @ApiProperty({ description: 'Patient first name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'Patient middle name', example: 'Michael' })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({ description: 'Patient last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Patient prefix', example: 'Mr.' })
  @IsString()
  @IsOptional()
  prefix?: string;

  @ApiPropertyOptional({ description: 'Patient suffix', example: 'Jr.' })
  @IsString()
  @IsOptional()
  suffix?: string;

  @ApiProperty({ description: 'Date of birth in ISO format', example: '1990-01-15T00:00:00.000Z' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ description: 'Gender: 1=Male, 2=Female, 3=Unknown', example: 1 })
  @IsNumber()
  @IsIn([1, 2, 3])
  gender: number;

  @ApiPropertyOptional({ description: 'Email address', example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Address line 1', example: '123 Main St' })
  @IsString()
  @IsOptional()
  address1?: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Apt 4B' })
  @IsString()
  @IsOptional()
  address2?: string;

  @ApiPropertyOptional({ description: 'City', example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State (2-letter abbreviation)', example: 'NY' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'ZIP code', example: '10001' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Primary phone number', example: '5551234567' })
  @IsString()
  @IsOptional()
  primaryPhone?: string;

  @ApiPropertyOptional({ description: 'Primary phone type', example: 'Cell' })
  @IsString()
  @IsOptional()
  primaryPhoneType?: string;

  @ApiPropertyOptional({ description: 'Weight', example: 180 })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Weight metric unit', example: 'lb' })
  @IsString()
  @IsOptional()
  weightMetric?: string;

  @ApiPropertyOptional({ description: 'Height', example: 70 })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Height metric unit', example: 'inch' })
  @IsString()
  @IsOptional()
  heightMetric?: string;

  @ApiPropertyOptional({ description: 'Internal patient ID (EMR ID)', example: 'patient-123' })
  @IsString()
  @IsOptional()
  nonDoseSpotMedicalRecordNumber?: string;
}

export class SyncPatientToDoseSpotDto {
  @ApiProperty({ description: 'Patient ID from our system' })
  @IsString()
  patientId: string;

  @ApiPropertyOptional({ description: 'Force sync even if patient already exists in DoseSpot' })
  @IsBoolean()
  @IsOptional()
  forceUpdate?: boolean;
}

export class DoseSpotSearchPatientDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Date of birth in ISO format', example: '1990-01-15T00:00:00.000Z' })
  @IsDateString()
  dateOfBirth: string;
}

