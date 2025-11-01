import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  // Get all prescriptions for an appointment
  async getAppointmentPrescriptions(appointmentId: string) {
    return this.prisma.medicationPrescription.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Get a specific prescription
  async getPrescription(appointmentId: string, medicationName: string) {
    return this.prisma.medicationPrescription.findUnique({
      where: {
        appointmentId_medicationName: {
          appointmentId,
          medicationName,
        },
      },
    });
  }

  // Create or update a prescription
  async upsertPrescription(
    appointmentId: string,
    medicationName: string,
    prescription: string,
  ) {
    return this.prisma.medicationPrescription.upsert({
      where: {
        appointmentId_medicationName: {
          appointmentId,
          medicationName,
        },
      },
      update: {
        prescription,
        updatedAt: new Date(),
      },
      create: {
        appointmentId,
        medicationName,
        prescription,
      },
    });
  }

  // Bulk upsert prescriptions for an appointment
  async bulkUpsertPrescriptions(
    appointmentId: string,
    prescriptions: Array<{ medicationName: string; prescription: string }>,
  ) {
    const results = await Promise.all(
      prescriptions.map((p) =>
        this.upsertPrescription(appointmentId, p.medicationName, p.prescription),
      ),
    );
    return results;
  }

  // Delete a prescription
  async deletePrescription(appointmentId: string, medicationName: string) {
    return this.prisma.medicationPrescription.delete({
      where: {
        appointmentId_medicationName: {
          appointmentId,
          medicationName,
        },
      },
    });
  }
}

