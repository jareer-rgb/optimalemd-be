-- DropForeignKey
ALTER TABLE "public"."medication_payments" DROP CONSTRAINT "medication_payments_appointmentId_fkey";

-- AddForeignKey
ALTER TABLE "public"."medication_payments" ADD CONSTRAINT "medication_payments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
