import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../mailer/mailer.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { 
  CreateWelcomeOrderDto, 
  UpdateSignupStepDto, 
  SignupProgressResponseDto, 
  ResumeSignupResponseDto,
  WelcomeOrderStatus,
  PaymentStatus
} from './dto/new-signup.dto';

@Injectable()
export class NewSignupService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  // Generate unique order number
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WO-${timestamp}-${random}`;
  }

  // Create a new welcome order
  async createWelcomeOrder(createDto: CreateWelcomeOrderDto) {
    const orderNumber = this.generateOrderNumber();
    
    const welcomeOrder = await this.prisma.welcomeOrder.create({
      data: {
        email: createDto.email,
        orderNumber,
        totalAmount: createDto.totalAmount,
        discountAmount: createDto.discountAmount,
        finalAmount: createDto.finalAmount,
        status: WelcomeOrderStatus.PENDING,
        currentStep: 0,
        currentSubStep: 0,
        ...(createDto.userId && { userId: createDto.userId }),
      },
      include: {
        signupSteps: true,
      },
    });

    return welcomeOrder;
  }

  // Update signup step
  async updateSignupStep(welcomeOrderId: string, updateDto: UpdateSignupStepDto) {
    // Check if welcome order exists
    const welcomeOrder = await this.prisma.welcomeOrder.findUnique({
      where: { id: welcomeOrderId },
    });

    if (!welcomeOrder) {
      throw new NotFoundException('Welcome order not found');
    }

    // Update or create signup step
    const signupStep = await this.prisma.signupStep.upsert({
      where: {
        welcomeOrderId_stepNumber_subStepNumber: {
          welcomeOrderId,
          stepNumber: updateDto.stepNumber,
          subStepNumber: updateDto.subStepNumber || 0,
        },
      },
      update: {
        stepName: updateDto.stepName,
        subStepName: updateDto.subStepName,
        stepData: updateDto.stepData,
        isCompleted: updateDto.isCompleted || false,
        isValid: updateDto.isValid || false,
        validationErrors: updateDto.validationErrors,
        completedAt: updateDto.isCompleted ? new Date() : null,
        updatedAt: new Date(),
      },
      create: {
        welcomeOrderId,
        stepNumber: updateDto.stepNumber,
        stepName: updateDto.stepName,
        subStepNumber: updateDto.subStepNumber,
        subStepName: updateDto.subStepName,
        stepData: updateDto.stepData,
        isCompleted: updateDto.isCompleted || false,
        isValid: updateDto.isValid || false,
        validationErrors: updateDto.validationErrors,
        completedAt: updateDto.isCompleted ? new Date() : null,
      },
    });

    // Update welcome order progress
    await this.prisma.welcomeOrder.update({
      where: { id: welcomeOrderId },
      data: {
        currentStep: updateDto.stepNumber,
        currentSubStep: updateDto.subStepNumber || 0,
        status: updateDto.isCompleted && updateDto.stepNumber === 4 
          ? WelcomeOrderStatus.COMPLETED 
          : WelcomeOrderStatus.IN_PROGRESS,
        isCompleted: updateDto.isCompleted && updateDto.stepNumber === 4,
        completedAt: updateDto.isCompleted && updateDto.stepNumber === 4 ? new Date() : null,
      },
    });

    return signupStep;
  }

  // Get signup progress
  async getSignupProgress(welcomeOrderId: string): Promise<SignupProgressResponseDto> {
    const welcomeOrder = await this.prisma.welcomeOrder.findUnique({
      where: { id: welcomeOrderId },
      include: {
        signupSteps: {
          orderBy: [
            { stepNumber: 'asc' },
            { subStepNumber: 'asc' },
          ],
        },
      },
    });

    if (!welcomeOrder) {
      throw new NotFoundException('Welcome order not found');
    }

    return {
      welcomeOrderId: welcomeOrder.id,
      email: welcomeOrder.email,
      currentStep: welcomeOrder.currentStep,
      currentSubStep: welcomeOrder.currentSubStep,
      isCompleted: welcomeOrder.isCompleted,
      steps: welcomeOrder.signupSteps.map(step => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        subStepNumber: step.subStepNumber || undefined,
        subStepName: step.subStepName || undefined,
        isCompleted: step.isCompleted,
        isValid: step.isValid,
        completedAt: step.completedAt || undefined,
      })),
    };
  }

  // Resume signup by email
  async resumeSignupByEmail(email: string): Promise<ResumeSignupResponseDto> {
    const welcomeOrder = await this.prisma.welcomeOrder.findFirst({
      where: {
        email,
        status: {
          in: [WelcomeOrderStatus.PENDING, WelcomeOrderStatus.IN_PROGRESS],
        },
      },
      include: {
        signupSteps: {
          where: {
            stepNumber: {
              lte: 4, // Only include steps 0-4
            },
          },
          orderBy: [
            { stepNumber: 'asc' },
            { subStepNumber: 'asc' },
          ],
        },
      },
    });

    if (!welcomeOrder) {
      throw new NotFoundException('No incomplete signup found for this email');
    }

    // Get the current step data
    const currentStep = welcomeOrder.signupSteps.find(
      step => step.stepNumber === welcomeOrder.currentStep && 
              step.subStepNumber === welcomeOrder.currentSubStep
    );

    return {
      welcomeOrderId: welcomeOrder.id,
      email: welcomeOrder.email,
      currentStep: welcomeOrder.currentStep,
      currentSubStep: welcomeOrder.currentSubStep,
      stepData: currentStep?.stepData || {},
      canResume: true,
    };
  }

  // Complete the signup process and create user
  async completeSignup(welcomeOrderId: string, userData: any) {
    const welcomeOrder = await this.prisma.welcomeOrder.findUnique({
      where: { id: welcomeOrderId },
      include: {
        signupSteps: true,
      },
    });

    if (!welcomeOrder) {
      throw new NotFoundException('Welcome order not found');
    }

    if (welcomeOrder.isCompleted) {
      throw new BadRequestException('Signup already completed');
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        primaryEmail: userData.email, // Add missing primaryEmail field
        password: userData.password, // Should be hashed
        gender: userData.gender,
        dateOfBirth: new Date(userData.dateOfBirth),
        completeAddress: userData.completeAddress,
        city: userData.city,
        state: userData.state,
        zipcode: userData.zipcode,
        primaryPhone: userData.primaryPhone,
        alternativePhone: userData.alternativePhone,
        emergencyContactName: userData.emergencyContactName,
        emergencyContactRelationship: userData.emergencyContactRelationship,
        emergencyContactPhone: userData.emergencyContactPhone,
        referringSource: userData.referringSource,
        preferredMethodOfCommunication: userData.preferredMethodOfCommunication,
        disabilityAccessibilityNeeds: userData.disabilityAccessibilityNeeds,
        consentForTreatment: userData.consentForTreatment ? 'Y' : 'N',
        hipaaPrivacyNoticeAcknowledgment: userData.hipaaPrivacyNoticeAcknowledgment ? 'Y' : 'N',
        releaseOfMedicalRecordsConsent: userData.releaseOfMedicalRecordsConsent ? 'Y' : 'N',
        isEmailVerified: false,
        hasCompletedIntakeForm: true,
        intakeFormCompletedAt: new Date(),
      },
    });

    // Update welcome order with user ID
    await this.prisma.welcomeOrder.update({
      where: { id: welcomeOrderId },
      data: {
        userId: user.id,
        status: WelcomeOrderStatus.COMPLETED,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Update all signup steps with user ID
    await this.prisma.signupStep.updateMany({
      where: { welcomeOrderId },
      data: { userId: user.id },
    });

    return {
      user,
      welcomeOrder: {
        ...welcomeOrder,
        userId: user.id,
        status: WelcomeOrderStatus.COMPLETED,
        isCompleted: true,
        completedAt: new Date(),
      },
    };
  }

  // Get welcome order by ID
  async getWelcomeOrder(welcomeOrderId: string) {
    const welcomeOrder = await this.prisma.welcomeOrder.findUnique({
      where: { id: welcomeOrderId },
      include: {
        signupSteps: {
          orderBy: [
            { stepNumber: 'asc' },
            { subStepNumber: 'asc' },
          ],
        },
        user: true,
      },
    });

    if (!welcomeOrder) {
      throw new NotFoundException('Welcome order not found');
    }

    return welcomeOrder;
  }

  // Update payment status
  async updatePaymentStatus(welcomeOrderId: string, paymentIntentId: string, status: PaymentStatus) {
    const welcomeOrder = await this.prisma.welcomeOrder.update({
      where: { id: welcomeOrderId },
      data: {
        paymentIntentId,
        paymentStatus: status,
        paidAt: status === PaymentStatus.SUCCEEDED ? new Date() : null,
        // Update order status when payment succeeds
        status: status === PaymentStatus.SUCCEEDED ? WelcomeOrderStatus.IN_PROGRESS : WelcomeOrderStatus.PENDING,
      },
    });

    return welcomeOrder;
  }

  // Get welcome order status by user ID
  async getWelcomeOrderStatusByUserId(userId: string) {
    const welcomeOrder = await this.prisma.welcomeOrder.findFirst({
      where: { 
        userId,
        status: WelcomeOrderStatus.IN_PROGRESS
      },
      include: {
        signupSteps: {
          orderBy: [
            { stepNumber: 'asc' },
            { subStepNumber: 'asc' },
          ],
        },
      },
    });

    return welcomeOrder;
  }

  // Complete welcome order (mark as COMPLETED)
  async completeWelcomeOrder(welcomeOrderId: string) {
    const welcomeOrder = await this.prisma.welcomeOrder.update({
      where: { id: welcomeOrderId },
      data: {
        status: WelcomeOrderStatus.COMPLETED,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    return welcomeOrder;
  }

  // Update user medical form completion status
  async updateUserMedicalFormCompletion(userId: string) {
    const currentTime = new Date();
    
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasCompletedMedicalForm: true,
        medicalFormCompletedAt: currentTime,
        hasCompletedIntakeForm: true,
        intakeFormCompletedAt: currentTime,
      },
    });

    return user;
  }

  // Create user step by step (for basic info step)
  async createUserStepByStep(userData: any) {
    try {
      console.log('Creating user step by step with data:', userData);

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user with only the provided fields
      const user = await this.prisma.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          primaryEmail: userData.primaryEmail,
          email: userData.primaryEmail, // Legacy field - keep for compatibility
          gender: userData.gender,
          password: hashedPassword,
          isActive: userData.isActive ?? true,
          isEmailVerified: userData.isEmailVerified ?? false,
          hasCompletedMedicalForm: userData.hasCompletedMedicalForm ?? false,
          hasCompletedIntakeForm: userData.hasCompletedIntakeForm ?? false,
          // Only include other fields if they are provided
          ...(userData.title && { title: userData.title }),
          ...(userData.middleName && { middleName: userData.middleName }),
          ...(userData.dateOfBirth && { dateOfBirth: new Date(userData.dateOfBirth) }),
          ...(userData.completeAddress && { completeAddress: userData.completeAddress }),
          ...(userData.city && { city: userData.city }),
          ...(userData.state && { state: userData.state }),
          ...(userData.zipcode && { zipcode: userData.zipcode }),
          ...(userData.alternativeEmail && { alternativeEmail: userData.alternativeEmail }),
          ...(userData.primaryPhone && { primaryPhone: userData.primaryPhone }),
          ...(userData.alternativePhone && { alternativePhone: userData.alternativePhone }),
          ...(userData.emergencyContactName && { emergencyContactName: userData.emergencyContactName }),
          ...(userData.emergencyContactRelationship && { emergencyContactRelationship: userData.emergencyContactRelationship }),
          ...(userData.emergencyContactPhone && { emergencyContactPhone: userData.emergencyContactPhone }),
          ...(userData.referringSource && { referringSource: userData.referringSource }),
          ...(userData.consentForTreatment && { consentForTreatment: userData.consentForTreatment }),
          ...(userData.hipaaPrivacyNoticeAcknowledgment && { hipaaPrivacyNoticeAcknowledgment: userData.hipaaPrivacyNoticeAcknowledgment }),
          ...(userData.releaseOfMedicalRecordsConsent && { releaseOfMedicalRecordsConsent: userData.releaseOfMedicalRecordsConsent }),
          ...(userData.preferredMethodOfCommunication && { preferredMethodOfCommunication: userData.preferredMethodOfCommunication }),
          ...(userData.disabilityAccessibilityNeeds && { disabilityAccessibilityNeeds: userData.disabilityAccessibilityNeeds }),
          ...(userData.phone && { phone: userData.phone }),
        },
      });

      console.log('User created successfully:', user);

      // Generate JWT token (same format as login)
      const payload = { sub: user.id, email: user.primaryEmail, userType: 'user' };
      const accessToken = this.jwtService.sign(payload);

      return {
        user,
        accessToken,
      };
    } catch (error) {
      console.error('Error creating user step by step:', error);
      throw new BadRequestException('Failed to create user: ' + error.message);
    }
  }

  // Update welcome order with user ID
  async updateWelcomeOrder(welcomeOrderId: string, updateData: { userId: string }) {
    try {
      console.log('Updating welcome order with user ID:', { welcomeOrderId, userId: updateData.userId });

      const welcomeOrder = await this.prisma.welcomeOrder.update({
        where: { id: welcomeOrderId },
        data: {
          userId: updateData.userId,
        },
      });

      console.log('Welcome order updated successfully:', welcomeOrder);
      return welcomeOrder;
    } catch (error) {
      console.error('Error updating welcome order:', error);
      throw new BadRequestException('Failed to update welcome order: ' + error.message);
    }
  }

  // Update user profile with additional information
  async updateUserProfile(userId: string, userData: any) {
    try {
      console.log('Updating user profile for user:', userId, 'with data:', userData);

      // Filter out undefined/null values and prepare update data
      const updateData: any = {};
      
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined && userData[key] !== null && userData[key] !== '') {
          // Special handling for dateOfBirth
          if (key === 'dateOfBirth') {
            const dateValue = userData[key];
            // Validate date format
            if (typeof dateValue === 'string') {
              const date = new Date(dateValue);
              if (isNaN(date.getTime())) {
                throw new BadRequestException('Invalid date format. Please use MM-DD-YYYY format.');
              }
              // Check if date is reasonable (not in the past beyond 150 years, not in the future)
              const currentYear = new Date().getFullYear();
              const dateYear = date.getFullYear();
              if (dateYear < currentYear - 150 || dateYear > currentYear) {
                throw new BadRequestException('Invalid date. Please enter a valid birth date.');
              }
              updateData[key] = date;
            } else {
              updateData[key] = dateValue;
            }
          } else {
            updateData[key] = userData[key];
          }
        }
      });

      console.log('Filtered update data:', updateData);

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      console.log('User profile updated successfully:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      
      // Handle specific error types with user-friendly messages
      if (error instanceof BadRequestException) {
        throw error; // Re-throw our custom validation errors
      }
      
      // Handle Prisma errors
      if (error.code === 'P2002') {
        throw new BadRequestException('This information is already in use. Please check your details.');
      }
      
      if (error.code === 'P2025') {
        throw new BadRequestException('User not found. Please try logging in again.');
      }
      
      // Handle date validation errors
      if (error.message && error.message.includes('Invalid value for argument')) {
        if (error.message.includes('dateOfBirth')) {
          throw new BadRequestException('Invalid date format. Please use MM-DD-YYYY format.');
        }
        throw new BadRequestException('Invalid data format. Please check your information.');
      }
      
      // Generic error for unexpected issues
      throw new BadRequestException('Unable to update profile. Please check your information and try again.');
    }
  }

  // Save BMI data to Medical Form table (like the old BMI flow)
  async saveBMIData(userId: string, bmiData: { height: string; weight: string; waist: string; bmi: string }) {
    try {
      console.log('Saving BMI data to medical form for user:', userId, 'with data:', bmiData);

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if medical form already exists for this user
      let medicalForm = await this.prisma.medicalForm.findFirst({
        where: { 
          patientId: userId,
          appointmentId: null // New signup forms don't have appointmentId yet
        }
      });

      if (medicalForm) {
        // Update existing medical form with BMI data
        medicalForm = await this.prisma.medicalForm.update({
          where: { id: medicalForm.id },
          data: {
            height: bmiData.height,
            weight: bmiData.weight,
            waist: bmiData.waist,
            bmi: bmiData.bmi,
          }
        });
        console.log('Updated existing medical form with BMI data:', medicalForm);
      } else {
        // Create new medical form with BMI data
        medicalForm = await this.prisma.medicalForm.create({
          data: {
            patientId: userId,
            height: bmiData.height,
            weight: bmiData.weight,
            waist: bmiData.waist,
            bmi: bmiData.bmi,
            // Set some default values for legacy fields
            chiefComplaint: 'New patient registration',
            historyOfPresentIllness: 'Initial consultation',
            pastMedicalHistory: 'To be completed',
            pastSurgicalHistory: 'To be completed',
            allergies: 'To be completed',
            tobaccoUse: 'To be completed',
            alcoholUse: 'To be completed',
            familyHistory: 'To be completed',
            workHistory: 'To be completed',
            medications: 'To be completed',
          }
        });
        console.log('Created new medical form with BMI data:', medicalForm);
      }

      return {
        success: true,
        message: 'BMI data saved successfully',
        data: medicalForm
      };
    } catch (error) {
      console.error('Error saving BMI data to medical form:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to save BMI data: ' + error.message);
    }
  }

  // Save Medical Intake Form data to Medical Form table
  async saveMedicalIntake(userId: string, medicalData: any) {
    try {
      console.log('Saving medical intake data for user:', userId, 'with data:', medicalData);

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Find existing medical form for this user
      let medicalForm = await this.prisma.medicalForm.findFirst({
        where: { 
          patientId: userId,
          appointmentId: null // New signup forms don't have appointmentId yet
        }
      });

      // Process the medical data to handle date fields properly
      const processedMedicalData: any = { ...medicalData };
      
      // Convert consentDate string to Date object if provided
      if (processedMedicalData.consentDate && typeof processedMedicalData.consentDate === 'string') {
        processedMedicalData.consentDate = new Date(processedMedicalData.consentDate);
      }

      if (medicalForm) {
        // Update existing medical form with intake data
        medicalForm = await this.prisma.medicalForm.update({
          where: { id: medicalForm.id },
          data: processedMedicalData
        });
        console.log('Updated existing medical form with intake data:', medicalForm);
      } else {
        // Create new medical form with intake data
        medicalForm = await this.prisma.medicalForm.create({
          data: {
            patientId: userId,
            ...processedMedicalData,
            // Set some default values for required fields
            chiefComplaint: 'New patient registration',
            historyOfPresentIllness: 'Initial consultation',
            pastMedicalHistory: 'To be completed',
            pastSurgicalHistory: 'To be completed',
            allergies: 'To be completed',
            tobaccoUse: 'To be completed',
            alcoholUse: 'To be completed',
            familyHistory: 'To be completed',
            workHistory: 'To be completed',
            medications: 'To be completed',
          }
        });
        console.log('Created new medical form with intake data:', medicalForm);
      }

      // Mark that the user has completed the full medical form (like old flow)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          hasCompletedMedicalForm: true,
          medicalFormCompletedAt: new Date(),
        },
      });

      console.log('User marked as having completed medical form');

      return {
        success: true,
        message: 'Medical intake data saved successfully',
        data: medicalForm
      };
    } catch (error) {
      console.error('Error saving medical intake data:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to save medical intake data: ' + error.message);
    }
  }

  // Save Consent data to User table and send emails
  async saveConsentAndComplete(userId: string, consentData: any) {
    try {
      console.log('Saving consent data and completing signup for user:', userId, 'with data:', consentData);

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Update user with consent data
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          consentForTreatment: consentData.consentForTreatment ? 'Y' : 'N',
          hipaaPrivacyNoticeAcknowledgment: consentData.hipaaPrivacyNoticeAcknowledgment ? 'Y' : 'N',
          releaseOfMedicalRecordsConsent: consentData.releaseOfMedicalRecordsConsent ? 'Y' : 'N',
          isEmailVerified: false, // Will be verified when they click email link
          hasCompletedIntakeForm: true,
          intakeFormCompletedAt: new Date(),
        }
      });

      console.log('Updated user with consent data:', updatedUser);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with email verification token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken,
          emailVerificationTokenExpiry,
        }
      });

      // Send welcome email
      try {
        if (user.primaryEmail) {
          await this.mailerService.sendWelcomeEmail(
            user.primaryEmail,
            user.firstName || 'User'
          );
          console.log('Welcome email sent successfully');
        } else {
          console.error('No primary email found for user');
        }
      } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't fail the process if email fails
      }

      // Send email verification email
      try {
        if (user.primaryEmail) {
          const verificationLink = `https://optimalemd.health/verify-email?token=${emailVerificationToken}`;
          console.log('Generated verification link:', verificationLink);
          
          await this.mailerService.sendEmailVerificationEmail(
            user.primaryEmail,
            user.firstName || 'User',
            verificationLink
          );
          console.log('Email verification email sent successfully');
        } else {
          console.error('No primary email found for user');
        }
      } catch (error) {
        console.error('Failed to send email verification email:', error);
        // Don't fail the process if email fails
      }

      return {
        success: true,
        message: 'Consent data saved and signup completed successfully',
        data: {
          user: updatedUser,
          emailsSent: {
            welcome: true,
            verification: true
          }
        }
      };
    } catch (error) {
      console.error('Error saving consent data and completing signup:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to save consent data: ' + error.message);
    }
  }
}