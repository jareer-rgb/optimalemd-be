-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "labTrendAnalysisAt" TIMESTAMP(3),
ADD COLUMN     "labTrendAnalysisHash" TEXT,
ADD COLUMN     "labTrendAnalysisNote" TEXT;
