-- AlterTable
ALTER TABLE "public"."blog_posts" ADD COLUMN     "totalReadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueReadCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."blog_post_views" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_views_postId_viewedAt_idx" ON "public"."blog_post_views"("postId", "viewedAt");

-- CreateIndex
CREATE INDEX "blog_post_views_postId_visitorKey_idx" ON "public"."blog_post_views"("postId", "visitorKey");

-- AddForeignKey
ALTER TABLE "public"."blog_post_views" ADD CONSTRAINT "blog_post_views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
