/*
  Warnings:

  - Added the required column `standardPrice` to the `medications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."medications" ADD COLUMN     "directions" TEXT,
ADD COLUMN     "dose" TEXT,
ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "membershipPrice" DECIMAL(10,2),
ADD COLUMN     "prescription" TEXT,
ADD COLUMN     "pricingNotes" TEXT,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "standardPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "therapyCategory" TEXT;
