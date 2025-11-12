import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssessmentDto {
  @ApiProperty({ description: 'Assessment name', example: "Men's Hormone Replacement Therapy" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Assessment content as markdown text' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateAssessmentDto {
  @ApiProperty({ description: 'Assessment name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Assessment content as markdown text', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class AssessmentResponseDto {
  @ApiProperty({ description: 'Assessment ID' })
  id: string;

  @ApiProperty({ description: 'Assessment name' })
  name: string;

  @ApiProperty({ description: 'Assessment content as markdown text' })
  content: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class CreateAppointmentAssessmentDto {
  @ApiProperty({ description: 'Appointment ID' })
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ description: 'Assessment ID' })
  @IsString()
  @IsNotEmpty()
  assessmentId: string;

  @ApiProperty({ description: 'Custom content override for this appointment', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class BulkAppointmentAssessmentDto {
  @ApiProperty({ description: 'Assessment ID' })
  @IsString()
  @IsNotEmpty()
  assessmentId: string;

  @ApiProperty({ description: 'Custom content override for this appointment', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class CreateMultipleAppointmentAssessmentsDto {
  @ApiProperty({ description: 'Appointment ID' })
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ description: 'Assessments to assign', type: [BulkAppointmentAssessmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAppointmentAssessmentDto)
  assessments: BulkAppointmentAssessmentDto[];
}

export class UpdateAppointmentAssessmentDto {
  @ApiProperty({ description: 'Custom content override for this appointment', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class AppointmentAssessmentResponseDto {
  @ApiProperty({ description: 'Appointment assessment ID' })
  id: string;

  @ApiProperty({ description: 'Appointment ID' })
  appointmentId: string;

  @ApiProperty({ description: 'Assessment ID' })
  assessmentId: string;

  @ApiProperty({ description: 'Custom content override', required: false })
  content: string | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Assessment details', type: AssessmentResponseDto })
  assessment?: AssessmentResponseDto;
}