import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { AdminCreatePatientDto, AdminUpdatePatientDto, AdminCreateMedicalFormDto, PatientWithMedicalFormResponseDto } from './dto/admin.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService
  ) {}

  /**
   * Create a new patient from admin side with auto-generated password and email
   */
  async createPatient(createPatientDto: AdminCreatePatientDto): Promise<PatientWithMedicalFormResponseDto> {
    const { sendWelcomeEmail = true, ...patientData } = createPatientDto;

    // Check if user already exists by primary email
    const existingUser = await this.prisma.user.findUnique({
      where: { primaryEmail: patientData.primaryEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this primary email already exists');
    }

    // Generate a secure random password
    const generatedPassword = this.generateSecurePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Prepare user data for creation
    const userCreateData = {
      ...patientData,
      password: hashedPassword,
      dateOfBirth: new Date(patientData.dateOfBirth),
      dateOfFirstVisitPlanned: patientData.dateOfFirstVisitPlanned && patientData.dateOfFirstVisitPlanned.trim() !== '' 
        ? new Date(patientData.dateOfFirstVisitPlanned) 
        : null,
      emailVerificationToken,
      emailVerificationTokenExpiry,
      // Map legacy fields for backward compatibility
      email: patientData.primaryEmail,
      phone: patientData.primaryPhone,
      isActive: true,
      isEmailVerified: false, // Admin created patients need to verify their email
    };

    // Create user
    const user = await this.prisma.user.create({
      data: userCreateData,
    });

    // Send welcome email with credentials if requested
    if (sendWelcomeEmail) {
      try {
        const verificationLink = `https://optimalmd-mu.vercel.app/verify-email?token=${emailVerificationToken}`;
        
        await this.mailerService.sendAdminCreatedPatientEmail(
          patientData.primaryEmail,
          patientData.firstName,
          generatedPassword,
          verificationLink
        );
      } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't fail patient creation if email fails, but log it
      }
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Update patient data (excluding medical form data)
   */
  async updatePatient(patientId: string, updatePatientDto: AdminUpdatePatientDto): Promise<PatientWithMedicalFormResponseDto> {
    // Check if patient exists
    const existingPatient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!existingPatient) {
      throw new NotFoundException('Patient not found');
    }

    // If email is being updated, check for conflicts
    if (updatePatientDto.primaryEmail && updatePatientDto.primaryEmail !== existingPatient.primaryEmail) {
      const existingUserWithEmail = await this.prisma.user.findUnique({
        where: { primaryEmail: updatePatientDto.primaryEmail },
      });

      if (existingUserWithEmail) {
        throw new ConflictException('Another user with this primary email already exists');
      }
    }

    // Prepare update data
    const updateData: any = { ...updatePatientDto };
    
    if (updatePatientDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updatePatientDto.dateOfBirth);
    }
    
    if (updatePatientDto.dateOfFirstVisitPlanned && updatePatientDto.dateOfFirstVisitPlanned.trim() !== '') {
      updateData.dateOfFirstVisitPlanned = new Date(updatePatientDto.dateOfFirstVisitPlanned);
    } else if (updatePatientDto.dateOfFirstVisitPlanned === '') {
      updateData.dateOfFirstVisitPlanned = null;
    }

    // Update legacy fields if primary email or phone is updated
    if (updatePatientDto.primaryEmail) {
      updateData.email = updatePatientDto.primaryEmail;
    }
    if (updatePatientDto.primaryPhone) {
      updateData.phone = updatePatientDto.primaryPhone;
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: patientId },
      data: updateData,
    });

    return this.mapToResponseDto(updatedUser);
  }

  /**
   * Create medical form for a patient
   */
  async createMedicalForm(patientId: string, createMedicalFormDto: AdminCreateMedicalFormDto): Promise<any> {
    // Check if patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Check if medical form already exists for this patient
    const existingForm = await this.prisma.medicalForm.findFirst({
      where: { patientId }
    });

    if (existingForm) {
      throw new ConflictException('Medical form already exists for this patient. Use update instead.');
    }

    // Prepare medical form data
    const medicalFormData: any = {
      patientId,
      ...createMedicalFormDto
    };

    // Convert date string to Date object if provided
    if (createMedicalFormDto.consentDate) {
      medicalFormData.consentDate = new Date(createMedicalFormDto.consentDate);
    }

    // Create medical form
    const medicalForm = await this.prisma.medicalForm.create({
      data: medicalFormData
    });

    // Update user's form completion status
    await this.prisma.user.update({
      where: { id: patientId },
      data: {
        hasCompletedMedicalForm: true,
        medicalFormCompletedAt: new Date()
      }
    });

    return medicalForm;
  }

  /**
   * Update medical form for a patient
   */
  async updateMedicalForm(patientId: string, updateMedicalFormDto: Partial<AdminCreateMedicalFormDto>): Promise<any> {
    // Check if patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Check if medical form exists
    const existingForm = await this.prisma.medicalForm.findFirst({
      where: { patientId }
    });

    if (!existingForm) {
      throw new NotFoundException('Medical form not found for this patient');
    }

    // Prepare update data
    const updateData: any = { ...updateMedicalFormDto };

    // Convert date string to Date object if provided
    if (updateMedicalFormDto.consentDate) {
      updateData.consentDate = new Date(updateMedicalFormDto.consentDate);
    }

    // Update medical form
    const updatedMedicalForm = await this.prisma.medicalForm.update({
      where: { id: existingForm.id },
      data: updateData
    });

    return updatedMedicalForm;
  }

  /**
   * Get patient with medical form data
   */
  async getPatientWithMedicalForm(patientId: string): Promise<PatientWithMedicalFormResponseDto> {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      include: {
        medicalForms: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const responseDto = this.mapToResponseDto(patient);
    
    // Add medical form data if exists
    if (patient.medicalForms && patient.medicalForms.length > 0) {
      responseDto.medicalForm = patient.medicalForms[0];
    }

    return responseDto;
  }

  /**
   * Get all patients with pagination and search
   */
  async getAllPatients(query: any): Promise<{
    data: PatientWithMedicalFormResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 50,
      search,
      status,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { primaryEmail: { contains: search, mode: 'insensitive' } },
        { primaryPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [patients, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          medicalForms: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where })
    ]);

    const data = patients.map(patient => {
      const responseDto = this.mapToResponseDto(patient);
      
      // Add medical form data if exists
      if (patient.medicalForms && patient.medicalForms.length > 0) {
        responseDto.medicalForm = patient.medicalForms[0];
      }

      return responseDto;
    });

    return {
      data,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    };
  }

  /**
   * Delete patient (soft delete by deactivating)
   */
  async deletePatient(patientId: string): Promise<void> {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Soft delete by deactivating
    await this.prisma.user.update({
      where: { id: patientId },
      data: { isActive: false }
    });
  }

  /**
   * Generate a secure random password
   */
  private generateSecurePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special char
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Map user entity to response DTO
   */
  private mapToResponseDto(user: any): PatientWithMedicalFormResponseDto {
    return {
      id: user.id,
      title: user.title,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      completeAddress: user.completeAddress,
      city: user.city,
      state: user.state,
      zipcode: user.zipcode,
      primaryEmail: user.primaryEmail,
      alternativeEmail: user.alternativeEmail,
      primaryPhone: user.primaryPhone,
      alternativePhone: user.alternativePhone,
      emergencyContactName: user.emergencyContactName,
      emergencyContactRelationship: user.emergencyContactRelationship,
      emergencyContactPhone: user.emergencyContactPhone,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }
}
