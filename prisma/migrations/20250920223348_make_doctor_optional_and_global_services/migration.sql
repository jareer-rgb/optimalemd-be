/*
  Warnings:

  - You are about to drop the column `price` on the `doctor_services` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `services` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `services` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."services" DROP CONSTRAINT "services_doctorId_fkey";

-- DropIndex
DROP INDEX "public"."services_doctorId_name_key";

-- AlterTable
ALTER TABLE "public"."appointments" ALTER COLUMN "doctorId" DROP NOT NULL,
ALTER COLUMN "slotId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."doctor_services" DROP COLUMN "price",
ADD COLUMN     "customDuration" INTEGER,
ADD COLUMN     "customPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."services" DROP COLUMN "doctorId";

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "public"."services"("name");
