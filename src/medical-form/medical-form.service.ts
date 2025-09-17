import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { CreateMedicalFormDto, MedicalFormResponseDto } from './dto';

@Injectable()
export class MedicalFormService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private configService: ConfigService
  ) {}

  async createMedicalForm(patientId: string, createMedicalFormDto: CreateMedicalFormDto): Promise<MedicalFormResponseDto> {
    // Check if patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Check if medical form already exists for this patient
    const existingForm = await this.prisma.medicalForm.findUnique({
      where: { patientId }
    });

    if (existingForm) {
      throw new ConflictException('Medical form already exists for this patient');
    }

    // Create medical form
    const medicalForm = await this.prisma.medicalForm.create({
      data: {
        patientId,
        ...createMedicalFormDto
      }
    });

    // Update user's form completion status
    await this.prisma.user.update({
      where: { id: patientId },
      data: {
        hasCompletedMedicalForm: true,
        medicalFormCompletedAt: new Date()
      }
    });

    return this.mapToResponseDto(medicalForm);
  }

  async getMedicalFormByPatientId(patientId: string): Promise<MedicalFormResponseDto> {
    const medicalForm = await this.prisma.medicalForm.findUnique({
      where: { patientId }
    });

    if (!medicalForm) {
      throw new NotFoundException('Medical form not found for this patient');
    }

    return this.mapToResponseDto(medicalForm);
  }

  async updateMedicalForm(patientId: string, updateData: Partial<CreateMedicalFormDto>): Promise<MedicalFormResponseDto> {
    const existingForm = await this.prisma.medicalForm.findUnique({
      where: { patientId }
    });

    if (!existingForm) {
      throw new NotFoundException('Medical form not found for this patient');
    }

    const updatedForm = await this.prisma.medicalForm.update({
      where: { patientId },
      data: updateData
    });

    return this.mapToResponseDto(updatedForm);
  }

  async deleteMedicalForm(patientId: string): Promise<void> {
    const existingForm = await this.prisma.medicalForm.findUnique({
      where: { patientId }
    });

    if (!existingForm) {
      throw new NotFoundException('Medical form not found for this patient');
    }

    await this.prisma.medicalForm.delete({
      where: { patientId }
    });

    // Update user's form completion status
    await this.prisma.user.update({
      where: { id: patientId },
      data: {
        hasCompletedMedicalForm: false,
        medicalFormCompletedAt: null
      }
    });
  }

  async checkFormCompletion(patientId: string): Promise<{ hasCompletedForm: boolean; completedAt?: Date }> {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: {
        hasCompletedMedicalForm: true,
        medicalFormCompletedAt: true
      }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return {
      hasCompletedForm: patient.hasCompletedMedicalForm,
      completedAt: patient.medicalFormCompletedAt || undefined
    };
  }

  private mapToResponseDto(medicalForm: any): MedicalFormResponseDto {
    return {
      id: medicalForm.id,
      patientId: medicalForm.patientId,
      chiefComplaint: medicalForm.chiefComplaint,
      historyOfPresentIllness: medicalForm.historyOfPresentIllness,
      pastMedicalHistory: medicalForm.pastMedicalHistory,
      pastSurgicalHistory: medicalForm.pastSurgicalHistory,
      allergies: medicalForm.allergies,
      tobaccoUse: medicalForm.tobaccoUse,
      alcoholUse: medicalForm.alcoholUse,
      recreationalDrugs: medicalForm.recreationalDrugs,
      otherSocialHistory: medicalForm.otherSocialHistory,
      familyHistory: medicalForm.familyHistory,
      workHistory: medicalForm.workHistory,
      medications: medicalForm.medications,
      generalSymptoms: medicalForm.generalSymptoms,
      cardiovascularSymptoms: medicalForm.cardiovascularSymptoms,
      respiratorySymptoms: medicalForm.respiratorySymptoms,
      gastrointestinalSymptoms: medicalForm.gastrointestinalSymptoms,
      genitourinarySymptoms: medicalForm.genitourinarySymptoms,
      neurologicalSymptoms: medicalForm.neurologicalSymptoms,
      musculoskeletalSymptoms: medicalForm.musculoskeletalSymptoms,
      skinSymptoms: medicalForm.skinSymptoms,
      psychiatricSymptoms: medicalForm.psychiatricSymptoms,
      endocrineSymptoms: medicalForm.endocrineSymptoms,
      otherSymptoms: medicalForm.otherSymptoms,
      bloodPressure: medicalForm.bloodPressure,
      heartRate: medicalForm.heartRate,
      respiratoryRate: medicalForm.respiratoryRate,
      temperature: medicalForm.temperature,
      oxygenSaturation: medicalForm.oxygenSaturation,
      weight: medicalForm.weight,
      height: medicalForm.height,
      bmi: medicalForm.bmi,
      generalExam: medicalForm.generalExam,
      heentExam: medicalForm.heentExam,
      chestLungsExam: medicalForm.chestLungsExam,
      heartExam: medicalForm.heartExam,
      abdomenExam: medicalForm.abdomenExam,
      neurologicalExam: medicalForm.neurologicalExam,
      musculoskeletalExam: medicalForm.musculoskeletalExam,
      investigationsLabs: medicalForm.investigationsLabs,
      assessmentDiagnosis: medicalForm.assessmentDiagnosis,
      planTreatment: medicalForm.planTreatment,
      referrals: medicalForm.referrals,
      additionalNotes: medicalForm.additionalNotes,
      clinician: medicalForm.clinician,
      pharmacy: medicalForm.pharmacy,
      insurance: medicalForm.insurance,
      primaryCareProvider: medicalForm.primaryCareProvider,
      referringPhysicians: medicalForm.referringPhysicians,
      createdAt: medicalForm.createdAt,
      updatedAt: medicalForm.updatedAt
    };
  }

  async resendMedicalFormEmail(email: string, name: string): Promise<void> {
    // Check if patient exists
    const patient = await this.prisma.user.findUnique({
      where: { primaryEmail: email }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Send medical form email
    const formLink = `${this.configService.get<string>('frontend.url')}/form`;
    await this.mailerService.sendMedicalFormEmail(email, name, formLink);
  }
}
