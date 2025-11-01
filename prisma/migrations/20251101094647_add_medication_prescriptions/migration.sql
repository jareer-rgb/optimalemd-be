-- CreateTable
CREATE TABLE "public"."medication_prescriptions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "prescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medication_prescriptions_appointmentId_medicationName_key" ON "public"."medication_prescriptions"("appointmentId", "medicationName");

-- AddForeignKey
ALTER TABLE "public"."medication_prescriptions" ADD CONSTRAINT "medication_prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
