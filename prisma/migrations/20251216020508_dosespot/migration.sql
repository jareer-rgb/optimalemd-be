/*
  Warnings:

  - A unique constraint covering the columns `[doseSpotPatientId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "doseSpotPatientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_doseSpotPatientId_key" ON "public"."users"("doseSpotPatientId");
