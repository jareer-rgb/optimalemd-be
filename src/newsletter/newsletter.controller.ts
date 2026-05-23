import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NewsletterService } from './newsletter.service';
import {
  NewsletterSubscriberResponseDto,
  SubscribeNewsletterDto,
} from './dto/newsletter.dto';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  private assertAdmin(req: { user?: { userType?: string } }) {
    if (req.user?.userType !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscribers')
  async listSubscribers(
    @Req() req: { user?: { userType?: string } },
  ): Promise<NewsletterSubscriberResponseDto[]> {
    this.assertAdmin(req);
    return this.newsletterService.listSubscribers();
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscribers/:id')
  async deactivateSubscriber(
    @Param('id') id: string,
    @Req() req: { user?: { userType?: string } },
  ): Promise<NewsletterSubscriberResponseDto> {
    this.assertAdmin(req);
    return this.newsletterService.deactivateSubscriber(id);
  }
}
