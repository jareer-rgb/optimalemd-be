-- AlterEnum
ALTER TYPE "public"."CreditStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "public"."credit_events" ADD COLUMN     "expiresAt" TIMESTAMP(3);
