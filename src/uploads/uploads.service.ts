import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadsService {
  private readonly uploadsDir: string;

  constructor(private prisma: PrismaService) {
    // Create uploads directory at project root
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'user-documents');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadDrivingLicense(userId: string, file: any): Promise<{ filePath: string; fileName: string }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (images and PDFs)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an image (JPEG, PNG, WebP) or PDF.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `driving-license-${userId}-${uniqueId}${fileExtension}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Delete old file if exists
    if (user.drivingLicensePath && fs.existsSync(user.drivingLicensePath)) {
      try {
        fs.unlinkSync(user.drivingLicensePath);
      } catch (error) {
        console.error('Error deleting old driving license:', error);
      }
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { drivingLicensePath: filePath },
    });

    return { filePath, fileName };
  }

  async uploadPhoto(userId: string, file: any): Promise<{ filePath: string; fileName: string }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (images only)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an image (JPEG, PNG, WebP).');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `photo-${userId}-${uniqueId}${fileExtension}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Delete old file if exists
    if (user.photoPath && fs.existsSync(user.photoPath)) {
      try {
        fs.unlinkSync(user.photoPath);
      } catch (error) {
        console.error('Error deleting old photo:', error);
      }
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { photoPath: filePath },
    });

    return { filePath, fileName };
  }

  async getUserUploadStatus(userId: string): Promise<{ hasDrivingLicense: boolean; hasPhoto: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { drivingLicensePath: true, photoPath: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if files exist on filesystem
      const hasDrivingLicense = user.drivingLicensePath 
        ? fs.existsSync(user.drivingLicensePath) 
        : false;
      const hasPhoto = user.photoPath 
        ? fs.existsSync(user.photoPath) 
        : false;

      return {
        hasDrivingLicense,
        hasPhoto,
      };
    } catch (error) {
      console.error('Error getting upload status:', error);
      throw error;
    }
  }

  async removeDrivingLicense(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { drivingLicensePath: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete file if exists
    if (user.drivingLicensePath && fs.existsSync(user.drivingLicensePath)) {
      try {
        fs.unlinkSync(user.drivingLicensePath);
      } catch (error) {
        console.error('Error deleting driving license file:', error);
      }
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { drivingLicensePath: null },
    });
  }

  async removePhoto(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { photoPath: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete file if exists
    if (user.photoPath && fs.existsSync(user.photoPath)) {
      try {
        fs.unlinkSync(user.photoPath);
      } catch (error) {
        console.error('Error deleting photo file:', error);
      }
    }

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { photoPath: null },
    });
  }

  async getFilePath(userId: string, type: 'drivingLicense' | 'photo'): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { drivingLicensePath: true, photoPath: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const filePath = type === 'drivingLicense' ? user.drivingLicensePath : user.photoPath;

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException(`${type} file not found`);
    }

    return filePath;
  }
}

