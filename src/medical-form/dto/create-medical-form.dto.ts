import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateMedicalFormDto {
  // Patient Information
  @ApiProperty({ description: 'Chief complaint or reason for visit' })
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  // History Sections
  @ApiProperty({ description: 'History of present illness' })
  @IsString()
  @IsNotEmpty()
  historyOfPresentIllness: string;

  @ApiProperty({ description: 'Past medical history' })
  @IsString()
  @IsNotEmpty()
  pastMedicalHistory: string;

  @ApiProperty({ description: 'Past surgical history' })
  @IsString()
  @IsNotEmpty()
  pastSurgicalHistory: string;

  // Allergies
  @ApiProperty({ description: 'Allergies information' })
  @IsString()
  @IsNotEmpty()
  allergies: string;

  // Social History
  @ApiProperty({ description: 'Tobacco use', enum: ['Yes', 'No'] })
  @IsString()
  @IsIn(['Yes', 'No'])
  tobaccoUse: string;

  @ApiProperty({ description: 'Alcohol use', enum: ['Yes', 'No'] })
  @IsString()
  @IsIn(['Yes', 'No'])
  alcoholUse: string;

  @ApiProperty({ description: 'Recreational drugs use', enum: ['Yes', 'No'] })
  @IsString()
  @IsIn(['Yes', 'No'])
  recreationalDrugs: string;

  @ApiProperty({ description: 'Other social history', required: false })
  @IsString()
  @IsOptional()
  otherSocialHistory?: string;

  // Family History
  @ApiProperty({ description: 'Family history' })
  @IsString()
  @IsNotEmpty()
  familyHistory: string;

  // Work History
  @ApiProperty({ description: 'Work history' })
  @IsString()
  @IsNotEmpty()
  workHistory: string;

  // Medications
  @ApiProperty({ description: 'Current medications' })
  @IsString()
  @IsNotEmpty()
  medications: string;

  // Review of Systems (ROS) - Optional
  @ApiProperty({ description: 'General symptoms', required: false })
  @IsString()
  @IsOptional()
  generalSymptoms?: string;

  @ApiProperty({ description: 'Cardiovascular symptoms', required: false })
  @IsString()
  @IsOptional()
  cardiovascularSymptoms?: string;

  @ApiProperty({ description: 'Respiratory symptoms', required: false })
  @IsString()
  @IsOptional()
  respiratorySymptoms?: string;

  @ApiProperty({ description: 'Gastrointestinal symptoms', required: false })
  @IsString()
  @IsOptional()
  gastrointestinalSymptoms?: string;

  @ApiProperty({ description: 'Genitourinary symptoms', required: false })
  @IsString()
  @IsOptional()
  genitourinarySymptoms?: string;

  @ApiProperty({ description: 'Neurological symptoms', required: false })
  @IsString()
  @IsOptional()
  neurologicalSymptoms?: string;

  @ApiProperty({ description: 'Musculoskeletal symptoms', required: false })
  @IsString()
  @IsOptional()
  musculoskeletalSymptoms?: string;

  @ApiProperty({ description: 'Skin symptoms', required: false })
  @IsString()
  @IsOptional()
  skinSymptoms?: string;

  @ApiProperty({ description: 'Psychiatric symptoms', required: false })
  @IsString()
  @IsOptional()
  psychiatricSymptoms?: string;

  @ApiProperty({ description: 'Endocrine symptoms', required: false })
  @IsString()
  @IsOptional()
  endocrineSymptoms?: string;

  @ApiProperty({ description: 'Other symptoms', required: false })
  @IsString()
  @IsOptional()
  otherSymptoms?: string;

  // Physical Exam - Optional
  @ApiProperty({ description: 'Blood pressure', required: false })
  @IsString()
  @IsOptional()
  bloodPressure?: string;

  @ApiProperty({ description: 'Heart rate', required: false })
  @IsString()
  @IsOptional()
  heartRate?: string;

  @ApiProperty({ description: 'Respiratory rate', required: false })
  @IsString()
  @IsOptional()
  respiratoryRate?: string;

  @ApiProperty({ description: 'Temperature', required: false })
  @IsString()
  @IsOptional()
  temperature?: string;

  @ApiProperty({ description: 'Oxygen saturation', required: false })
  @IsString()
  @IsOptional()
  oxygenSaturation?: string;

  @ApiProperty({ description: 'Weight', required: false })
  @IsString()
  @IsOptional()
  weight?: string;

  @ApiProperty({ description: 'Height', required: false })
  @IsString()
  @IsOptional()
  height?: string;

  @ApiProperty({ description: 'BMI', required: false })
  @IsString()
  @IsOptional()
  bmi?: string;

  // System-based Examination - Optional
  @ApiProperty({ description: 'General examination findings', required: false })
  @IsString()
  @IsOptional()
  generalExam?: string;

  @ApiProperty({ description: 'HEENT examination findings', required: false })
  @IsString()
  @IsOptional()
  heentExam?: string;

  @ApiProperty({ description: 'Chest/Lungs examination findings', required: false })
  @IsString()
  @IsOptional()
  chestLungsExam?: string;

  @ApiProperty({ description: 'Heart examination findings', required: false })
  @IsString()
  @IsOptional()
  heartExam?: string;

  @ApiProperty({ description: 'Abdomen examination findings', required: false })
  @IsString()
  @IsOptional()
  abdomenExam?: string;

  @ApiProperty({ description: 'Neurological examination findings', required: false })
  @IsString()
  @IsOptional()
  neurologicalExam?: string;

  @ApiProperty({ description: 'Musculoskeletal examination findings', required: false })
  @IsString()
  @IsOptional()
  musculoskeletalExam?: string;

  // Clinical Process - Optional
  @ApiProperty({ description: 'Investigations and labs', required: false })
  @IsString()
  @IsOptional()
  investigationsLabs?: string;

  @ApiProperty({ description: 'Assessment and diagnosis', required: false })
  @IsString()
  @IsOptional()
  assessmentDiagnosis?: string;

  @ApiProperty({ description: 'Plan and treatment', required: false })
  @IsString()
  @IsOptional()
  planTreatment?: string;

  @ApiProperty({ description: 'Referrals', required: false })
  @IsString()
  @IsOptional()
  referrals?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsString()
  @IsOptional()
  additionalNotes?: string;

  // Care Coordination - Optional
  @ApiProperty({ description: 'Clinician name', required: false })
  @IsString()
  @IsOptional()
  clinician?: string;

  @ApiProperty({ description: 'Pharmacy information', required: false })
  @IsString()
  @IsOptional()
  pharmacy?: string;

  @ApiProperty({ description: 'Insurance information', required: false })
  @IsString()
  @IsOptional()
  insurance?: string;

  @ApiProperty({ description: 'Primary care provider', required: false })
  @IsString()
  @IsOptional()
  primaryCareProvider?: string;

  @ApiProperty({ description: 'Referring physicians', required: false })
  @IsString()
  @IsOptional()
  referringPhysicians?: string;
}
