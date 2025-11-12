import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateAssessmentDto, 
  UpdateAssessmentDto, 
  AssessmentResponseDto,
  CreateAppointmentAssessmentDto,
  UpdateAppointmentAssessmentDto,
  AppointmentAssessmentResponseDto,
  CreateMultipleAppointmentAssessmentsDto
} from './dto/assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  // Assessment CRUD operations
  async createAssessment(createAssessmentDto: CreateAssessmentDto): Promise<AssessmentResponseDto> {
    const assessment = await this.prisma.assessment.create({
      data: createAssessmentDto,
    });

    return assessment;
  }

  async findAllAssessments(): Promise<AssessmentResponseDto[]> {
    const assessments = await this.prisma.assessment.findMany({
      orderBy: { name: 'asc' },
    });

    return assessments;
  }

  async findOneAssessment(id: string): Promise<AssessmentResponseDto> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return assessment;
  }

  async updateAssessment(id: string, updateAssessmentDto: UpdateAssessmentDto): Promise<AssessmentResponseDto> {
    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: updateAssessmentDto,
    });

    return assessment;
  }

  async removeAssessment(id: string): Promise<void> {
    await this.prisma.assessment.delete({
      where: { id },
    });
  }

  // Appointment Assessment operations
  async createAppointmentAssessment(createDto: CreateAppointmentAssessmentDto): Promise<AppointmentAssessmentResponseDto> {
    // Check if appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: createDto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${createDto.appointmentId} not found`);
    }

    // Check if assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: createDto.assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${createDto.assessmentId} not found`);
    }

    // Create or update appointment assessment
    const appointmentAssessment = await this.prisma.appointmentAssessment.upsert({
      where: {
        appointmentId_assessmentId: {
          appointmentId: createDto.appointmentId,
          assessmentId: createDto.assessmentId,
        },
      },
      update: {
        content: createDto.content,
      },
      create: {
        appointmentId: createDto.appointmentId,
        assessmentId: createDto.assessmentId,
        content: createDto.content,
      },
      include: {
        assessment: true,
      },
    });

    return appointmentAssessment;
  }

  async createMultipleAppointmentAssessments(createDto: CreateMultipleAppointmentAssessmentsDto): Promise<AppointmentAssessmentResponseDto[]> {
    const { appointmentId, assessments } = createDto;

    if (!assessments || assessments.length === 0) {
      return [];
    }

    // Ensure appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    // Deduplicate assessments (keep the last entry for each assessmentId)
    const assessmentMap = new Map<string, { assessmentId: string; content?: string }>();
    assessments.forEach((item) => {
      assessmentMap.set(item.assessmentId, item);
    });

    const uniqueAssessments = Array.from(assessmentMap.values());
    const assessmentIds = uniqueAssessments.map((item) => item.assessmentId);

    // Verify all assessments exist
    const existingAssessments = await this.prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
    });

    if (existingAssessments.length !== assessmentIds.length) {
      const existingIds = new Set(existingAssessments.map((ass) => ass.id));
      const missing = assessmentIds.filter((id) => !existingIds.has(id));
      throw new NotFoundException(`Assessments not found: ${missing.join(', ')}`);
    }

    const results = await Promise.all(
      uniqueAssessments.map((item) =>
        this.prisma.appointmentAssessment.upsert({
          where: {
            appointmentId_assessmentId: {
              appointmentId,
              assessmentId: item.assessmentId,
            },
          },
          update: {
            content: item.content,
          },
          create: {
            appointmentId,
            assessmentId: item.assessmentId,
            content: item.content,
          },
          include: {
            assessment: true,
          },
        })
      )
    );

    return results;
  }

  async getAppointmentAssessments(appointmentId: string): Promise<AppointmentAssessmentResponseDto[]> {
    const appointmentAssessments = await this.prisma.appointmentAssessment.findMany({
      where: { appointmentId },
      include: {
        assessment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return appointmentAssessments;
  }

  async updateAppointmentAssessment(
    appointmentId: string, 
    assessmentId: string, 
    updateDto: UpdateAppointmentAssessmentDto
  ): Promise<AppointmentAssessmentResponseDto> {
    const appointmentAssessment = await this.prisma.appointmentAssessment.update({
      where: {
        appointmentId_assessmentId: {
          appointmentId,
          assessmentId,
        },
      },
      data: updateDto,
      include: {
        assessment: true,
      },
    });

    return appointmentAssessment;
  }

  async removeAppointmentAssessment(appointmentId: string, assessmentId: string): Promise<void> {
    await this.prisma.appointmentAssessment.delete({
      where: {
        appointmentId_assessmentId: {
          appointmentId,
          assessmentId,
        },
      },
    });
  }

  // Get all assessments for an appointment with their content
  async getAppointmentAssessmentData(appointmentId: string): Promise<Record<string, any>> {
    const appointmentAssessments = await this.prisma.appointmentAssessment.findMany({
      where: { appointmentId },
      include: {
        assessment: true,
      },
    });

    const result: Record<string, any> = {};
    
    appointmentAssessments.forEach(appointmentAssessment => {
      const assessment = appointmentAssessment.assessment;
      result[assessment.id] = {
        name: assessment.name,
        content: appointmentAssessment.content || assessment.content,
        assessmentId: assessment.id,
        appointmentAssessmentId: appointmentAssessment.id,
        createdAt: appointmentAssessment.createdAt,
        updatedAt: appointmentAssessment.updatedAt,
      };
    });

    return result;
  }
}