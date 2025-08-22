/*
  Warnings:

  - A unique constraint covering the columns `[medicalRecordNo]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[primaryEmail]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `alternativeEmail` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alternativePhone` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `completeAddress` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consentForTreatment` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `disabilityAccessibilityNeeds` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergencyContactName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergencyContactPhone` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emergencyContactRelationship` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hipaaPrivacyNoticeAcknowledgment` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medicalRecordNo` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `middleName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredMethodOfCommunication` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryEmail` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryPhone` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referringSource` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `releaseOfMedicalRecordsConsent` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zipcode` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `dateOfBirth` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "advanceDirectives" TEXT,
ADD COLUMN     "alternativeEmail" TEXT NOT NULL,
ADD COLUMN     "alternativePhone" TEXT NOT NULL,
ADD COLUMN     "careProviderPhone" TEXT,
ADD COLUMN     "completeAddress" TEXT NOT NULL,
ADD COLUMN     "consentForTreatment" TEXT NOT NULL,
ADD COLUMN     "dateOfFirstVisitPlanned" TIMESTAMP(3),
ADD COLUMN     "dateOfRegistration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disabilityAccessibilityNeeds" TEXT NOT NULL,
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerificationTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" TEXT NOT NULL,
ADD COLUMN     "emergencyContactPhone" TEXT NOT NULL,
ADD COLUMN     "emergencyContactRelationship" TEXT NOT NULL,
ADD COLUMN     "ethnicityRace" TEXT,
ADD COLUMN     "gender" TEXT NOT NULL,
ADD COLUMN     "guarantorResponsibleParty" TEXT,
ADD COLUMN     "hipaaPrivacyNoticeAcknowledgment" TEXT NOT NULL,
ADD COLUMN     "insuranceGroupNumber" TEXT,
ADD COLUMN     "insurancePhoneNumber" TEXT,
ADD COLUMN     "insurancePolicyNumber" TEXT,
ADD COLUMN     "insuranceProviderName" TEXT,
ADD COLUMN     "interpreterRequired" TEXT,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languagePreference" TEXT,
ADD COLUMN     "lastFourDigitsSSN" TEXT,
ADD COLUMN     "medicalRecordNo" TEXT NOT NULL,
ADD COLUMN     "middleName" TEXT NOT NULL,
ADD COLUMN     "preferredMethodOfCommunication" TEXT NOT NULL,
ADD COLUMN     "primaryCarePhysician" TEXT,
ADD COLUMN     "primaryEmail" TEXT NOT NULL,
ADD COLUMN     "primaryPhone" TEXT NOT NULL,
ADD COLUMN     "referringSource" TEXT NOT NULL,
ADD COLUMN     "releaseOfMedicalRecordsConsent" TEXT NOT NULL,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "zipcode" TEXT NOT NULL,
ALTER COLUMN "dateOfBirth" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_medicalRecordNo_key" ON "public"."users"("medicalRecordNo");

-- CreateIndex
CREATE UNIQUE INDEX "users_primaryEmail_key" ON "public"."users"("primaryEmail");
