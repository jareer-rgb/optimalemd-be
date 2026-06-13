-- CreateTable
CREATE TABLE "public"."subscription_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."PaymentStatus" NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "invoiceUrl" TEXT,
    "receiptUrl" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_transactions_stripeInvoiceId_key" ON "public"."subscription_transactions"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "subscription_transactions_userId_idx" ON "public"."subscription_transactions"("userId");

-- AddForeignKey
ALTER TABLE "public"."subscription_transactions" ADD CONSTRAINT "subscription_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
