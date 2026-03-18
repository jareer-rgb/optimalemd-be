-- CreateTable
CREATE TABLE "public"."follow_up_intake_forms" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "hasRedFlags" BOOLEAN NOT NULL DEFAULT false,
    "hasYellowFlags" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_intake_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_intake_forms_appointmentId_key" ON "public"."follow_up_intake_forms"("appointmentId");

-- AddForeignKey
ALTER TABLE "public"."follow_up_intake_forms" ADD CONSTRAINT "follow_up_intake_forms_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follow_up_intake_forms" ADD CONSTRAINT "follow_up_intake_forms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
