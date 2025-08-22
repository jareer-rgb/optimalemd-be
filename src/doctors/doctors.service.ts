import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDoctorDto,
  UpdateDoctorDto,
  QueryDoctorsDto,
  DoctorResponseDto,
  DoctorWithUserResponseDto,
  DoctorWithServicesResponseDto,
} from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create doctor profile
   */
  async createDoctor(createDoctorDto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const {
      email,
      password,
      title,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      completeAddress,
      city,
      state,
      zipcode,
      alternativeEmail,
      primaryPhone,
      alternativePhone,
      licenseNumber,
      specialization,
      qualifications,
      experience,
      bio,
      consultationFee,
      workingHours
    } = createDoctorDto;

    // Check if email is already taken
    const existingDoctor = await this.prisma.doctor.findUnique({
      where: { email }
    });
    if (existingDoctor) {
      throw new ConflictException('Email is already registered');
    }

    // Check if license number is already taken
    const existingLicense = await this.prisma.doctor.findUnique({
      where: { licenseNumber }
    });
    if (existingLicense) {
      throw new ConflictException('License number is already registered');
    }

    // Validate working hours JSON
    let parsedWorkingHours;
    try {
      parsedWorkingHours = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
    } catch (error) {
      throw new BadRequestException('Invalid working hours format');
    }

    // Validate working hours structure
    if (!this.validateWorkingHours(parsedWorkingHours)) {
      throw new BadRequestException('Invalid working hours structure');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create doctor profile
    const doctor = await this.prisma.doctor.create({
      data: {
        email,
        password: hashedPassword,
        title,
        firstName,
        middleName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        completeAddress,
        city,
        state,
        zipcode,
        alternativeEmail,
        primaryPhone,
        alternativePhone,
        licenseNumber,
        specialization,
        qualifications,
        experience,
        bio,
        consultationFee: parseFloat(consultationFee),
        workingHours: parsedWorkingHours,
        isAvailable: true,
        isActive: true,
        isVerified: false
      }
    });

    return doctor;
  }

  /**
   * Get doctor by ID
   */
  async findById(id: string): Promise<DoctorWithUserResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  /**
   * Get doctor with services
   */
  async findByIdWithServices(id: string): Promise<DoctorWithServicesResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        services: {
          include: {
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
        }
      }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  /**
   * Get doctors with filtering and pagination
   */
  async findAll(query: QueryDoctorsDto): Promise<{ doctors: DoctorWithUserResponseDto[], total: number }> {
    const { specialization, city, state, isAvailable, isVerified, serviceId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (specialization) where.specialization = { contains: specialization, mode: 'insensitive' };
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
    if (isVerified !== undefined) where.isVerified = isVerified === 'true';

    // Filter by location
    if (city || state) {
      if (city) where.city = { contains: city, mode: 'insensitive' };
      if (state) where.state = { contains: state, mode: 'insensitive' };
    }

    // Filter by service
    if (serviceId) {
      where.services = {
        some: {
          serviceId,
          isAvailable: true
        }
      };
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { experience: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      this.prisma.doctor.count({ where })
    ]);

    return { doctors, total };
  }

  /**
   * Update doctor profile
   */
  async updateDoctor(id: string, updateDoctorDto: UpdateDoctorDto): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Prepare update data
    const updateData: any = { ...updateDoctorDto };

    // Convert date string to Date object if provided
    if (updateDoctorDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateDoctorDto.dateOfBirth);
    }

    // Convert consultation fee to number if provided
    if (updateDoctorDto.consultationFee) {
      updateData.consultationFee = parseFloat(updateDoctorDto.consultationFee);
    }

    // Validate working hours if provided
    if (updateDoctorDto.workingHours) {
      let parsedWorkingHours;
      try {
        parsedWorkingHours = typeof updateDoctorDto.workingHours === 'string' 
          ? JSON.parse(updateDoctorDto.workingHours) 
          : updateDoctorDto.workingHours;
      } catch (error) {
        throw new BadRequestException('Invalid working hours format');
      }

      if (!this.validateWorkingHours(parsedWorkingHours)) {
        throw new BadRequestException('Invalid working hours structure');
      }

      updateData.workingHours = parsedWorkingHours;
    }

    const updatedDoctor = await this.prisma.doctor.update({
      where: { id },
      data: updateData
    });

    return updatedDoctor;
  }

  /**
   * Get doctor availability for a specific date
   */
  async getDoctorAvailability(doctorId: string, date: string, serviceId?: string): Promise<any> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        services: serviceId ? {
          where: { serviceId, isAvailable: true },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                duration: true,
              }
            }
          }
        } : false
      }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (!doctor.isAvailable || !doctor.isActive) {
      throw new BadRequestException('Doctor is not available');
    }

    // Get schedules for the specified date
    const schedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        date: new Date(date),
        isAvailable: true
      },
      include: {
        slots: {
          where: { isAvailable: true },
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Parse working hours
    const workingHours = typeof doctor.workingHours === 'string' 
      ? JSON.parse(doctor.workingHours) 
      : doctor.workingHours;

    // Get day of week
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[dayOfWeek];

    const dayWorkingHours = workingHours[currentDay];

    return {
      doctor: {
        id: doctor.id,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee,
        workingHours: dayWorkingHours,
        services: doctor.services
      },
      schedules,
      availableSlots: schedules.flatMap(schedule => schedule.slots)
    };
  }

  /**
   * Get doctor schedule for a date range
   */
  async getDoctorSchedule(doctorId: string, startDate: string, endDate: string): Promise<any> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        slots: {
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    });

    return {
      doctor: {
        id: doctor.id,
        specialization: doctor.specialization,
        workingHours: doctor.workingHours
      },
      schedules
    };
  }

  /**
   * Search doctors by specialization or location
   */
  async searchDoctors(searchTerm: string, filters?: any): Promise<DoctorWithUserResponseDto[]> {
    const where: any = {
      OR: [
        { specialization: { contains: searchTerm, mode: 'insensitive' } },
        { city: { contains: searchTerm, mode: 'insensitive' } },
        { state: { contains: searchTerm, mode: 'insensitive' } }
      ],
      isActive: true,
      isAvailable: true
    };

    if (filters?.specialization) {
      where.specialization = { contains: filters.specialization, mode: 'insensitive' };
    }

    if (filters?.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters?.state) {
      where.state = { contains: filters.state, mode: 'insensitive' };
    }

    if (filters?.serviceId) {
      where.services = {
        some: {
          serviceId: filters.serviceId,
          isAvailable: true
        }
      };
    }

    return this.prisma.doctor.findMany({
      where,
      orderBy: [
        { isVerified: 'desc' },
        { experience: 'desc' }
      ],
      take: 20
    });
  }

  /**
   * Get doctor statistics
   */
  async getDoctorStats(doctorId?: string): Promise<any> {
    const where: any = {};
    if (doctorId) where.id = doctorId;

    const [totalDoctors, verifiedDoctors, availableDoctors] = await Promise.all([
      this.prisma.doctor.count(),
      this.prisma.doctor.count({ where: { isVerified: true } }),
      this.prisma.doctor.count({ where: { isAvailable: true, isActive: true } })
    ]);

    // Get specialization distribution
    const specializations = await this.prisma.doctor.groupBy({
      by: ['specialization'],
      _count: { specialization: true },
      orderBy: { _count: { specialization: 'desc' } },
      take: 10
    });

    return {
      total: totalDoctors,
      verified: verifiedDoctors,
      available: availableDoctors,
      verificationRate: totalDoctors > 0 ? (verifiedDoctors / totalDoctors) * 100 : 0,
      availabilityRate: totalDoctors > 0 ? (availableDoctors / totalDoctors) * 100 : 0,
      specializations: specializations.map(s => ({
        specialization: s.specialization,
        count: s._count.specialization
      }))
    };
  }

  /**
   * Verify doctor profile
   */
  async verifyDoctor(id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.isVerified) {
      throw new BadRequestException('Doctor is already verified');
    }

    const updatedDoctor = await this.prisma.doctor.update({
      where: { id },
      data: { isVerified: true }
    });

    return updatedDoctor;
  }

  /**
   * Delete doctor profile
   */
  async deleteDoctor(id: string): Promise<void> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        appointments: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
        schedules: { include: { slots: true } }
      }
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Check if doctor has active appointments
    if (doctor.appointments.length > 0) {
      throw new BadRequestException('Cannot delete doctor with active appointments');
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (prisma) => {
      // Delete all schedules and slots
      for (const schedule of doctor.schedules) {
        await prisma.slot.deleteMany({
          where: { scheduleId: schedule.id }
        });
      }
      await prisma.schedule.deleteMany({
        where: { doctorId: id }
      });

      // Delete doctor services
      await prisma.doctorService.deleteMany({
        where: { doctorId: id }
      });

      // Delete doctor profile
      await prisma.doctor.delete({
        where: { id }
      });
    });
  }

  /**
   * Validate working hours structure
   */
  private validateWorkingHours(workingHours: any): boolean {
    if (!workingHours || typeof workingHours !== 'object') {
      return false;
    }

    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    for (const day of requiredDays) {
      if (!workingHours[day]) {
        return false;
      }

      const dayHours = workingHours[day];
      if (typeof dayHours !== 'object' || !dayHours.start || !dayHours.end) {
        return false;
      }

      if (!timeRegex.test(dayHours.start) || !timeRegex.test(dayHours.end)) {
        return false;
      }

      // Handle days off (same start and end time, like "00:00")
      if (dayHours.start === dayHours.end) {
        // This is a valid day off
        continue;
      }

      // Validate that start time is before end time for working days
      const startTime = new Date(`2000-01-01T${dayHours.start}`);
      const endTime = new Date(`2000-01-01T${dayHours.end}`);
      
      if (startTime >= endTime) {
        return false;
      }
    }

    return true;
  }
}
