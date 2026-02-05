/*
  Warnings:

  - A unique constraint covering the columns `[patientId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "patientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_patientId_key" ON "public"."users"("patientId");
