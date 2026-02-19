-- CreateTable
CREATE TABLE "public"."lab_result_files" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_result_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."lab_result_files" ADD CONSTRAINT "lab_result_files_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "public"."lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
