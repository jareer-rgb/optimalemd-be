import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class UploadsService {
  private readonly uploadsDir: string;

  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {
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

  async uploadLabOrder(orderId: string, file: any): Promise<{ filePath: string; fileName: string }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (images and PDFs)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an image (JPEG, PNG, WebP) or PDF.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    // Check if lab order exists with patient info
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `lab-order-${orderId}-${uniqueId}${fileExtension}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Delete old file if exists
    if (labOrder.receiptPath && fs.existsSync(labOrder.receiptPath)) {
      try {
        fs.unlinkSync(labOrder.receiptPath);
      } catch (error) {
        console.error('Error deleting old lab order:', error);
      }
    }

    // Update lab order record - change status to confirmed if it was pending
    const updateData: any = { receiptPath: filePath };
    if (labOrder.status === 'pending') {
      updateData.status = 'confirmed';
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    // Send email to patient with attached lab order file whenever a file is uploaded
    if (labOrder.patient.primaryEmail) {
      try {
        const patientName = `${labOrder.patient.firstName} ${labOrder.patient.lastName}`;
        const testNames = labOrder.items.map(item => item.labTestType.name).join(', ');

        // Always attach the uploaded file
        await this.mailerService.sendLabOrderEmail(
          labOrder.patient.primaryEmail,
          patientName,
          testNames,
          filePath, // Pass file path for attachment
        );
      } catch (error) {
        console.error('Failed to send lab order email:', error);
        // Don't throw error - file upload succeeded
      }
    }

    return { filePath, fileName };
  }

  async uploadLabResults(orderId: string, file: any): Promise<{ filePath: string; fileName: string }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (images and PDFs)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an image (JPEG, PNG, WebP) or PDF.');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    // Check if lab order exists with patient info
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `lab-results-${orderId}-${uniqueId}${fileExtension}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Delete old file if exists
    if (labOrder.resultsPath && fs.existsSync(labOrder.resultsPath)) {
      try {
        fs.unlinkSync(labOrder.resultsPath);
      } catch (error) {
        console.error('Error deleting old lab results:', error);
      }
    }

    // Update lab order record
    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: { resultsPath: filePath },
    });

    // Send email to patient with attached results file
    if (labOrder.patient.primaryEmail) {
      try {
        const patientName = `${labOrder.patient.firstName} ${labOrder.patient.lastName}`;
        const testNames = labOrder.items.map(item => item.labTestType.name).join(', ');

        // Attach the uploaded results file
        await this.mailerService.sendLabResultsEmail(
          labOrder.patient.primaryEmail,
          patientName,
          testNames,
          filePath, // Pass file path for attachment
        );
      } catch (error) {
        console.error('Failed to send lab results email:', error);
        // Don't throw error - file upload succeeded
      }
    }

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

  async getLabFilePath(orderId: string, type: 'receipt' | 'results'): Promise<string> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      select: { receiptPath: true, resultsPath: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const filePath = type === 'receipt' ? labOrder.receiptPath : labOrder.resultsPath;

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException(`Lab ${type} file not found`);
    }

    return filePath;
  }

  async removeLabOrder(orderId: string): Promise<void> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (!labOrder.receiptPath) {
      throw new NotFoundException('Lab order file not found');
    }

    // Delete file from disk
    if (fs.existsSync(labOrder.receiptPath)) {
      try {
        fs.unlinkSync(labOrder.receiptPath);
      } catch (error) {
        console.error('Error deleting lab order file:', error);
      }
    }

    // Update lab order record
    await this.prisma.labOrder.update({
      where: { id: orderId },
      data: { receiptPath: null },
    });
  }

  async removeLabResults(orderId: string): Promise<void> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    if (!labOrder.resultsPath) {
      throw new NotFoundException('Results file not found');
    }

    // Delete file from disk
    if (fs.existsSync(labOrder.resultsPath)) {
      try {
        fs.unlinkSync(labOrder.resultsPath);
      } catch (error) {
        console.error('Error deleting lab results file:', error);
      }
    }

    // Update lab order record
    await this.prisma.labOrder.update({
      where: { id: orderId },
      data: { resultsPath: null },
    });
  }
}

