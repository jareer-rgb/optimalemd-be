/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionCanceledAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "public"."users"("stripeSubscriptionId");
