import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class CreateIntakeFormDto {
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
  tobaccoUse?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cannabisOtherSubstances?: string;

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

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  historyBloodClotsMIStroke?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  currentlyUsingHormonesPeptides?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  planningChildrenNext12Months?: boolean;

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
}
