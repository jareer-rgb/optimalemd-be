-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CreditType" ADD VALUE 'FREE_MONTH';
ALTER TYPE "public"."CreditType" ADD VALUE 'PLATFORM_CREDIT';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "awaitingCycleReset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformCreditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "referralCycleBase" INTEGER NOT NULL DEFAULT 0;
