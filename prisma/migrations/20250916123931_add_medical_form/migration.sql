-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "hasCompletedMedicalForm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicalFormCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."medical_forms" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "historyOfPresentIllness" TEXT NOT NULL,
    "pastMedicalHistory" TEXT NOT NULL,
    "pastSurgicalHistory" TEXT NOT NULL,
    "allergies" TEXT NOT NULL,
    "tobaccoUse" TEXT NOT NULL,
    "alcoholUse" TEXT NOT NULL,
    "recreationalDrugs" TEXT NOT NULL,
    "otherSocialHistory" TEXT,
    "familyHistory" TEXT NOT NULL,
    "workHistory" TEXT NOT NULL,
    "medications" TEXT NOT NULL,
    "generalSymptoms" TEXT,
    "cardiovascularSymptoms" TEXT,
    "respiratorySymptoms" TEXT,
    "gastrointestinalSymptoms" TEXT,
    "genitourinarySymptoms" TEXT,
    "neurologicalSymptoms" TEXT,
    "musculoskeletalSymptoms" TEXT,
    "skinSymptoms" TEXT,
    "psychiatricSymptoms" TEXT,
    "endocrineSymptoms" TEXT,
    "otherSymptoms" TEXT,
    "bloodPressure" TEXT,
    "heartRate" TEXT,
    "respiratoryRate" TEXT,
    "temperature" TEXT,
    "oxygenSaturation" TEXT,
    "weight" TEXT,
    "height" TEXT,
    "bmi" TEXT,
    "generalExam" TEXT,
    "heentExam" TEXT,
    "chestLungsExam" TEXT,
    "heartExam" TEXT,
    "abdomenExam" TEXT,
    "neurologicalExam" TEXT,
    "musculoskeletalExam" TEXT,
    "investigationsLabs" TEXT,
    "assessmentDiagnosis" TEXT,
    "planTreatment" TEXT,
    "referrals" TEXT,
    "additionalNotes" TEXT,
    "clinician" TEXT,
    "pharmacy" TEXT,
    "insurance" TEXT,
    "primaryCareProvider" TEXT,
    "referringPhysicians" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_forms_patientId_key" ON "public"."medical_forms"("patientId");

-- AddForeignKey
ALTER TABLE "public"."medical_forms" ADD CONSTRAINT "medical_forms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
