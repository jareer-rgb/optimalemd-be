import { ApiProperty } from '@nestjs/swagger';

export class MedicalFormResponseDto {
  @ApiProperty({ description: 'Medical form ID' })
  id: string;

  @ApiProperty({ description: 'Patient ID' })
  patientId: string;

  @ApiProperty({ description: 'Chief complaint or reason for visit' })
  chiefComplaint: string;

  @ApiProperty({ description: 'History of present illness' })
  historyOfPresentIllness: string;

  @ApiProperty({ description: 'Past medical history' })
  pastMedicalHistory: string;

  @ApiProperty({ description: 'Past surgical history' })
  pastSurgicalHistory: string;

  @ApiProperty({ description: 'Allergies information' })
  allergies: string;

  @ApiProperty({ description: 'Tobacco use' })
  tobaccoUse: string;

  @ApiProperty({ description: 'Alcohol use' })
  alcoholUse: string;

  @ApiProperty({ description: 'Recreational drugs use' })
  recreationalDrugs: string;

  @ApiProperty({ description: 'Other social history', required: false })
  otherSocialHistory?: string;

  @ApiProperty({ description: 'Family history' })
  familyHistory: string;

  @ApiProperty({ description: 'Work history' })
  workHistory: string;

  @ApiProperty({ description: 'Current medications' })
  medications: string;

  @ApiProperty({ description: 'General symptoms', required: false })
  generalSymptoms?: string;

  @ApiProperty({ description: 'Cardiovascular symptoms', required: false })
  cardiovascularSymptoms?: string;

  @ApiProperty({ description: 'Respiratory symptoms', required: false })
  respiratorySymptoms?: string;

  @ApiProperty({ description: 'Gastrointestinal symptoms', required: false })
  gastrointestinalSymptoms?: string;

  @ApiProperty({ description: 'Genitourinary symptoms', required: false })
  genitourinarySymptoms?: string;

  @ApiProperty({ description: 'Neurological symptoms', required: false })
  neurologicalSymptoms?: string;

  @ApiProperty({ description: 'Musculoskeletal symptoms', required: false })
  musculoskeletalSymptoms?: string;

  @ApiProperty({ description: 'Skin symptoms', required: false })
  skinSymptoms?: string;

  @ApiProperty({ description: 'Psychiatric symptoms', required: false })
  psychiatricSymptoms?: string;

  @ApiProperty({ description: 'Endocrine symptoms', required: false })
  endocrineSymptoms?: string;

  @ApiProperty({ description: 'Other symptoms', required: false })
  otherSymptoms?: string;

  @ApiProperty({ description: 'Blood pressure', required: false })
  bloodPressure?: string;

  @ApiProperty({ description: 'Heart rate', required: false })
  heartRate?: string;

  @ApiProperty({ description: 'Respiratory rate', required: false })
  respiratoryRate?: string;

  @ApiProperty({ description: 'Temperature', required: false })
  temperature?: string;

  @ApiProperty({ description: 'Oxygen saturation', required: false })
  oxygenSaturation?: string;

  @ApiProperty({ description: 'Weight', required: false })
  weight?: string;

  @ApiProperty({ description: 'Height', required: false })
  height?: string;

  @ApiProperty({ description: 'BMI', required: false })
  bmi?: string;

  @ApiProperty({ description: 'General examination findings', required: false })
  generalExam?: string;

  @ApiProperty({ description: 'HEENT examination findings', required: false })
  heentExam?: string;

  @ApiProperty({ description: 'Chest/Lungs examination findings', required: false })
  chestLungsExam?: string;

  @ApiProperty({ description: 'Heart examination findings', required: false })
  heartExam?: string;

  @ApiProperty({ description: 'Abdomen examination findings', required: false })
  abdomenExam?: string;

  @ApiProperty({ description: 'Neurological examination findings', required: false })
  neurologicalExam?: string;

  @ApiProperty({ description: 'Musculoskeletal examination findings', required: false })
  musculoskeletalExam?: string;

  @ApiProperty({ description: 'Investigations and labs', required: false })
  investigationsLabs?: string;

  @ApiProperty({ description: 'Assessment and diagnosis', required: false })
  assessmentDiagnosis?: string;

  @ApiProperty({ description: 'Plan and treatment', required: false })
  planTreatment?: string;

  @ApiProperty({ description: 'Referrals', required: false })
  referrals?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  additionalNotes?: string;

  @ApiProperty({ description: 'Clinician name', required: false })
  clinician?: string;

  @ApiProperty({ description: 'Pharmacy information', required: false })
  pharmacy?: string;

  @ApiProperty({ description: 'Insurance information', required: false })
  insurance?: string;

  @ApiProperty({ description: 'Primary care provider', required: false })
  primaryCareProvider?: string;

  @ApiProperty({ description: 'Referring physicians', required: false })
  referringPhysicians?: string;

  @ApiProperty({ description: 'Form creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Form last update date' })
  updatedAt: Date;
}
