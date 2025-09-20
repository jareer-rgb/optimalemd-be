/*
  Warnings:

  - You are about to drop the column `otherSocialHistory` on the `medical_forms` table. All the data in the column will be lost.
  - You are about to drop the column `recreationalDrugs` on the `medical_forms` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[appointmentId]` on the table `medical_forms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."medical_forms_patientId_key";

-- AlterTable
ALTER TABLE "public"."medical_forms" DROP COLUMN "otherSocialHistory",
DROP COLUMN "recreationalDrugs",
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "cannabisOtherSubstances" TEXT,
ADD COLUMN     "cannabisOtherSubstancesList" TEXT,
ADD COLUMN     "chronicConditions" TEXT,
ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "consentElectiveOptimizationTreatment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentRequiredLabMonitoring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentTelemedicineCare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentMedications" TEXT,
ADD COLUMN     "currentlyUsingHormonesPeptides" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dietType" TEXT,
ADD COLUMN     "digitalSignature" TEXT,
ADD COLUMN     "exerciseFrequency" TEXT,
ADD COLUMN     "goalBetterSexualPerformance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalHairRestoration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalImproveMood" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalLongevity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalLoseWeight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalMoreEnergy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalOther" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "goalOtherDescription" TEXT,
ADD COLUMN     "historyBloodClotsMIStroke" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "historyProstateBreastCancer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labSchedulingNeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labUploads" TEXT,
ADD COLUMN     "pastSurgeriesHospitalizations" TEXT,
ADD COLUMN     "planningChildrenNext12Months" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sleepHoursPerNight" TEXT,
ADD COLUMN     "sleepQuality" TEXT,
ADD COLUMN     "stressLevel" TEXT,
ADD COLUMN     "symptomBrainFog" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomFatigue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomGynecomastia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomHairThinning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomLowLibido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomMoodSwings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomMuscleLoss" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomPoorSleep" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symptomWeightGain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waist" TEXT,
ALTER COLUMN "chiefComplaint" DROP NOT NULL,
ALTER COLUMN "historyOfPresentIllness" DROP NOT NULL,
ALTER COLUMN "pastMedicalHistory" DROP NOT NULL,
ALTER COLUMN "pastSurgicalHistory" DROP NOT NULL,
ALTER COLUMN "allergies" DROP NOT NULL,
ALTER COLUMN "tobaccoUse" DROP NOT NULL,
ALTER COLUMN "alcoholUse" DROP NOT NULL,
ALTER COLUMN "familyHistory" DROP NOT NULL,
ALTER COLUMN "workHistory" DROP NOT NULL,
ALTER COLUMN "medications" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "hasCompletedIntakeForm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intakeFormCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "medical_forms_appointmentId_key" ON "public"."medical_forms"("appointmentId");

-- AddForeignKey
ALTER TABLE "public"."medical_forms" ADD CONSTRAINT "medical_forms_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
