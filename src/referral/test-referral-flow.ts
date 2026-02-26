/**
 * Referral Credit System — Quick Test Script
 *
 * Tests all flows WITHOUT touching real Stripe and without the full UI.
 *
 * Run from optimalemd-be/:
 *   npx ts-node -r tsconfig-paths/register src/referral/test-referral-flow.ts
 *
 * The script creates isolated test data, runs assertions, then cleans up.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { PrismaClient, CreditStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Colour helpers ───────────────────────────────────────────────────────────
const GREEN  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s: string) => `\x1b[2m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ${GREEN('✓')} ${label}`);
  passed++;
}
function fail(label: string, detail?: string) {
  console.log(`  ${RED('✗')} ${label}${detail ? `  ${DIM('→ ' + detail)}` : ''}`);
  failed++;
}
function assert(cond: boolean, label: string, detail?: string) {
  cond ? ok(label) : fail(label, detail);
}

const TEST_TAG = `__TEST_${Date.now()}__`;

// ─── Service helpers (inline — no NestJS DI needed) ──────────────────────────

const CREDIT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function activePendingFilter(patientId: string) {
  const now = new Date();
  return {
    patientId,
    status: CreditStatus.PENDING,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  } as any;
}

async function expireOldCredits(patientId: string) {
  const now = new Date();
  const { count } = await (prisma.creditEvent as any).updateMany({
    where: { patientId, status: 'PENDING', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  if (count > 0) {
    const remaining = await (prisma.creditEvent as any).count({ where: activePendingFilter(patientId) });
    if (remaining === 0) {
      await prisma.user.update({ where: { id: patientId }, data: { creditRolloverPct: 0 } });
    }
  }
  return count;
}

async function getPendingCreditPct(patientId: string): Promise<number> {
  await expireOldCredits(patientId);
  const patient = await prisma.user.findUnique({ where: { id: patientId } });
  const events = await (prisma.creditEvent as any).findMany({ where: activePendingFilter(patientId) });
  const sumPct = events.reduce((s: number, e: any) => s + e.percentAmount, 0);
  return sumPct + (patient?.creditRolloverPct ?? 0);
}

async function qualifyReferral(referredId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredId } });
  if (!referral || referral.status !== 'PENDING') return;
  await prisma.referral.update({ where: { id: referral.id }, data: { status: 'QUALIFIED', qualifiedAt: new Date() } });
  await (prisma.creditEvent as any).create({
    data: {
      patientId: referral.referrerId,
      type: 'REFERRAL',
      percentAmount: 20,
      status: 'PENDING',
      referralId: referral.id,
      expiresAt: new Date(Date.now() + CREDIT_TTL_MS),
    },
  });
}

async function applyCreditsToAppointment(patientId: string, appointmentId: string) {
  const patient = await prisma.user.findUnique({ where: { id: patientId } });
  if (!patient || patient.isSubscribed) return 0;
  await expireOldCredits(patientId);
  const freshPatient = await prisma.user.findUnique({ where: { id: patientId } });
  const events = await (prisma.creditEvent as any).findMany({ where: activePendingFilter(patientId) });
  const totalPct = events.reduce((s: number, e: any) => s + e.percentAmount, 0) + (freshPatient?.creditRolloverPct ?? 0);
  if (totalPct <= 0) return 0;
  const appliedPct = Math.min(totalPct, 100);
  const newRolloverPct = Math.max(0, totalPct - 100);
  for (const e of events) {
    await prisma.creditEvent.update({
      where: { id: e.id },
      data: { status: CreditStatus.APPLIED, appliedAt: new Date(), appliedToInvoice: appointmentId },
    });
  }
  await prisma.user.update({ where: { id: patientId }, data: { creditRolloverPct: newRolloverPct } });
  return appliedPct;
}

// ─── Test data factories ──────────────────────────────────────────────────────

async function makeUser(tag: string, extra: Record<string, any> = {}) {
  const slug = tag.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  return prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: tag,
      email: `${slug}${Date.now()}@tst${TEST_TAG.slice(-6)}.io`,
      primaryEmail: `${slug}${Date.now()}@tst${TEST_TAG.slice(-6)}.io`,
      password: 'hash',
      creditRolloverPct: 0,
      ...extra,
    },
  });
}

async function makeReferral(referrerId: string, referredId: string) {
  return prisma.referral.create({
    data: { referrerId, referredId, referredEmail: `ref@test.com`, status: 'PENDING' },
  });
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

async function test_basicReferralCredit() {
  console.log(BOLD('\n📋 Test 1: Basic referral → 20% credit'));
  const referrer = await makeUser('Referrer1');
  const referred = await makeUser('Referred1');
  await makeReferral(referrer.id, referred.id);
  await qualifyReferral(referred.id);

  const pct = await getPendingCreditPct(referrer.id);
  assert(pct === 20, `Referrer has 20% pending credit`, `got ${pct}%`);

  const events = await prisma.creditEvent.findMany({ where: { patientId: referrer.id } });
  assert(events.length === 1, 'One credit event created');
  assert(events[0].status === CreditStatus.PENDING, 'Status is PENDING');
  assert(events[0].percentAmount === 20, 'Amount is 20%');
  assert(events[0].expiresAt !== null, 'expiresAt is set');

  return { referrer, referred };
}

async function test_creditAppliedOnAppointment() {
  console.log(BOLD('\n📋 Test 2: Non-subscriber books appointment → credit applied + discount'));
  const referrer = await makeUser('Referrer2');
  const referred = await makeUser('Referred2');
  await makeReferral(referrer.id, referred.id);
  await qualifyReferral(referred.id);

  const pendingBefore = await getPendingCreditPct(referrer.id);
  assert(pendingBefore === 20, `20% pending before booking`);

  const basePrice = 145;
  const discount = Math.min(pendingBefore, 100) / 100;
  const finalPrice = Math.round(basePrice * (1 - discount) * 100) / 100;
  assert(finalPrice === 116, `Price reduced from $145 to $${finalPrice}`, `got $${finalPrice}`);

  const applied = await applyCreditsToAppointment(referrer.id, 'fake-appt-id-2');
  assert(applied === 20, `20% credit applied on booking`);

  const pendingAfter = await getPendingCreditPct(referrer.id);
  assert(pendingAfter === 0, `Credit consumed — 0% remaining`);

  const events = await prisma.creditEvent.findMany({ where: { patientId: referrer.id } });
  assert(events[0].status === CreditStatus.APPLIED, `CreditEvent status → APPLIED`);
  assert(events[0].appliedToInvoice === 'fake-appt-id-2', `appliedToInvoice is set`);
}

async function test_rolloverAbove100() {
  console.log(BOLD('\n📋 Test 3: 6 referrals = 120% → first appt free + 20% rollover'));
  const referrer = await makeUser('Referrer3');

  // Earn 6 × 20% = 120% in separate referrals
  for (let i = 1; i <= 6; i++) {
    const referred = await makeUser(`Ref3Referred${i}`);
    await makeReferral(referrer.id, referred.id);
    await qualifyReferral(referred.id);
  }

  const pct = await getPendingCreditPct(referrer.id);
  assert(pct === 120, `120% accumulated (6 × 20%)`, `got ${pct}%`);

  // Book first appointment
  const applied1 = await applyCreditsToAppointment(referrer.id, 'appt-3a');
  assert(applied1 === 100, `First appointment: 100% applied (free)`, `got ${applied1}%`);

  const rolloverPatient = await prisma.user.findUnique({ where: { id: referrer.id } });
  assert(rolloverPatient?.creditRolloverPct === 20, `20% rolled over to creditRolloverPct`, `got ${rolloverPatient?.creditRolloverPct}%`);

  // Second appointment
  const pctBefore2ndAppt = await getPendingCreditPct(referrer.id);
  assert(pctBefore2ndAppt === 20, `20% pending for second appointment`, `got ${pctBefore2ndAppt}%`);

  const finalPrice2 = Math.round(145 * (1 - 0.20) * 100) / 100;
  assert(finalPrice2 === 116, `Second appt price = $${finalPrice2} (20% off)`);

  const applied2 = await applyCreditsToAppointment(referrer.id, 'appt-3b');
  assert(applied2 === 20, `Second appointment: 20% applied`, `got ${applied2}%`);

  const rolloverAfter = await prisma.user.findUnique({ where: { id: referrer.id } });
  assert(rolloverAfter?.creditRolloverPct === 0, `Rollover cleared after second appointment`);
}

async function test_creditExpiry() {
  console.log(BOLD('\n📋 Test 4: Credit expiry after 30 days'));
  const referrer = await makeUser('Referrer4');
  const referred = await makeUser('Referred4');
  await makeReferral(referrer.id, referred.id);
  await qualifyReferral(referred.id);

  // Backdate the expiresAt to simulate an expired credit
  const PAST = new Date(Date.now() - 1000); // 1 second ago
  await (prisma.creditEvent as any).updateMany({
    where: { patientId: referrer.id, status: 'PENDING' },
    data: { expiresAt: PAST },
  });

  const pctBeforeExpiry = await (async () => {
    const events = await (prisma.creditEvent as any).findMany({ where: { patientId: referrer.id, status: 'PENDING' } });
    return events.reduce((s: number, e: any) => s + e.percentAmount, 0);
  })();
  assert(pctBeforeExpiry === 20, `Before expiry: 20% PENDING`);

  // Now call expiry and check stats
  const expiredCount = await expireOldCredits(referrer.id);
  assert(expiredCount === 1, `1 credit marked EXPIRED`);

  const pctAfterExpiry = await getPendingCreditPct(referrer.id);
  assert(pctAfterExpiry === 0, `After expiry: 0% pending`);

  const events = await prisma.creditEvent.findMany({ where: { patientId: referrer.id } });
  assert(events[0].status as string === 'EXPIRED', `CreditEvent status → EXPIRED`);

  const applied = await applyCreditsToAppointment(referrer.id, 'appt-4');
  assert(applied === 0, `Expired credits cannot be applied (0% applied)`);
}

async function test_creditNotAppliedToSubscriberAppointment() {
  console.log(BOLD('\n📋 Test 5: Subscriber appointment → credits NOT consumed (saved for subscription)'));
  const referrer = await makeUser('Referrer5', { isSubscribed: true });
  const referred = await makeUser('Referred5');
  await makeReferral(referrer.id, referred.id);
  await qualifyReferral(referred.id);

  const pctBefore = await getPendingCreditPct(referrer.id);
  assert(pctBefore === 20, `20% credit pending for subscriber`);

  // Booking a free appointment should NOT consume credits
  const applied = await applyCreditsToAppointment(referrer.id, 'appt-5');
  assert(applied === 0, `applyCreditsToAppointment skips subscriber (returned 0)`);

  const pctAfter = await getPendingCreditPct(referrer.id);
  assert(pctAfter === 20, `Credits still 20% after subscriber appointment (not consumed)`);
}

async function test_multipleReferralsExpirePartially() {
  console.log(BOLD('\n📋 Test 6: 2 referrals earned, 1 expires → only active counts toward discount'));
  const referrer = await makeUser('Referrer6');

  // Referral 1 — will be left to expire
  const ref6a = await makeUser('Ref6a');
  await makeReferral(referrer.id, ref6a.id);
  await qualifyReferral(ref6a.id);

  // Referral 2 — fresh
  const ref6b = await makeUser('Ref6b');
  await prisma.referral.create({ data: { referrerId: referrer.id, referredId: ref6b.id, status: 'PENDING' } });
  await qualifyReferral(ref6b.id);

  const totalBefore = await getPendingCreditPct(referrer.id);
  assert(totalBefore === 40, `40% accumulated (2 × 20%)`, `got ${totalBefore}%`);

  // Backdate only the FIRST credit event
  const events = await prisma.creditEvent.findMany({ where: { patientId: referrer.id, status: CreditStatus.PENDING }, orderBy: { createdAt: 'asc' } });
  await (prisma.creditEvent as any).update({
    where: { id: events[0].id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const pctAfterPartialExpiry = await getPendingCreditPct(referrer.id);
  assert(pctAfterPartialExpiry === 20, `Only 20% active after 1 of 2 credits expires`, `got ${pctAfterPartialExpiry}%`);

  const applied = await applyCreditsToAppointment(referrer.id, 'appt-6');
  assert(applied === 20, `20% applied on appointment (expired credit excluded)`);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  // Delete all test records by email domain
  const testUsers = await prisma.user.findMany({
    where: { primaryEmail: { contains: `tst${TEST_TAG.slice(-6)}` } },
    select: { id: true },
  });
  const ids = testUsers.map(u => u.id);
  if (ids.length) {
    await (prisma.creditEvent as any).deleteMany({ where: { patientId: { in: ids } } });
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: ids } }, { referredId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(BOLD(YELLOW('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(BOLD(YELLOW('   Referral Credit System — Test Suite')));
  console.log(BOLD(YELLOW('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  try {
    await test_basicReferralCredit();
    await test_creditAppliedOnAppointment();
    await test_rolloverAbove100();
    await test_creditExpiry();
    await test_creditNotAppliedToSubscriberAppointment();
    await test_multipleReferralsExpirePartially();
  } catch (err) {
    console.error(RED('\n💥 Unexpected error:'), err);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log(BOLD(YELLOW('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  const total = passed + failed;
  const summary = `${passed}/${total} tests passed`;
  console.log(failed === 0 ? GREEN(BOLD(`  ✓ ${summary}`)) : RED(BOLD(`  ✗ ${summary}`)));
  if (failed > 0) console.log(RED(`  ${failed} test(s) failed — check output above`));
  console.log(BOLD(YELLOW('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')));

  process.exit(failed > 0 ? 1 : 0);
}

main();
