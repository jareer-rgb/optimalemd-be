import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferralService } from './referral.service';

@ApiTags('Referral & Credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // ─── Patient routes ─────────────────────────────────────────────────────────

  @Get('my-code')
  @ApiOperation({ summary: 'Get or create referral code for the logged-in patient' })
  async getMyReferralCode(@Req() req: any) {
    return this.referralService.getOrCreateReferralCode(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral stats and credit balance for the logged-in patient' })
  async getReferralStats(@Req() req: any) {
    return this.referralService.getReferralStats(req.user.id);
  }

  @Post('toggle-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Patient toggles that they have left a public review' })
  async toggleReview(@Req() req: any) {
    return this.referralService.toggleReviewStatus(req.user.id);
  }

  // ─── Admin routes ────────────────────────────────────────────────────────────

  @Get('admin/pending-reviews')
  @ApiOperation({ summary: 'Admin: list patients who toggled review but credit not yet applied' })
  async getPendingReviews() {
    return this.referralService.getPendingReviews();
  }

  @Post('admin/apply-review-credit/:patientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: apply 5% review credit to a patient' })
  async applyReviewCredit(@Param('patientId') patientId: string) {
    return this.referralService.applyReviewCredit(patientId);
  }

  @Get('admin/referrals')
  @ApiOperation({ summary: 'Admin: paginated list of all referrals' })
  async getAllReferrals(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.referralService.getAllReferrals(Number(page), Number(limit));
  }

  @Get('admin/patient-credits/:patientId')
  @ApiOperation({ summary: 'Admin: get credit events for a specific patient' })
  async getPatientCredits(@Param('patientId') patientId: string) {
    return this.referralService.getPatientCredits(patientId);
  }

  @Put('admin/credit-event/:id/mark-applied')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: mark a credit event as applied (with optional invoice ref)' })
  async markCreditApplied(
    @Param('id') id: string,
    @Body('appliedToInvoice') appliedToInvoice?: string,
  ) {
    return this.referralService.markCreditApplied(id, appliedToInvoice);
  }
}
