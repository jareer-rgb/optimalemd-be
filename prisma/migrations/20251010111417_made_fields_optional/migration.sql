-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "emergencyContactName" DROP NOT NULL,
ALTER COLUMN "emergencyContactPhone" DROP NOT NULL,
ALTER COLUMN "referringSource" DROP NOT NULL;
