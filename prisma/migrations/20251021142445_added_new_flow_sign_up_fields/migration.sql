/*
  Warnings:

  - The values [PAID,PROCESSING,SHIPPED,DELIVERED,REFUNDED] on the enum `WelcomeOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `originalAmount` on the `welcome_orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentId` on the `welcome_orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentIntentId` on the `welcome_orders` table. All the data in the column will be lost.
  - You are about to drop the `new_signup_sessions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `email` to the `welcome_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalAmount` to the `welcome_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."WelcomeOrderStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "public"."welcome_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."welcome_orders" ALTER COLUMN "status" TYPE "public"."WelcomeOrderStatus_new" USING ("status"::text::"public"."WelcomeOrderStatus_new");
ALTER TYPE "public"."WelcomeOrderStatus" RENAME TO "WelcomeOrderStatus_old";
ALTER TYPE "public"."WelcomeOrderStatus_new" RENAME TO "WelcomeOrderStatus";
DROP TYPE "public"."WelcomeOrderStatus_old";
ALTER TABLE "public"."welcome_orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."new_signup_sessions" DROP CONSTRAINT "new_signup_sessions_welcomeOrderId_fkey";

-- AlterTable
ALTER TABLE "public"."welcome_orders" DROP COLUMN "originalAmount",
DROP COLUMN "stripePaymentId",
DROP COLUMN "stripePaymentIntentId",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentSubStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "finalAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "discountAmount" SET DEFAULT 0;

-- DropTable
DROP TABLE "public"."new_signup_sessions";

-- CreateTable
CREATE TABLE "public"."signup_steps" (
    "id" TEXT NOT NULL,
    "welcomeOrderId" TEXT NOT NULL,
    "userId" TEXT,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "subStepNumber" INTEGER,
    "subStepName" TEXT,
    "stepData" JSONB,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signup_steps_welcomeOrderId_stepNumber_subStepNumber_key" ON "public"."signup_steps"("welcomeOrderId", "stepNumber", "subStepNumber");

-- AddForeignKey
ALTER TABLE "public"."welcome_orders" ADD CONSTRAINT "welcome_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signup_steps" ADD CONSTRAINT "signup_steps_welcomeOrderId_fkey" FOREIGN KEY ("welcomeOrderId") REFERENCES "public"."welcome_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signup_steps" ADD CONSTRAINT "signup_steps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
