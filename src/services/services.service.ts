import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  QueryServicesDto,
  ServiceResponseDto,
  ServiceWithDoctorPricingDto,
  CreateDoctorServiceDto,
  UpdateDoctorServiceDto,
  DoctorServiceResponseDto,
  DoctorServiceWithRelationsDto,
} from './dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new medical service
   */
  async createService(createServiceDto: CreateServiceDto): Promise<ServiceResponseDto> {
    const { name, description, category, duration, basePrice } = createServiceDto;

    // Check if service name already exists globally
    const existingService = await this.prisma.service.findFirst({
      where: { 
        name 
      }
    });
    if (existingService) {
      throw new ConflictException('Service with this name already exists');
    }

    // Validate duration
    if (duration < 15 || duration > 480) {
      throw new BadRequestException('Duration must be between 15 and 480 minutes');
    }

    // Validate base price
    const price = parseFloat(basePrice);
    if (isNaN(price) || price <= 0) {
      throw new BadRequestException('Base price must be a positive number');
    }

    // Create service
    const service = await this.prisma.service.create({
      data: {
        name,
        description,
        category,
        duration,
        basePrice,
        isActive: true
      }
    });

    return service;
  }

  /**
   * Get service by ID
   */
  async findById(id: string): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  /**
   * Get service with doctor pricing
   */
  async findByIdWithDoctorPricing(id: string): Promise<ServiceWithDoctorPricingDto> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        doctorServices: {
          include: {
            doctor: {
              select: {
                id: true,
                specialization: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  /**
   * Get services with filtering and pagination
   */
  async findAll(query: QueryServicesDto): Promise<{ services: ServiceResponseDto[], total: number }> {
    const { name, category, isActive, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Note: doctorId filter removed since services are now global
    // Services are no longer tied to specific doctors

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: {
          doctorServices: {
            include: {
              doctor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  specialization: true,
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { isActive: 'desc' },
          { category: 'asc' },
          { name: 'asc' }
        ]
      }),
      this.prisma.service.count({ where })
    ]);

    return { services, total };
  }

  /**
   * Get services by doctor ID - DEPRECATED
   * Services are now global, use getDoctorServices instead
   */
  async getServicesByDoctor(doctorId: string): Promise<ServiceResponseDto[]> {
    // This method is deprecated since services are now global
    // Use getDoctorServices instead to get doctor-specific pricing
    throw new BadRequestException('This method is deprecated. Services are now global. Use getDoctorServices instead.');
  }

  /**
   * Update service
   */
  async updateService(id: string, updateServiceDto: UpdateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if new name conflicts with existing service globally
    if (updateServiceDto.name && updateServiceDto.name !== service.name) {
      const existingService = await this.prisma.service.findFirst({
        where: { 
          name: updateServiceDto.name,
          id: { not: id }
        }
      });
      if (existingService) {
        throw new ConflictException('Service with this name already exists');
      }
    }

    // Validate duration if provided
    if (updateServiceDto.duration && (updateServiceDto.duration < 15 || updateServiceDto.duration > 480)) {
      throw new BadRequestException('Duration must be between 15 and 480 minutes');
    }

    // Validate base price if provided
    if (updateServiceDto.basePrice) {
      const price = parseFloat(updateServiceDto.basePrice);
      if (isNaN(price) || price <= 0) {
        throw new BadRequestException('Base price must be a positive number');
      }
    }

    // Update service
    const updatedService = await this.prisma.service.update({
      where: { id },
      data: updateServiceDto
    });

    return updatedService;
  }

  /**
   * Delete service
   */
  async deleteService(id: string): Promise<void> {
    const service = await this.prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Services can now be deleted by any admin (removed doctor-specific validation)

    // Check if service has active appointments or bookings
    const [activeAppointments, activeBookings] = await Promise.all([
      this.prisma.appointment.count({
        where: { 
          serviceId: id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      this.prisma.booking.count({
        where: { 
          serviceId: id,
          status: { notIn: ['REJECTED', 'EXPIRED'] }
        }
      })
    ]);

    if (activeAppointments > 0 || activeBookings > 0) {
      throw new BadRequestException('Cannot delete service with active appointments or bookings');
    }

    // Delete the service
    await this.prisma.service.delete({
      where: { id }
    });
  }

  /**
   * Create doctor service relationship
   */
  async createDoctorService(createDoctorServiceDto: CreateDoctorServiceDto): Promise<DoctorServiceResponseDto> {
    const { doctorId, serviceId, customPrice } = createDoctorServiceDto;

    // Check if doctor exists and is active
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, isActive: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (!doctor.isActive) {
      throw new BadRequestException('Doctor is not active');
    }

    // Check if service exists and is active
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, isActive: true }
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    // Check if relationship already exists
    const existingDoctorService = await this.prisma.doctorService.findUnique({
      where: {
        doctorId_serviceId: {
          doctorId,
          serviceId
        }
      }
    });
    if (existingDoctorService) {
      throw new ConflictException('Doctor already offers this service');
    }

    // Validate custom price
    const servicePrice = parseFloat(customPrice);
    if (isNaN(servicePrice) || servicePrice <= 0) {
      throw new BadRequestException('Custom price must be a positive number');
    }

    // Create doctor service relationship
    const doctorService = await this.prisma.doctorService.create({
      data: {
        doctorId,
        serviceId,
        customPrice,
        isAvailable: true
      }
    });

    return doctorService;
  }

  /**
   * Update doctor service relationship
   */
  async updateDoctorService(
    doctorId: string,
    serviceId: string,
    updateDoctorServiceDto: UpdateDoctorServiceDto
  ): Promise<DoctorServiceResponseDto> {
    const doctorService = await this.prisma.doctorService.findUnique({
      where: {
        doctorId_serviceId: {
          doctorId,
          serviceId
        }
      }
    });

    if (!doctorService) {
      throw new NotFoundException('Doctor service relationship not found');
    }

    // Validate custom price if provided
    if (updateDoctorServiceDto.customPrice) {
      const price = parseFloat(updateDoctorServiceDto.customPrice);
      if (isNaN(price) || price <= 0) {
        throw new BadRequestException('Custom price must be a positive number');
      }
    }

    const updatedDoctorService = await this.prisma.doctorService.update({
      where: {
        doctorId_serviceId: {
          doctorId,
          serviceId
        }
      },
      data: updateDoctorServiceDto
    });

    return updatedDoctorService;
  }

  /**
   * Get doctor service with relations
   */
  async getDoctorServiceWithRelations(
    doctorId: string,
    serviceId: string
  ): Promise<DoctorServiceWithRelationsDto> {
    const doctorService = await this.prisma.doctorService.findUnique({
      where: {
        doctorId_serviceId: {
          doctorId,
          serviceId
        }
      },
      include: {
        doctor: {
          select: {
            id: true,
            specialization: true,
            firstName: true,
            lastName: true,
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            duration: true,
            basePrice: true,
          }
        }
      }
    });

    if (!doctorService) {
      throw new NotFoundException('Doctor service relationship not found');
    }

    return doctorService;
  }

  /**
   * Get all services offered by a doctor
   */
  async getDoctorServices(doctorId: string): Promise<DoctorServiceWithRelationsDto[]> {
    // Check if doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.doctorService.findMany({
      where: { doctorId },
      include: {
        doctor: {
          select: {
            id: true,
            specialization: true,
            firstName: true,
            lastName: true,
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            duration: true,
            basePrice: true,
          }
        }
      },
      orderBy: { service: { name: 'asc' } }
    });
  }

  /**
   * Get service categories
   */
  async getServiceCategories(): Promise<string[]> {
    const categories = await this.prisma.service.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    });

    return categories.map(c => c.category);
  }

  /**
   * Get service statistics
   */
  async getServiceStats(): Promise<any> {
    const [totalServices, activeServices, totalCategories] = await Promise.all([
      this.prisma.service.count(),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.service.groupBy({
        by: ['category'],
        _count: { category: true }
      })
    ]);

    // Get most popular services
    const popularServices = await this.prisma.service.findMany({
      include: {
        _count: {
          select: {
            doctorServices: true,
            appointments: true
          }
        }
      },
      orderBy: [
        { appointments: { _count: 'desc' } },
        { doctorServices: { _count: 'desc' } }
      ],
      take: 10
    });

    return {
      total: totalServices,
      active: activeServices,
      inactive: totalServices - activeServices,
      categories: totalCategories.length,
      activationRate: totalServices > 0 ? (activeServices / totalServices) * 100 : 0,
      popularServices: popularServices.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        doctorCount: s._count.doctorServices,
        appointmentCount: s._count.appointments
      }))
    };
  }

  /**
   * Search services
   */
  async searchServices(searchTerm: string, filters?: any): Promise<ServiceResponseDto[]> {
    const where: any = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } }
      ],
      isActive: true
    };

    if (filters?.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters?.doctorId) {
      where.doctorServices = {
        some: {
          doctorId: filters.doctorId,
          isAvailable: true
        }
      };
    }

    return this.prisma.service.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      take: 20
    });
  }

  /**
   * Bulk update service status
   */
  async bulkUpdateServiceStatus(serviceIds: string[], isActive: boolean): Promise<number> {
    const result = await this.prisma.service.updateMany({
      where: {
        id: { in: serviceIds }
      },
      data: { isActive }
    });

    return result.count;
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(category: string): Promise<ServiceResponseDto[]> {
    return this.prisma.service.findMany({
      where: {
        category: { contains: category, mode: 'insensitive' },
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getPrimaryServices(): Promise<any> {
    return this.prisma.primaryService.findMany();
  }
}
