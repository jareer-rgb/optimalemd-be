/*
  Warnings:

  - You are about to drop the column `assessmentData` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the `assessment_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessment_values` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."assessment_values" DROP CONSTRAINT "assessment_values_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."assessment_values" DROP CONSTRAINT "assessment_values_assessmentOptionId_fkey";

-- AlterTable
ALTER TABLE "public"."appointments" DROP COLUMN "assessmentData";

-- DropTable
DROP TABLE "public"."assessment_options";

-- DropTable
DROP TABLE "public"."assessment_values";

-- CreateTable
CREATE TABLE "public"."assessments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointment_assessments" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_name_key" ON "public"."assessments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_assessments_appointmentId_assessmentId_key" ON "public"."appointment_assessments"("appointmentId", "assessmentId");

-- AddForeignKey
ALTER TABLE "public"."appointment_assessments" ADD CONSTRAINT "appointment_assessments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_assessments" ADD CONSTRAINT "appointment_assessments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
