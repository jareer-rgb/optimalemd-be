-- AlterTable
ALTER TABLE "public"."medical_forms" ADD COLUMN     "alcoholDaysPerWeek" TEXT,
ADD COLUMN     "alcoholDrinksPerDay" TEXT,
ADD COLUMN     "tobaccoCigaretteFrequency" TEXT,
ADD COLUMN     "tobaccoNonCigaretteFrequency" TEXT,
ADD COLUMN     "tobaccoProductTypes" TEXT;
