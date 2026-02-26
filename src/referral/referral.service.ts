import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer/mailer.service';
import { CreditEvent, CreditStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';

const CREDIT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function creditExpiresAt(): Date {
  return new Date(Date.now() + CREDIT_TTL_MS);
}

/** WHERE clause for PENDING events that have not yet expired. */
function activePendingFilter(patientId: string): Prisma.CreditEventWhereInput {
  const now = new Date();
  return {
    patientId,
    status: CreditStatus.PENDING,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: now } },
    ],
  };
}

@Injectable()
export class ReferralService {
  private stripeClient: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.stripeClient = new Stripe(stripeKey, { apiVersion: '2025-10-29.clover' as any });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;
    while (exists) {
      code =
        'OPT-' +
        Array.from({ length: 6 }, () =>
          chars[Math.floor(Math.random() * chars.length)],
        ).join('');
      const found = await this.prisma.user.findUnique({ where: { referralCode: code } });
      exists = !!found;
    }
    return code!;
  }

  /**
   * Mark any PENDING credit events that have passed their expiresAt as EXPIRED.
   * Also zeroes creditRolloverPct if no active pending events remain.
   */
  private async expireOldCredits(patientId: string): Promise<void> {
    const now = new Date();

    const { count } = await this.prisma.creditEvent.updateMany({
      where: {
        patientId,
        status: CreditStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: CreditStatus.EXPIRED },
    });

    if (count > 0) {
      const remaining = await this.prisma.creditEvent.count({
        where: activePendingFilter(patientId),
      });
      if (remaining === 0) {
        await this.prisma.user.update({
          where: { id: patientId },
          data: { creditRolloverPct: 0 },
        });
      }
    }
  }

  /** Fetch non-expired PENDING credit events for a patient. */
  private getActivePendingEvents(patientId: string): Promise<CreditEvent[]> {
    return this.prisma.creditEvent.findMany({
      where: activePendingFilter(patientId),
    });
  }

  /**
   * For subscribers: immediately convert all active pending credits into a Stripe
   * customer balance credit so the discount is auto-applied to their next invoice.
   * Stripe carries unused balance forward indefinitely — unlimited rollover.
   */
  private async applyAllSubscriberCredits(patientId: string): Promise<void> {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient?.isSubscribed || !patient.stripeCustomerId || !patient.stripeSubscriptionId) return;

    await this.expireOldCredits(patientId);

    const freshPatient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!freshPatient) return;

    const pendingEvents = await this.getActivePendingEvents(patientId);
    const totalPct =
      pendingEvents.reduce((sum, e) => sum + e.percentAmount, 0) + freshPatient.creditRolloverPct;
    if (totalPct <= 0) return;

    const subscription = await this.stripeClient.subscriptions.retrieve(
      patient.stripeSubscriptionId,
      { expand: ['items.data.price'] },
    );
    const unitAmount = (subscription.items.data[0]?.price as any)?.unit_amount ?? 0;

    // No cap — Stripe carries unused balance to the next invoice automatically.
    const discountCents = Math.floor((unitAmount * totalPct) / 100);

    if (discountCents > 0) {
      await this.stripeClient.customers.createBalanceTransaction(patient.stripeCustomerId, {
        amount: -discountCents,
        currency: 'usd',
        description: `${totalPct}% referral/review credit – applied to next subscription invoice`,
      });
    }

    const updates = pendingEvents.map((e) =>
      this.prisma.creditEvent.update({
        where: { id: e.id },
        data: {
          status: CreditStatus.APPLIED,
          appliedAt: new Date(),
          appliedToInvoice: 'stripe-balance',
        },
      }),
    );

    await this.prisma.$transaction([
      ...updates,
      this.prisma.user.update({
        where: { id: patientId },
        data: { creditRolloverPct: 0 },
      }),
    ]);
  }

  // ─── Patient-facing ─────────────────────────────────────────────────────────

  async getOrCreateReferralCode(patientId: string) {
    let patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (!patient.referralCode) {
      const code = await this.generateReferralCode();
      patient = await this.prisma.user.update({
        where: { id: patientId },
        data: { referralCode: code },
      });
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://optimalmd-mu.vercel.app';
    return {
      referralCode: patient.referralCode,
      referralUrl: `${frontendUrl}/register?ref=${patient.referralCode}`,
    };
  }

  async getReferralStats(patientId: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    await this.expireOldCredits(patientId);

    const [referrals, creditEvents, freshPatient] = await Promise.all([
      this.prisma.referral.findMany({ where: { referrerId: patientId } }),
      this.getActivePendingEvents(patientId),
      this.prisma.user.findUnique({ where: { id: patientId } }),
    ]);

    const pendingReferrals = referrals.filter(r => r.status === 'PENDING').length;
    const qualifiedReferrals = referrals.filter(r => r.status === 'QUALIFIED').length;
    const pendingCreditPct =
      creditEvents.reduce((sum, e) => sum + e.percentAmount, 0) +
      (freshPatient?.creditRolloverPct ?? 0);
    const appliedPct = Math.min(pendingCreditPct, 100);
    const rolloverPct = Math.max(0, pendingCreditPct - 100);

    const nearestExpiry =
      creditEvents
        .map(e => e.expiresAt)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const { referralCode, referralUrl } = await this.getOrCreateReferralCode(patientId);

    return {
      referralCode,
      referralUrl,
      pendingReferrals,
      qualifiedReferrals,
      totalReferrals: referrals.length,
      pendingCreditPct,
      appliedPct,
      rolloverPct,
      nearestExpiry,
      reviewToggled: freshPatient?.reviewToggled ?? false,
      reviewCreditApplied: freshPatient?.reviewCreditApplied ?? false,
      isSubscribed: freshPatient?.isSubscribed ?? false,
    };
  }

  async toggleReviewStatus(patientId: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.reviewToggled) {
      throw new BadRequestException('You have already submitted your review for verification.');
    }
    await this.prisma.user.update({
      where: { id: patientId },
      data: { reviewToggled: true, reviewToggledAt: new Date() },
    });
    return {
      success: true,
      message: 'Review submitted for verification. Our team will apply your credit shortly.',
    };
  }

  // ─── Admin-facing ────────────────────────────────────────────────────────────

  async getPendingReviews() {
    return this.prisma.user.findMany({
      where: { reviewToggled: true, reviewCreditApplied: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        primaryEmail: true,
        reviewToggledAt: true,
        reviewCreditApplied: true,
      },
      orderBy: { reviewToggledAt: 'asc' },
    });
  }

  async applyReviewCredit(patientId: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.reviewCreditApplied) {
      throw new BadRequestException('Review credit has already been applied for this patient.');
    }
    if (!patient.reviewToggled) {
      throw new BadRequestException('Patient has not toggled review status yet.');
    }

    await this.prisma.$transaction([
      this.prisma.creditEvent.create({
        data: {
          patientId,
          type: 'REVIEW',
          percentAmount: 5,
          status: CreditStatus.PENDING,
          expiresAt: creditExpiresAt(),
        },
      }),
      this.prisma.user.update({
        where: { id: patientId },
        data: { reviewCreditApplied: true },
      }),
    ]);

    try {
      await this.applyAllSubscriberCredits(patientId);
    } catch (err) {
      console.error('Subscriber Stripe balance update failed after review credit (non-fatal):', err);
    }

    try {
      const email = patient.primaryEmail ?? patient.email ?? null;
      if (email) {
        const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'there';
        await this.mailerService.sendReviewCreditEmail(email, name, 5, patient.isSubscribed ?? false);
      }
    } catch (err) {
      console.error('Review credit email failed (non-fatal):', err);
    }

    return { success: true, message: '5% review credit applied successfully.' };
  }

  async getAllReferrals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: {
            select: { id: true, firstName: true, lastName: true, email: true, primaryEmail: true },
          },
          referred: {
            select: { id: true, firstName: true, lastName: true, email: true, primaryEmail: true },
          },
        },
      }),
      this.prisma.referral.count(),
    ]);
    return { referrals, total, page, limit };
  }

  async getPatientCredits(patientId: string) {
    return this.prisma.creditEvent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markCreditApplied(creditEventId: string, appliedToInvoice?: string) {
    const event = await this.prisma.creditEvent.findUnique({ where: { id: creditEventId } });
    if (!event) throw new NotFoundException('Credit event not found');
    if (event.status === CreditStatus.APPLIED) {
      throw new BadRequestException('Credit already marked as applied.');
    }
    return this.prisma.creditEvent.update({
      where: { id: creditEventId },
      data: {
        status: CreditStatus.APPLIED,
        appliedAt: new Date(),
        appliedToInvoice: appliedToInvoice || null,
      },
    });
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  async createReferralOnSignup(referralCode: string, referredEmail: string, referredId: string) {
    const referrer = await this.prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) return;
    if (referrer.id === referredId) return;

    const existing = await this.prisma.referral.findUnique({ where: { referredId } });
    if (existing) return;

    await this.prisma.referral.create({
      data: { referrerId: referrer.id, referredId, referredEmail, status: 'PENDING' },
    });
  }

  async qualifyReferral(patientId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredId: patientId },
    });
    if (!referral || referral.status !== 'PENDING') return;

    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'QUALIFIED', qualifiedAt: new Date() },
      }),
      this.prisma.creditEvent.create({
        data: {
          patientId: referral.referrerId,
          type: 'REFERRAL',
          percentAmount: 20,
          status: CreditStatus.PENDING,
          referralId: referral.id,
          expiresAt: creditExpiresAt(),
        },
      }),
    ]);

    try {
      await this.applyAllSubscriberCredits(referral.referrerId);
    } catch (err) {
      console.error('Subscriber Stripe balance update failed after referral qualify (non-fatal):', err);
    }

    try {
      const referrer = await this.prisma.user.findUnique({ where: { id: referral.referrerId } });
      if (referrer) {
        const email = referrer.primaryEmail ?? referrer.email ?? null;
        if (!email) return;
        const name = `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() || 'there';
        await this.mailerService.sendReferralCreditEmail(email, name, 20, referrer.isSubscribed ?? false);
      }
    } catch (err) {
      console.error('Referral credit email failed (non-fatal):', err);
    }
  }

  async applyCreditsToAppointment(patientId: string, appointmentId: string): Promise<void> {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) return;

    // Subscribers get credits applied to their subscription billing, not appointments
    if (patient.isSubscribed) return;

    await this.expireOldCredits(patientId);

    const [freshPatient, pendingEvents] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: patientId } }),
      this.getActivePendingEvents(patientId),
    ]);
    if (!freshPatient) return;

    const totalPct =
      pendingEvents.reduce((sum, e) => sum + e.percentAmount, 0) + freshPatient.creditRolloverPct;
    if (totalPct <= 0) return;

    const newRolloverPct = Math.max(0, totalPct - 100);

    const updates = pendingEvents.map((e) =>
      this.prisma.creditEvent.update({
        where: { id: e.id },
        data: {
          status: CreditStatus.APPLIED,
          appliedAt: new Date(),
          appliedToInvoice: appointmentId,
        },
      }),
    );

    await this.prisma.$transaction([
      ...updates,
      this.prisma.user.update({
        where: { id: patientId },
        data: { creditRolloverPct: newRolloverPct },
      }),
    ]);
  }
}
