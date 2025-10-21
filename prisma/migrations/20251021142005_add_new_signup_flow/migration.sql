-- CreateEnum
CREATE TYPE "public"."WelcomeOrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "public"."new_signup_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "currentSubStep" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "step0Completed" BOOLEAN NOT NULL DEFAULT false,
    "step1Completed" BOOLEAN NOT NULL DEFAULT false,
    "step2Completed" BOOLEAN NOT NULL DEFAULT false,
    "step3Completed" BOOLEAN NOT NULL DEFAULT false,
    "step4Completed" BOOLEAN NOT NULL DEFAULT false,
    "step5Completed" BOOLEAN NOT NULL DEFAULT false,
    "step6Completed" BOOLEAN NOT NULL DEFAULT false,
    "step0Data" JSONB,
    "step1Data" JSONB,
    "step2Data" JSONB,
    "step3Data" JSONB,
    "step4Data" JSONB,
    "step5Data" JSONB,
    "step6Data" JSONB,
    "welcomeOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_signup_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."welcome_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripePaymentId" TEXT,
    "status" "public"."WelcomeOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "welcome_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "new_signup_sessions_sessionId_key" ON "public"."new_signup_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "new_signup_sessions_welcomeOrderId_key" ON "public"."new_signup_sessions"("welcomeOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "welcome_orders_orderNumber_key" ON "public"."welcome_orders"("orderNumber");

-- AddForeignKey
ALTER TABLE "public"."new_signup_sessions" ADD CONSTRAINT "new_signup_sessions_welcomeOrderId_fkey" FOREIGN KEY ("welcomeOrderId") REFERENCES "public"."welcome_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
