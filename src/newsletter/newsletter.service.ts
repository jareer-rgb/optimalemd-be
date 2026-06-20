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

export type NewsletterSubscribeStatus =
  | 'already_subscribed'
  | 'new_subscription'
  | 'resubscribed';

export interface NewsletterSubscribeResult {
  success: true;
  status: NewsletterSubscribeStatus;
  message: string;
  alreadySubscribed: boolean;
}

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
      'https://www.formamd.com'
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

  async subscribe(dto: SubscribeNewsletterDto): Promise<NewsletterSubscribeResult> {
    const email = dto.email.trim().toLowerCase();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    let status: NewsletterSubscribeStatus;
    let message: string;
    let shouldSendEmail = true;

    if (existing?.isActive) {
      status = 'already_subscribed';
      message =
        "You're already subscribed to our newsletter. We'll keep sending you health optimization insights—no need to sign up again.";
      shouldSendEmail = false;

      if (
        existing.firstName !== firstName ||
        existing.lastName !== lastName
      ) {
        await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: { firstName, lastName },
        });
      }
    } else if (existing && !existing.isActive) {
      status = 'resubscribed';
      message =
        "Welcome back! You're subscribed again. Check your inbox—we've sent you our latest blog article.";
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
    } else {
      status = 'new_subscription';
      message =
        "You're subscribed! Check your email for our latest blog and expert health optimization tips.";
      await this.prisma.newsletterSubscriber.create({
        data: { email, firstName, lastName },
      });
    }

    const alreadySubscribed = status === 'already_subscribed';

    if (shouldSendEmail) {
      const latestBlog = await this.getLatestPublishedBlog();
      const blogsListUrl = `${this.getFrontendBaseUrl()}/our-blog`;

      try {
        await this.mailerService.sendNewsletterWelcomeEmail({
          to: email,
          firstName,
          latestBlogTitle: latestBlog?.title,
          latestBlogUrl: latestBlog?.url ?? blogsListUrl,
          blogsListUrl,
          isResubscribe: status === 'resubscribed',
        });
      } catch (err) {
        console.error('Newsletter welcome email failed (subscription saved):', err);
        if (status === 'new_subscription') {
          message =
            "You're subscribed! We saved your signup—if you don't see our email shortly, check your spam folder.";
        } else if (status === 'resubscribed') {
          message =
            "Welcome back! You're re-subscribed. If you don't see our email shortly, check your spam folder.";
        }
      }
    }

    return {
      success: true,
      status,
      message,
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
