import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogPostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import {
  NewsletterSubscriberResponseDto,
  SubscribeNewsletterDto,
} from './dto/newsletter.dto';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  private getFrontendBaseUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'https://www.optimalemd.health'
    );
  }

  private mapSubscriber(row: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    subscribedAt: Date;
    unsubscribedAt: Date | null;
  }): NewsletterSubscriberResponseDto {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      isActive: row.isActive,
      subscribedAt: row.subscribedAt,
      unsubscribedAt: row.unsubscribedAt,
    };
  }

  private async getLatestPublishedBlog(): Promise<{
    title: string;
    slug: string;
    url: string;
  } | null> {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        isPublished: true,
        status: BlogPostStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { title: true, slug: true },
    });

    if (!post) return null;

    const base = this.getFrontendBaseUrl();
    return {
      title: post.title,
      slug: post.slug,
      url: `${base}/our-blog/${post.slug}`,
    };
  }

  async subscribe(
    dto: SubscribeNewsletterDto,
  ): Promise<{ message: string; alreadySubscribed: boolean }> {
    const email = dto.email.trim().toLowerCase();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    let alreadySubscribed = false;

    if (existing) {
      if (existing.isActive) {
        alreadySubscribed = true;
      } else {
        await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            firstName,
            lastName,
            isActive: true,
            subscribedAt: new Date(),
            unsubscribedAt: null,
          },
        });
      }
    } else {
      await this.prisma.newsletterSubscriber.create({
        data: { email, firstName, lastName },
      });
    }

    const latestBlog = await this.getLatestPublishedBlog();
    const blogsListUrl = `${this.getFrontendBaseUrl()}/our-blog`;

    try {
      await this.mailerService.sendNewsletterWelcomeEmail({
        to: email,
        firstName,
        latestBlogTitle: latestBlog?.title,
        latestBlogUrl: latestBlog?.url ?? blogsListUrl,
        blogsListUrl,
        isResubscribe: alreadySubscribed,
      });
    } catch (err) {
      console.error('Newsletter welcome email failed (subscription saved):', err);
    }

    return {
      message: alreadySubscribed
        ? 'You are already subscribed. We sent you our latest blog link again.'
        : 'Thanks for subscribing! Check your inbox for our latest insights.',
      alreadySubscribed,
    };
  }

  async listSubscribers(): Promise<NewsletterSubscriberResponseDto[]> {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    });
    return rows.map((r) => this.mapSubscriber(r));
  }

  async deactivateSubscriber(id: string): Promise<NewsletterSubscriberResponseDto> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Subscriber not found');
    }
    if (!existing.isActive) {
      throw new ConflictException('Subscriber is already inactive');
    }

    const updated = await this.prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    return this.mapSubscriber(updated);
  }
}
