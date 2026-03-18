import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsCleanupService {
  private readonly logger = new Logger(AppointmentsCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every 30 minutes.
   * Deletes PENDING + unpaid appointments older than 60 minutes for all patients.
   *
   * Admin-created appointments are excluded by two guards:
   *   1. status = PENDING  — admin appointments are always created as CONFIRMED
   *   2. amount > 0        — admin appointments always have amount = 0.00
   */
  @Cron('0 */30 * * * *') // every 30 minutes
  async purgeExpiredUnpaidAppointments(): Promise<void> {
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);

    const expired = await this.prisma.appointment.findMany({
      where: {
        isPaid: false,
        amount: { gt: 0 },
        status: AppointmentStatus.PENDING,
        createdAt: { lt: sixtyMinutesAgo },
      },
      select: { id: true, slotId: true, patientId: true, appointmentDate: true, appointmentTime: true },
    });

    if (expired.length === 0) {
      this.logger.debug('No expired unpaid appointments to clean up.');
      return;
    }

    this.logger.log(`Found ${expired.length} expired unpaid appointment(s) — deleting...`);

    for (const appt of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          if (appt.slotId) {
            await tx.slot.update({
              where: { id: appt.slotId },
              data: { isAvailable: true },
            });
          }
          await tx.medicationPayment.deleteMany({ where: { appointmentId: appt.id } });
          await tx.appointment.delete({ where: { id: appt.id } });
        });

        this.logger.log(
          `Deleted expired unpaid appointment ${appt.id} (patient: ${appt.patientId}, date: ${appt.appointmentDate} ${appt.appointmentTime})`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to delete expired appointment ${appt.id}: ${err.message}`);
      }
    }
  }
}
