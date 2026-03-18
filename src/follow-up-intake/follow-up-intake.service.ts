import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Keywords used to detect which medication categories are active
const MED_KEYWORDS = {
  trt: [
    'testosterone', 'enclomiphene', 'hcg', 'anastrozole', 'tamoxifen',
    'clomiphene', 'clomid', 'gonadorelin', 'hmg',
  ],
  weightLoss: [
    'semaglutide', 'tirzepatide', 'retatrutide', 'metformin',
    'bupropion', 'naltrexone', 'wegovy', 'ozempic', 'mounjaro',
  ],
  peptide: [
    'sermorelin', 'tesamorelin', 'ipamorelin', 'bpc-157', 'bpc157',
    'tb-500', 'tb500', 'ghk-cu', 'ghkcu', 'aod-9604', 'aod9604',
    'nad+', 'nad', 'cjc-1295', 'cjc1295', 'peptide', 'longevity',
  ],
  hair: [
    'finasteride', 'dutasteride', 'minoxidil', 'hair',
  ],
};

function detectCategories(medications: any): {
  showTRT: boolean;
  showWeightLoss: boolean;
  showPeptide: boolean;
  showHair: boolean;
} {
  if (!medications) return { showTRT: false, showWeightLoss: false, showPeptide: false, showHair: false };

  // Flatten all medication names and category keys to lowercase
  const allText: string[] = [];

  if (typeof medications === 'object' && !Array.isArray(medications)) {
    // e.g. { "Hormone Optimization / TRT": ["Testosterone Cypionate", ...] }
    for (const [category, meds] of Object.entries(medications)) {
      // Only include a category if it has at least one medication assigned
      if (!Array.isArray(meds) || meds.length === 0) continue;
      allText.push(category.toLowerCase());
      meds.forEach((m: any) => {
        if (typeof m === 'string') allText.push(m.toLowerCase());
        else if (m?.name) allText.push(m.name.toLowerCase());
      });
    }
  }

  const joined = allText.join(' ');

  return {
    showTRT: MED_KEYWORDS.trt.some((k) => joined.includes(k)),
    showWeightLoss: MED_KEYWORDS.weightLoss.some((k) => joined.includes(k)),
    showPeptide: MED_KEYWORDS.peptide.some((k) => joined.includes(k)),
    showHair: MED_KEYWORDS.hair.some((k) => joined.includes(k)),
  };
}

function detectFlags(formData: any): { hasRedFlags: boolean; hasYellowFlags: boolean } {
  const red = [
    'Chest pain', 'Shortness of breath', 'Severe headache', 'Severe abdominal pain',
    'Fainting', 'Unusual bleeding', 'Vision loss / major vision changes',
    'Suicidal thoughts', 'Severe allergic reaction',
  ];

  const redFlagSymptoms: string[] = formData.red_flag_symptoms || [];
  const hasRedFlags = redFlagSymptoms.some((s) => red.includes(s));

  const hasYellowFlags =
    formData.med_adherence === 'No, I have missed multiple doses' ||
    formData.med_adherence === 'I stopped one or more medications' ||
    formData.self_adjusted_dose === 'Yes' ||
    formData.expectations_met === 'No' ||
    formData.side_effect_severity === 'Moderate' ||
    formData.side_effect_severity === 'Severe' ||
    (formData.med_nonadherence_reasons || []).includes('Cost') ||
    (formData.med_nonadherence_reasons || []).includes('Supply / shipping issue');

  return { hasRedFlags, hasYellowFlags };
}

@Injectable()
export class FollowUpIntakeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if patient is a follow-up patient and return their last appointment's medications.
   */
  async getPatientContext(patientId: string) {
    // Find the most recent past paid appointment
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastAppointment = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        isPaid: true,
        appointmentDate: { lt: today },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return {
      isFollowUpPatient: !!lastAppointment,
      lastAppointmentMedications: (lastAppointment?.medications as any) || null,
      medicationCategories: detectCategories(lastAppointment?.medications),
    };
  }

  /**
   * Submit follow-up intake form.
   */
  async submitForm(patientId: string, appointmentId: string, formData: any) {
    // Verify the appointment belongs to this patient
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, patientId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if form already exists
    const existing = await this.prisma.followUpIntakeForm.findUnique({
      where: { appointmentId },
    });

    if (existing) {
      throw new BadRequestException('Follow-up intake form already submitted for this appointment');
    }

    const { hasRedFlags, hasYellowFlags } = detectFlags(formData);

    const form = await this.prisma.followUpIntakeForm.create({
      data: {
        appointmentId,
        patientId,
        formData,
        hasRedFlags,
        hasYellowFlags,
        submittedAt: new Date(),
      },
    });

    return form;
  }

  /**
   * Get follow-up intake form for an appointment (doctor/admin view).
   */
  async getFormByAppointment(appointmentId: string) {
    const form = await this.prisma.followUpIntakeForm.findUnique({
      where: { appointmentId },
    });

    return form || null;
  }

  /**
   * Save the doctor-edited narrative summary back into formData.
   */
  async saveNarrativeSummary(appointmentId: string, narrativeSummary: string) {
    const form = await this.prisma.followUpIntakeForm.findUnique({
      where: { appointmentId },
    });

    if (!form) throw new NotFoundException('Follow-up intake form not found');

    const updatedFormData = {
      ...(form.formData as object),
      narrativeSummary,
    };

    return this.prisma.followUpIntakeForm.update({
      where: { appointmentId },
      data: { formData: updatedFormData },
    });
  }
}
