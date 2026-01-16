/*
  Warnings:

  - A unique constraint covering the columns `[name,strength,dose,frequency,route]` on the table `medications` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."medications_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "medications_name_strength_dose_frequency_route_key" ON "public"."medications"("name", "strength", "dose", "frequency", "route");
