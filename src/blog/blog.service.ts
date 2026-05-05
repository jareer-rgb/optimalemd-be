import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, BlogPostStatus, BlogReactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBlogCommentDto,
  CreateBlogPostDto,
  SetBlogReactionDto,
  UpdateBlogCommentDto,
  UpdateBlogPostDto,
} from './dto/blog.dto';
import slugify from 'slugify';
import * as sanitizeHtmlLib from 'sanitize-html';

const sanitizeHtml = (sanitizeHtmlLib as any).default || sanitizeHtmlLib;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeRichText(value: string): string {
    return sanitizeHtml(value, {
      allowedTags: [
        'p',
        'br',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'ul',
        'ol',
        'li',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'a',
        'img',
        'figure',
        'figcaption',
        'code',
        'pre',
        'hr',
        'span',
        'div',
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'loading', 'class', 'style'],
        figure: ['class', 'style'],
        figcaption: ['class', 'style'],
        p: ['class', 'style'],
        h1: ['class', 'style'],
        h2: ['class', 'style'],
        h3: ['class', 'style'],
        h4: ['class', 'style'],
        h5: ['class', 'style'],
        h6: ['class', 'style'],
        span: ['class', 'style'],
        div: ['class', 'style'],
        blockquote: ['class', 'style'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) return [];
    return [...new Set(tags.map((t) => t.trim()).filter(Boolean).slice(0, 20))];
  }

  private async ensureUniqueSlug(seed: string): Promise<string> {
    const base = slugify(seed, { lower: true, strict: true, trim: true }) || 'post';
    let candidate = base;
    let i = 1;
    while (await this.prisma.blogPost.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${i++}`;
    }
    return candidate;
  }

  private computePublishFields(input: {
    status?: BlogPostStatus;
    isPublished?: boolean;
  }) {
    let status = input.status ?? BlogPostStatus.DRAFT;
    let isPublished = input.isPublished ?? false;
    if (status === BlogPostStatus.PUBLISHED || isPublished) {
      status = BlogPostStatus.PUBLISHED;
      isPublished = true;
    }
    return { status, isPublished };
  }

  async createPost(adminId: string, dto: CreateBlogPostDto) {
    const cleanHtml = this.sanitizeRichText(dto.contentHtml);
    const slug = await this.ensureUniqueSlug(dto.slug || dto.title);
    const { status, isPublished } = this.computePublishFields({
      status: dto.status as BlogPostStatus | undefined,
      isPublished: dto.isPublished,
    });

    return this.prisma.blogPost.create({
      data: {
        title: dto.title.trim(),
        excerpt: dto.excerpt?.trim(),
        contentHtml: cleanHtml,
        coverImageUrl: dto.coverImageUrl,
        status,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        readTimeMinutes: dto.readTimeMinutes ?? 5,
        seoTitle: dto.seoTitle?.trim(),
        seoDescription: dto.seoDescription?.trim(),
        slug,
        canonicalUrl: dto.canonicalUrl?.trim(),
        tags: this.normalizeTags(dto.tags),
        ogImageUrl: dto.ogImageUrl?.trim(),
        authorAdminId: adminId,
      },
    });
  }

  async updatePost(postId: string, adminId: string, dto: UpdateBlogPostDto) {
    const current = await this.prisma.blogPost.findUnique({ where: { id: postId } });
    if (!current) throw new NotFoundException('Blog post not found');
    if (current.authorAdminId !== adminId) {
      throw new ForbiddenException('You can only edit your own blog posts');
    }

    let slug: string | undefined;
    if (dto.slug && dto.slug !== current.slug) {
      slug = await this.ensureUniqueSlug(dto.slug);
    } else if (dto.title && !dto.slug && dto.title !== current.title) {
      slug = await this.ensureUniqueSlug(dto.title);
    }

    const publishState = this.computePublishFields({
      status: (dto.status as BlogPostStatus | undefined) ?? current.status,
      isPublished: dto.isPublished ?? current.isPublished,
    });

    return this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        title: dto.title?.trim(),
        excerpt: dto.excerpt?.trim(),
        contentHtml: dto.contentHtml
          ? this.sanitizeRichText(dto.contentHtml)
          : undefined,
        coverImageUrl: dto.coverImageUrl,
        status: publishState.status,
        isPublished: publishState.isPublished,
        publishedAt:
          publishState.isPublished && !current.publishedAt
            ? new Date()
            : publishState.isPublished
            ? current.publishedAt
            : null,
        readTimeMinutes: dto.readTimeMinutes,
        seoTitle: dto.seoTitle?.trim(),
        seoDescription: dto.seoDescription?.trim(),
        slug,
        canonicalUrl: dto.canonicalUrl?.trim(),
        tags: dto.tags ? this.normalizeTags(dto.tags) : undefined,
        ogImageUrl: dto.ogImageUrl?.trim(),
      },
    });
  }

  async deletePost(postId: string, adminId: string) {
    const current = await this.prisma.blogPost.findUnique({ where: { id: postId } });
    if (!current) throw new NotFoundException('Blog post not found');
    if (current.authorAdminId !== adminId) {
      throw new ForbiddenException('You can only delete your own blog posts');
    }
    await this.prisma.blogPost.delete({ where: { id: postId } });
    return { deleted: true };
  }

  async listAdminPosts(page = 1, limit = 10, adminId?: string, search?: string) {
    const query = search?.trim();
    const where: Prisma.BlogPostWhereInput = {
      ...(adminId ? { authorAdminId: adminId } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
              { excerpt: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listPublicPosts(page = 1, limit = 9, tag?: string, search?: string) {
    const where: Prisma.BlogPostWhereInput = {
      isPublished: true,
      status: BlogPostStatus.PUBLISHED,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { excerpt: { contains: search, mode: 'insensitive' } },
              { tags: { has: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPublicPostBySlug(slug: string, userId?: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        isPublished: true,
        status: BlogPostStatus.PUBLISHED,
      },
      include: {
        authorAdmin: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!post) throw new NotFoundException('Blog post not found');

    const [reactionAgg, myReaction] = await Promise.all([
      this.prisma.blogReaction.groupBy({
        by: ['type'],
        where: { postId: post.id },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.blogReaction.findUnique({
            where: { postId_userId: { postId: post.id, userId } },
          })
        : Promise.resolve(null),
    ]);

    const upvotes =
      reactionAgg.find((r) => r.type === BlogReactionType.UPVOTE)?._count._all ?? 0;
    const downvotes =
      reactionAgg.find((r) => r.type === BlogReactionType.DOWNVOTE)?._count._all ?? 0;

    return {
      ...post,
      reactions: { upvotes, downvotes, myReaction: myReaction?.type ?? null },
    };
  }

  async getComments(postId: string) {
    const postExists = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!postExists) throw new NotFoundException('Blog post not found');

    return this.prisma.blogComment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async createComment(postId: string, userId: string, dto: CreateBlogCommentDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, isPublished: true },
    });
    if (!post || !post.isPublished) {
      throw new NotFoundException('Blog post not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.blogComment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, postId: true, parentId: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
      if (parent.parentId) {
        throw new BadRequestException('Only one nested reply level is allowed');
      }
    }

    return this.prisma.blogComment.create({
      data: {
        postId,
        userId,
        parentId: dto.parentId ?? null,
        content: dto.content.trim(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateComment(commentId: string, userId: string, dto: UpdateBlogCommentDto) {
    const comment = await this.prisma.blogComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comment');
    }

    return this.prisma.blogComment.update({
      where: { id: commentId },
      data: { content: dto.content.trim(), isEdited: true },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.blogComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comment');
    }
    await this.prisma.blogComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  async setReaction(postId: string, userId: string, dto: SetBlogReactionDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, isPublished: true },
    });
    if (!post || !post.isPublished) {
      throw new NotFoundException('Blog post not found');
    }

    const existing = await this.prisma.blogReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing?.type === (dto.type as BlogReactionType)) {
      await this.prisma.blogReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await this.prisma.blogReaction.update({
        where: { id: existing.id },
        data: { type: dto.type as BlogReactionType },
      });
    } else {
      await this.prisma.blogReaction.create({
        data: {
          postId,
          userId,
          type: dto.type as BlogReactionType,
        },
      });
    }

    const grouped = await this.prisma.blogReaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: { _all: true },
    });

    return {
      upvotes:
        grouped.find((g) => g.type === BlogReactionType.UPVOTE)?._count._all ?? 0,
      downvotes:
        grouped.find((g) => g.type === BlogReactionType.DOWNVOTE)?._count._all ?? 0,
      myReaction:
        (
          await this.prisma.blogReaction.findUnique({
            where: { postId_userId: { postId, userId } },
          })
        )?.type ?? null,
    };
  }
}
