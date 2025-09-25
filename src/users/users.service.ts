import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileUpdateDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByPrimaryEmail(primaryEmail: string) {
    return this.prisma.user.findUnique({
      where: { primaryEmail },
    });
  }



  async updateProfile(id: string, updateData: ProfileUpdateDto) {
    // Create a new object with converted date fields for Prisma
    const prismaUpdateData: any = { ...updateData };
    
    // Handle date fields conversion
    if (updateData.dateOfBirth) {
      prismaUpdateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.dateOfFirstVisitPlanned) {
      prismaUpdateData.dateOfFirstVisitPlanned = new Date(updateData.dateOfFirstVisitPlanned);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: prismaUpdateData,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deactivateUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getAllUsers(query: any) {
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

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        title: true,
        firstName: true,
        middleName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        completeAddress: true,
        city: true,
        state: true,
        zipcode: true,
        primaryEmail: true,
        alternativeEmail: true,
        primaryPhone: true,
        alternativePhone: true,
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
        referringSource: true,
        consentForTreatment: true,
        hipaaPrivacyNoticeAcknowledgment: true,
        releaseOfMedicalRecordsConsent: true,
        preferredMethodOfCommunication: true,
        disabilityAccessibilityNeeds: true,
        careProviderPhone: true,
        lastFourDigitsSSN: true,
        languagePreference: true,
        ethnicityRace: true,
        primaryCarePhysician: true,
        insuranceProviderName: true,
        insurancePolicyNumber: true,
        insuranceGroupNumber: true,
        insurancePhoneNumber: true,
        guarantorResponsibleParty: true,
        dateOfRegistration: true,
        dateOfFirstVisitPlanned: true,
        interpreterRequired: true,
        advanceDirectives: true,
        isActive: true,
        isEmailVerified: true,
        hasCompletedMedicalForm: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }
}
