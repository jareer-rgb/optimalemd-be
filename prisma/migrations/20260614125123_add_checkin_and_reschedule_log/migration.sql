-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInBy" TEXT;

-- CreateTable
CREATE TABLE "public"."appointment_reschedule_logs" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "fromTime" TEXT NOT NULL,
    "toDate" DATE NOT NULL,
    "toTime" TEXT NOT NULL,
    "reason" TEXT,
    "rescheduledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reschedule_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_reschedule_logs_appointmentId_idx" ON "public"."appointment_reschedule_logs"("appointmentId");

-- AddForeignKey
ALTER TABLE "public"."appointment_reschedule_logs" ADD CONSTRAINT "appointment_reschedule_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
