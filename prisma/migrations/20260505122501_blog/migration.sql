-- CreateEnum
CREATE TYPE "public"."BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "public"."BlogReactionType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateTable
CREATE TABLE "public"."blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "status" "public"."BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "slug" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ogImageUrl" TEXT,
    "authorAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blog_reactions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."BlogReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "public"."blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_isPublished_publishedAt_idx" ON "public"."blog_posts"("status", "isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "blog_posts_createdAt_idx" ON "public"."blog_posts"("createdAt");

-- CreateIndex
CREATE INDEX "blog_comments_postId_createdAt_idx" ON "public"."blog_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_comments_parentId_idx" ON "public"."blog_comments"("parentId");

-- CreateIndex
CREATE INDEX "blog_reactions_postId_type_idx" ON "public"."blog_reactions"("postId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "blog_reactions_postId_userId_key" ON "public"."blog_reactions"("postId", "userId");

-- AddForeignKey
ALTER TABLE "public"."blog_posts" ADD CONSTRAINT "blog_posts_authorAdminId_fkey" FOREIGN KEY ("authorAdminId") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_comments" ADD CONSTRAINT "blog_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_reactions" ADD CONSTRAINT "blog_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blog_reactions" ADD CONSTRAINT "blog_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
