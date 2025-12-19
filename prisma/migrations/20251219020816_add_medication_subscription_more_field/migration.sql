-- AlterTable
ALTER TABLE "public"."medication_payments" ADD COLUMN     "subscriptionCanceledAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;
