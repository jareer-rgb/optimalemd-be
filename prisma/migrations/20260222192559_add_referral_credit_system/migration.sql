/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."CreditType" AS ENUM ('REVIEW', 'REFERRAL');

-- CreateEnum
CREATE TYPE "public"."CreditStatus" AS ENUM ('PENDING', 'APPLIED');

-- CreateEnum
CREATE TYPE "public"."ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "creditRolloverPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "reviewCreditApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewToggled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewToggledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."credit_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "public"."CreditType" NOT NULL,
    "percentAmount" DOUBLE PRECISION NOT NULL,
    "status" "public"."CreditStatus" NOT NULL DEFAULT 'PENDING',
    "referralId" TEXT,
    "appliedToInvoice" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT,
    "referredEmail" TEXT,
    "status" "public"."ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_events_patientId_idx" ON "public"."credit_events"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredId_key" ON "public"."referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "public"."referrals"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "public"."users"("referralCode");

-- AddForeignKey
ALTER TABLE "public"."credit_events" ADD CONSTRAINT "credit_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
