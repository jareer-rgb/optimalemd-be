/*
  Warnings:

  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `medication_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."medication_payments" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "medication_payments_stripeSubscriptionId_key" ON "public"."medication_payments"("stripeSubscriptionId");
