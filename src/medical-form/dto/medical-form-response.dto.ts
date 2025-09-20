import { ApiProperty } from '@nestjs/swagger';

export class MedicalFormResponseDto {
  @ApiProperty({ description: 'Medical form ID' })
  id: string;

  @ApiProperty({ description: 'Patient ID' })
  patientId: string;

  @ApiProperty({ description: 'Appointment ID', required: false })
  appointmentId?: string;

  // Screen 2 - About You
  @ApiProperty({ description: 'Height', required: false })
  height?: string;

  @ApiProperty({ description: 'Weight', required: false })
  weight?: string;

  @ApiProperty({ description: 'Waist measurement', required: false })
  waist?: string;

  @ApiProperty({ description: 'Emergency contact name', required: false })
  emergencyContactName?: string;

  @ApiProperty({ description: 'Emergency contact phone', required: false })
  emergencyContactPhone?: string;

  // Screen 3 - Your Goals
  @ApiProperty({ description: 'Goal: More Energy', required: false })
  goalMoreEnergy?: boolean;

  @ApiProperty({ description: 'Goal: Better Sexual Performance', required: false })
  goalBetterSexualPerformance?: boolean;

  @ApiProperty({ description: 'Goal: Lose Weight', required: false })
  goalLoseWeight?: boolean;

  @ApiProperty({ description: 'Goal: Hair Restoration', required: false })
  goalHairRestoration?: boolean;

  @ApiProperty({ description: 'Goal: Improve Mood', required: false })
  goalImproveMood?: boolean;

  @ApiProperty({ description: 'Goal: Longevity', required: false })
  goalLongevity?: boolean;

  @ApiProperty({ description: 'Goal: Other', required: false })
  goalOther?: boolean;

  @ApiProperty({ description: 'Other goals description', required: false })
  goalOtherDescription?: string;

  // Screen 4 - Medical Background
  @ApiProperty({ description: 'Chronic conditions', required: false })
  chronicConditions?: string;

  @ApiProperty({ description: 'Past surgeries and hospitalizations', required: false })
  pastSurgeriesHospitalizations?: string;

  @ApiProperty({ description: 'Current medications', required: false })
  currentMedications?: string;

  @ApiProperty({ description: 'Allergies', required: false })
  allergies?: string;

  // Screen 5 - Lifestyle & Habits
  @ApiProperty({ description: 'Sleep hours per night', required: false })
  sleepHoursPerNight?: string;

  @ApiProperty({ description: 'Sleep quality', required: false })
  sleepQuality?: string;

  @ApiProperty({ description: 'Exercise frequency', required: false })
  exerciseFrequency?: string;

  @ApiProperty({ description: 'Diet type', required: false })
  dietType?: string;

  @ApiProperty({ description: 'Alcohol use', required: false })
  alcoholUse?: string;

  @ApiProperty({ description: 'Tobacco use', required: false })
  tobaccoUse?: string;

  @ApiProperty({ description: 'Cannabis and other substances', required: false })
  cannabisOtherSubstances?: string;

  @ApiProperty({ description: 'Cannabis and other substances list', required: false })
  cannabisOtherSubstancesList?: string;

  @ApiProperty({ description: 'Stress level', required: false })
  stressLevel?: string;

  // Screen 6 - Symptom Check
  @ApiProperty({ description: 'Symptom: Fatigue', required: false })
  symptomFatigue?: boolean;

  @ApiProperty({ description: 'Symptom: Low Libido', required: false })
  symptomLowLibido?: boolean;

  @ApiProperty({ description: 'Symptom: Muscle Loss', required: false })
  symptomMuscleLoss?: boolean;

  @ApiProperty({ description: 'Symptom: Weight Gain', required: false })
  symptomWeightGain?: boolean;

  @ApiProperty({ description: 'Symptom: Gynecomastia', required: false })
  symptomGynecomastia?: boolean;

  @ApiProperty({ description: 'Symptom: Brain Fog', required: false })
  symptomBrainFog?: boolean;

  @ApiProperty({ description: 'Symptom: Mood Swings', required: false })
  symptomMoodSwings?: boolean;

  @ApiProperty({ description: 'Symptom: Poor Sleep', required: false })
  symptomPoorSleep?: boolean;

  @ApiProperty({ description: 'Symptom: Hair Thinning', required: false })
  symptomHairThinning?: boolean;

  // Screen 7 - Safety Check
  @ApiProperty({ description: 'History of prostate/breast cancer', required: false })
  historyProstateBreastCancer?: boolean;

  @ApiProperty({ description: 'History of blood clots/MI/stroke', required: false })
  historyBloodClotsMIStroke?: boolean;

  @ApiProperty({ description: 'Currently using hormones/peptides', required: false })
  currentlyUsingHormonesPeptides?: boolean;

  @ApiProperty({ description: 'Planning children next 12 months', required: false })
  planningChildrenNext12Months?: boolean;

  // Screen 8 - Labs & Uploads
  @ApiProperty({ description: 'Lab uploads', required: false })
  labUploads?: string;

  @ApiProperty({ description: 'Lab scheduling needed', required: false })
  labSchedulingNeeded?: boolean;

  // Screen 9 - Consent & Finalize
  @ApiProperty({ description: 'Consent to telemedicine care', required: false })
  consentTelemedicineCare?: boolean;

  @ApiProperty({ description: 'Consent to elective optimization treatment', required: false })
  consentElectiveOptimizationTreatment?: boolean;

  @ApiProperty({ description: 'Consent to required lab monitoring', required: false })
  consentRequiredLabMonitoring?: boolean;

  @ApiProperty({ description: 'Digital signature', required: false })
  digitalSignature?: string;

  @ApiProperty({ description: 'Consent date', required: false })
  consentDate?: Date;

  // Legacy fields (kept for backward compatibility)
  @ApiProperty({ description: 'Chief complaint or reason for visit', required: false })
  chiefComplaint?: string;

  @ApiProperty({ description: 'History of present illness', required: false })
  historyOfPresentIllness?: string;

  @ApiProperty({ description: 'Past medical history', required: false })
  pastMedicalHistory?: string;

  @ApiProperty({ description: 'Past surgical history', required: false })
  pastSurgicalHistory?: string;

  @ApiProperty({ description: 'Recreational drugs use', required: false })
  recreationalDrugs?: string;

  @ApiProperty({ description: 'Other social history', required: false })
  otherSocialHistory?: string;

  @ApiProperty({ description: 'Family history', required: false })
  familyHistory?: string;

  @ApiProperty({ description: 'Work history', required: false })
  workHistory?: string;

  @ApiProperty({ description: 'Current medications (legacy)', required: false })
  medications?: string;

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
