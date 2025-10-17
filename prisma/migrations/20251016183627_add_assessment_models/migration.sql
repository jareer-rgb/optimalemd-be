-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "assessmentData" JSONB;

-- CreateTable
CREATE TABLE "public"."assessment_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL,
    "options" TEXT[],
    "unit" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assessment_values" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "assessmentOptionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_options_name_key" ON "public"."assessment_options"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_values_appointmentId_assessmentOptionId_key" ON "public"."assessment_values"("appointmentId", "assessmentOptionId");

-- AddForeignKey
ALTER TABLE "public"."assessment_values" ADD CONSTRAINT "assessment_values_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessment_values" ADD CONSTRAINT "assessment_values_assessmentOptionId_fkey" FOREIGN KEY ("assessmentOptionId") REFERENCES "public"."assessment_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
