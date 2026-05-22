-- AlterTable
ALTER TABLE "public"."medical_forms" ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "hasChildren" BOOLEAN,
ADD COLUMN     "childrenCountAndAges" TEXT,
ADD COLUMN     "wantsFutureChildren" TEXT;
