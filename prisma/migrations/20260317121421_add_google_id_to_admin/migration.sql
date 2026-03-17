/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `admins` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "admins_googleId_key" ON "public"."admins"("googleId");
