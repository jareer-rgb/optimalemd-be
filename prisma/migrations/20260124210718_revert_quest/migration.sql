/*
  Warnings:

  - You are about to drop the column `questPatientId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `lab_orders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."lab_orders" DROP CONSTRAINT "lab_orders_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."lab_orders" DROP CONSTRAINT "lab_orders_patientId_fkey";

-- DropIndex
DROP INDEX "public"."users_questPatientId_key";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "questPatientId";

-- DropTable
DROP TABLE "public"."lab_orders";
