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

  async findByMedicalRecordNo(medicalRecordNo: string) {
    return this.prisma.user.findUnique({
      where: { medicalRecordNo },
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
}
