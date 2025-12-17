-- CreateTable
CREATE TABLE "public"."medication_payments" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntent" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medication_payments_appointmentId_key" ON "public"."medication_payments"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "medication_payments_stripePaymentId_key" ON "public"."medication_payments"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "medication_payments_paymentIntent_key" ON "public"."medication_payments"("paymentIntent");

-- AddForeignKey
ALTER TABLE "public"."medication_payments" ADD CONSTRAINT "medication_payments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
