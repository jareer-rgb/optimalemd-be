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
-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED_TO_APPOINTMENT');

-- CreateEnum
CREATE TYPE "public"."UrgencyLevel" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

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

-- CreateTable
CREATE TABLE "public"."doctors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualifications" TEXT[],
    "experience" INTEGER NOT NULL,
    "bio" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "workingHours" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_services" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedules" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxAppointments" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."slots" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "appointmentDate" DATE NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "patientNotes" TEXT,
    "symptoms" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "cancellationReason" TEXT,
    "rescheduledFrom" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "preferredDate" DATE NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "alternativeDates" DATE[],
    "alternativeTimes" TEXT[],
    "patientNotes" TEXT,
    "symptoms" TEXT,
    "urgency" "public"."UrgencyLevel" NOT NULL DEFAULT 'ROUTINE',
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "doctorNotes" TEXT,
    "suggestedDate" TIMESTAMP(3),
    "suggestedTime" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctors_userId_key" ON "public"."doctors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_licenseNumber_key" ON "public"."doctors"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "public"."services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_services_doctorId_serviceId_key" ON "public"."doctor_services"("doctorId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_doctorId_date_startTime_key" ON "public"."schedules"("doctorId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "slots_scheduleId_startTime_key" ON "public"."slots"("scheduleId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_slotId_key" ON "public"."appointments"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "users_medicalRecordNo_key" ON "public"."users"("medicalRecordNo");

-- CreateIndex
CREATE UNIQUE INDEX "users_primaryEmail_key" ON "public"."users"("primaryEmail");

-- AddForeignKey
ALTER TABLE "public"."doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_services" ADD CONSTRAINT "doctor_services_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."doctor_services" ADD CONSTRAINT "doctor_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedules" ADD CONSTRAINT "schedules_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."slots" ADD CONSTRAINT "slots_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
