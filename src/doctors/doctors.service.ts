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
      consultationFee
      // workingHours - removed, now using WorkingHours model
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

    // Working hours validation removed - now using WorkingHours model

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
        // workingHours removed - now using WorkingHours model
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

    // Working hours validation removed - now using WorkingHours model

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

    // Working hours logic removed - now using WorkingHours model
    // This method should be updated to use the new working hours system

    return {
      doctor: {
        id: doctor.id,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee,
        // workingHours removed - now using WorkingHours model
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
        // workingHours removed - now using WorkingHours model
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

  // validateWorkingHours method removed - now using WorkingHours model

  /**
   * Get dashboard statistics for a doctor
   */
  async getDashboardStats(doctorId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's appointments
    const todaysAppointments = await this.prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Get upcoming appointments (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingAppointments = await this.prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: {
          gte: tomorrow,
          lt: nextWeek
        },
        status: {
          in: ['CONFIRMED', 'PENDING']
        }
      }
    });

    // Get no-show appointments today
    const noShowToday = await this.prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'NO_SHOW'
      }
    });

    // Get patients in queue (appointments with status IN_PROGRESS or CHECKED_IN)
    const patientsInQueue = await this.prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['IN_PROGRESS']
        }
      }
    });

    // Get labs to review (this would need to be implemented based on your lab results system)
    const labsToReview = 0; // Placeholder - implement based on your lab results system

    // Get messages awaiting reply
    const messagesAwaitingReply = await this.prisma.message.count({
      where: {
        receiverId: doctorId,
        receiverType: 'doctor',
        isRead: false
      }
    });

    // Calculate urgent tasks
    const urgentTasks: string[] = [];
    if (labsToReview > 0) urgentTasks.push(`${labsToReview} overdue labs`);
    if (noShowToday > 0) urgentTasks.push(`${noShowToday} no-show`);
    if (messagesAwaitingReply > 0) urgentTasks.push(`${messagesAwaitingReply} unread messages`);

    const urgentTasksSummary = urgentTasks.length > 0 ? urgentTasks.join(', ') : 'No urgent tasks';
    const hasUrgentTasks = urgentTasks.length > 0;

    return {
      todaysAppointments,
      labsToReview,
      messagesAwaitingReply,
      upcomingAppointments,
      patientsInQueue,
      noShowToday,
      urgentTasksSummary,
      hasUrgentTasks
    };
  }

  /**
   * Get patients for a doctor
   */
  async getDoctorPatients(doctorId: string, query: { search?: string; page: number; limit: number }): Promise<any> {
    const { search, page, limit } = query;
    const skip = (page - 1) * limit;

    // First, get all unique patient IDs who have appointments with this doctor
    const patientAppointments = await this.prisma.appointment.findMany({
      where: { doctorId },
      select: { patientId: true },
      distinct: ['patientId']
    });

    const patientIds = patientAppointments.map(apt => apt.patientId);

    if (patientIds.length === 0) {
      return {
        patients: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }

    // Build search conditions
    const where: any = {
      id: { in: patientIds }
    };

    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          primaryEmail: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Get patients with their latest appointment info
    const [patients, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryEmail: true,
          primaryPhone: true,
          dateOfBirth: true,
        },
        skip,
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      }),
      this.prisma.user.count({ where })
    ]);

    // Get latest appointment info for each patient
    const patientsWithAppointments = await Promise.all(
      patients.map(async (patient) => {
        const latestAppointment = await this.prisma.appointment.findFirst({
          where: {
            doctorId,
            patientId: patient.id
          },
          orderBy: {
            appointmentDate: 'desc'
          },
          select: {
            appointmentDate: true,
            appointmentTime: true,
            status: true,
            service: {
              select: {
                name: true
              }
            }
          }
        });

        // Calculate age
        const age = patient.dateOfBirth ? this.calculateAge(patient.dateOfBirth) : 0;

        return {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          age,
          mrn: patient.id.substring(0, 8), // Use first 8 characters of ID as MRN
          lastVisit: latestAppointment ? this.formatDate(latestAppointment.appointmentDate) : 'N/A',
          lastVisitTime: latestAppointment?.appointmentTime || 'N/A',
          lastVisitStatus: latestAppointment?.status || 'N/A',
          lastVisitPurpose: latestAppointment?.service?.name || 'N/A',
          email: patient.primaryEmail,
          phone: patient.primaryPhone,
          dateOfBirth: patient.dateOfBirth,
        };
      })
    );

    return {
      patients: patientsWithAppointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
