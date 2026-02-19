import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabOrderDto, LabTestTypeDto, LabOrderDto } from './dto/lab-orders.dto';

@Injectable()
export class LabOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active lab test types
   */
  async getLabTestTypes(): Promise<LabTestTypeDto[]> {
    const testTypes = await this.prisma.labTestType.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return testTypes.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description || undefined,
      code: type.code || undefined,
      price: type.price ? Number(type.price) : undefined,
      isActive: type.isActive,
    }));
  }

  /**
   * Request a lab order
   */
  async createLabOrder(
    userId: string,
    createOrderDto: CreateLabOrderDto,
  ): Promise<LabOrderDto> {
    // Check if patient has uploaded identity documents (driving license and photo)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        drivingLicensePath: true,
        photoPath: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.drivingLicensePath || !user.photoPath) {
      const missingDocs: string[] = [];
      if (!user.drivingLicensePath) missingDocs.push('driving license');
      if (!user.photoPath) missingDocs.push('profile photo');
      throw new BadRequestException(
        `You must upload your ${missingDocs.join(' and ')} before booking a lab. Please upload them from your profile settings.`
      );
    }

    // Check if patient has any lab orders in the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentOrders = await this.prisma.labOrder.findMany({
      where: {
        patientId: userId,
        createdAt: {
          gte: threeMonthsAgo,
        },
        status: {
          not: 'cancelled', // Don't count cancelled orders
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (recentOrders.length > 0) {
      const lastOrderDate = new Date(recentOrders[0].createdAt);
      const nextAllowedDate = new Date(lastOrderDate);
      nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 3);
      
      const daysRemaining = Math.ceil((nextAllowedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      throw new BadRequestException(
        `You can only book a lab once every 3 months. Your last lab order was on ${lastOrderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. You can book your next lab on ${nextAllowedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (${daysRemaining} days remaining).`
      );
    }

    // Validate that all test types exist and are active
    const testTypes = await this.prisma.labTestType.findMany({
      where: {
        id: { in: createOrderDto.testTypeIds },
        isActive: true,
      },
    });

    if (testTypes.length !== createOrderDto.testTypeIds.length) {
      throw new BadRequestException('One or more selected test types are invalid or inactive');
    }

    // Check for duplicates
    const uniqueIds = new Set(createOrderDto.testTypeIds);
    if (uniqueIds.size !== createOrderDto.testTypeIds.length) {
      throw new BadRequestException('Duplicate test types are not allowed');
    }

    // Request the lab order with items
    const labOrder = await this.prisma.labOrder.create({
      data: {
        patientId: userId,
        scheduledDate: new Date(createOrderDto.scheduledDate),
        status: 'pending',
        notes: createOrderDto.notes || undefined,
        items: {
          create: createOrderDto.testTypeIds.map((testTypeId) => ({
            labTestTypeId: testTypeId,
          })),
        },
      },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    return this.mapToLabOrderDto(labOrder);
  }

  /**
   * Get all lab orders for a patient
   */
  async getPatientLabOrders(userId: string): Promise<LabOrderDto[]> {
    const orders = await this.prisma.labOrder.findMany({
      where: {
        patientId: userId,
      },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.mapToLabOrderDto(order));
  }

  /**
   * Get a single lab order by ID
   */
  async getLabOrderById(orderId: string, userId: string): Promise<LabOrderDto> {
    const order = await this.prisma.labOrder.findFirst({
      where: {
        id: orderId,
        patientId: userId,
      },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    return this.mapToLabOrderDto(order);
  }

  /**
   * Cancel a lab order
   */
  async cancelLabOrder(orderId: string, userId: string): Promise<LabOrderDto> {
    const order = await this.prisma.labOrder.findFirst({
      where: {
        id: orderId,
        patientId: userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Lab order is already cancelled');
    }

    if (order.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed lab order');
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    return this.mapToLabOrderDto(updatedOrder);
  }

  /**
   * Create a lab order for a patient (admin access - bypasses restrictions)
   */
  async createLabOrderAdmin(
    patientId: string,
    createOrderDto: CreateLabOrderDto,
  ): Promise<LabOrderDto> {
    // Verify patient exists
    const user = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Patient not found');
    }

    // Validate that all test types exist and are active
    const testTypes = await this.prisma.labTestType.findMany({
      where: {
        id: { in: createOrderDto.testTypeIds },
        isActive: true,
      },
    });

    if (testTypes.length !== createOrderDto.testTypeIds.length) {
      throw new BadRequestException('One or more selected test types are invalid or inactive');
    }

    // Check for duplicates
    const uniqueIds = new Set(createOrderDto.testTypeIds);
    if (uniqueIds.size !== createOrderDto.testTypeIds.length) {
      throw new BadRequestException('Duplicate test types are not allowed');
    }

    // Create the lab order with items (admin bypasses all restrictions)
    const labOrder = await this.prisma.labOrder.create({
      data: {
        patientId: patientId,
        scheduledDate: new Date(createOrderDto.scheduledDate),
        status: 'pending',
        notes: createOrderDto.notes || undefined,
        items: {
          create: createOrderDto.testTypeIds.map((testTypeId) => ({
            labTestTypeId: testTypeId,
          })),
        },
      },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    return this.mapToLabOrderDto(labOrder);
  }

  /**
   * Get all lab orders for a patient (admin access)
   */
  async getPatientLabOrdersAdmin(patientId: string): Promise<LabOrderDto[]> {
    const orders = await this.prisma.labOrder.findMany({
      where: {
        patientId: patientId,
      },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
        resultFiles: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            drivingLicensePath: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.mapToLabOrderDto(order));
  }

  /**
   * Upload lab order for an order
   */
  async uploadLabOrder(orderId: string, filePath: string): Promise<LabOrderDto> {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    // Delete old receipt if exists
    if (order.receiptPath && require('fs').existsSync(order.receiptPath)) {
      try {
        require('fs').unlinkSync(order.receiptPath);
      } catch (error) {
        console.error('Error deleting old receipt:', error);
      }
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: { receiptPath: filePath },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    return this.mapToLabOrderDto(updatedOrder);
  }

  /**
   * Upload lab results for an order
   */
  async uploadLabResults(orderId: string, filePath: string): Promise<LabOrderDto> {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    // Delete old results if exists
    if (order.resultsPath && require('fs').existsSync(order.resultsPath)) {
      try {
        require('fs').unlinkSync(order.resultsPath);
      } catch (error) {
        console.error('Error deleting old results:', error);
      }
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: { resultsPath: filePath, status: 'completed' },
      include: {
        items: {
          include: {
            labTestType: true,
          },
        },
      },
    });

    return this.mapToLabOrderDto(updatedOrder);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToLabOrderDto(order: any): LabOrderDto {
    return {
      id: order.id,
      patientId: order.patientId,
      doctorId: order.doctorId || undefined,
      scheduledDate: order.scheduledDate,
      status: order.status,
      notes: order.notes || undefined,
      receiptPath: order.receiptPath || undefined,
      resultsPath: order.resultsPath || undefined,
      items: order.items.map((item: any) => ({
        id: item.id,
        labTestType: {
          id: item.labTestType.id,
          name: item.labTestType.name,
          description: item.labTestType.description || undefined,
          code: item.labTestType.code || undefined,
          price: item.labTestType.price ? Number(item.labTestType.price) : undefined,
          isActive: item.labTestType.isActive,
        },
      })),
      resultFiles: order.resultFiles ? order.resultFiles.map((file: any) => ({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize || undefined,
        mimeType: file.mimeType || undefined,
        createdAt: file.createdAt,
      })) : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

