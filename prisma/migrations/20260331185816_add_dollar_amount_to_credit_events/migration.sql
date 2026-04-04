-- AlterTable
ALTER TABLE "public"."credit_events" ADD COLUMN     "dollarAmount" DOUBLE PRECISION,
ALTER COLUMN "percentAmount" SET DEFAULT 0;
