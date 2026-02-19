import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean, IsDateString } from 'class-validator';

export class CreateMedicalFormDto {
  // Screen 2 - About You (only additional fields not in registration)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  height?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  waist?: string;

  // Screen 3 - Your Goals (check all that apply)
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalMoreEnergy?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalBetterSexualPerformance?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalLoseWeight?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalHairRestoration?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalImproveMood?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalLongevity?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  goalOther?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  goalOtherDescription?: string;

  // Screen 4 - Medical Background
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pastSurgeriesHospitalizations?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currentMedications?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  allergies?: string;

  // Screen 5 - Lifestyle & Habits
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sleepHoursPerNight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sleepQuality?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  exerciseFrequency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dietType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alcoholUse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alcoholUseExplanation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tobaccoUse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tobaccoUseExplanation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cannabisOtherSubstances?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cannabisOtherSubstancesExplanation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cannabisOtherSubstancesList?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stressLevel?: string;

  // Screen 6 - Symptom Check
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomFatigue?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomLowLibido?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomMuscleLoss?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomWeightGain?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomGynecomastia?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomBrainFog?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomMoodSwings?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomPoorSleep?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  symptomHairThinning?: boolean;

  // Screen 7 - Safety Check
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  historyProstateBreastCancer?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  historyProstateBreastCancerExplanation?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  historyBloodClotsMIStroke?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  historyBloodClotsMIStrokeExplanation?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  currentlyUsingHormonesPeptides?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currentlyUsingHormonesPeptidesExplanation?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  planningChildrenNext12Months?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  planningChildrenNext12MonthsExplanation?: string;

  // Screen 8 - Labs & Uploads
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  labUploads?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  labSchedulingNeeded?: boolean;

  // Screen 9 - Consent & Finalize
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  consentTelemedicineCare?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  consentElectiveOptimizationTreatment?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  consentRequiredLabMonitoring?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  digitalSignature?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  consentDate?: string;

  // Legacy fields for backward compatibility (kept for now, can be removed after migration)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  historyOfPresentIllness?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pastMedicalHistory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pastSurgicalHistory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  familyHistory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workHistory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  medications?: string;

  // Review of Systems (ROS)
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  generalSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardiovascularSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  respiratorySymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gastrointestinalSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  genitourinarySymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  neurologicalSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  musculoskeletalSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  skinSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  psychiatricSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endocrineSymptoms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  otherSymptoms?: string;

  // Physical Exam
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heartRate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  respiratoryRate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  temperature?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  oxygenSaturation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bmi?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  generalExam?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heentExam?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chestLungsExam?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heartExam?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  abdomenExam?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  neurologicalExam?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  musculoskeletalExam?: string;

  // Assessment and Plan
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  investigationsLabs?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assessmentDiagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  planTreatment?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referrals?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  // Additional Information
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clinician?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pharmacy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  insurance?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryCareProvider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referringPhysicians?: string;
}