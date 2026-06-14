-- CreateEnum
CREATE TYPE "public"."VisitStatus" AS ENUM ('COMPLETED', 'NO_SHOW', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_CLINIC', 'RESCHEDULED');

-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "visitStatus" "public"."VisitStatus",
ADD COLUMN     "visitStatusNote" TEXT,
ADD COLUMN     "visitStatusSetAt" TIMESTAMP(3),
ADD COLUMN     "visitStatusSetBy" TEXT;
