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

    // Build search conditions for appointments
    const where: any = {
      doctorId
    };

    if (search) {
      where.OR = [
        {
          patient: {
            firstName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          patient: {
            lastName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          patient: {
            primaryEmail: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];

      // Check if search looks like a date (contains digits and dashes/slashes)
      if (/[\d\-\/]/.test(search)) {
        where.OR.push({
          patient: {
            dateOfBirth: {
              not: null
            }
          }
        });
      }
    }

    // Get all appointments with patient info and medical forms
    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              primaryEmail: true,
              primaryPhone: true,
              dateOfBirth: true,
            }
          },
          service: {
            select: {
              name: true
            }
          },
          medicalForm: true
        },
        orderBy: [
          { appointmentDate: 'desc' },
          { appointmentTime: 'desc' }
        ]
      }),
      this.prisma.appointment.count({ where })
    ]);

    // Filter by DOB if search contains date-like patterns (client-side filtering)
    let filteredAppointments = appointments;
    if (search && /[\d\-\/]/.test(search)) {
      filteredAppointments = appointments.filter(apt => {
        if (!apt.patient.dateOfBirth) return false;
        const dobString = apt.patient.dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
        const dobDisplay = new Date(apt.patient.dateOfBirth).toLocaleDateString(); // MM/DD/YYYY
        return dobString.includes(search) || dobDisplay.includes(search);
      });
    }

    // Helper function to check if appointment has passed
    const hasAppointmentPassed = (appointmentDate: Date, appointmentTime: string): boolean => {
      const now = new Date();
      const aptDate = new Date(appointmentDate);
      
      // Parse the time (HH:MM format)
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      aptDate.setHours(hours, minutes, 0, 0);
      
      return aptDate < now;
    };

    // Group appointments by patient
    const patientMap = new Map<string, any>();
    
    filteredAppointments.forEach((appointment) => {
      const patient = appointment.patient;
      const patientId = patient.id;

      if (!patientMap.has(patientId)) {
        const age = patient.dateOfBirth ? this.calculateAge(patient.dateOfBirth) : 0;
        
        patientMap.set(patientId, {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          age,
          mrn: patient.id.substring(0, 8),
          email: patient.primaryEmail,
          phone: patient.primaryPhone,
          dateOfBirth: patient.dateOfBirth,
          appointments: [],
          totalAppointments: 0,
          lastVisit: '-',
          lastVisitTime: 'N/A',
          lastVisitStatus: 'N/A',
          lastVisitPurpose: 'N/A',
          appointmentId: null,
          appointmentDate: null,
          appointmentTime: null,
          appointmentStatus: null,
          medicalForm: null,
        });
      }

      const patientData = patientMap.get(patientId);
      patientData.appointments.push({
        id: appointment.id,
        date: this.formatDate(appointment.appointmentDate),
        time: appointment.appointmentTime || 'N/A',
        status: appointment.status || 'N/A',
        purpose: appointment.service?.name || 'N/A',
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        medicalForm: appointment.medicalForm,
      });
      patientData.totalAppointments = patientData.appointments.length;

      // Check if this appointment has passed and update last visit if it's the first (most recent) past appointment
      // Since appointments are ordered DESC, the first one that has passed is the most recent past appointment
      const appointmentHasPassed = hasAppointmentPassed(appointment.appointmentDate, appointment.appointmentTime);
      
      if (appointmentHasPassed && patientData.lastVisit === '-') {
        // This is the most recent past appointment (first one in DESC order that has passed)
        patientData.lastVisit = this.formatDate(appointment.appointmentDate);
        patientData.lastVisitTime = appointment.appointmentTime || 'N/A';
        patientData.lastVisitStatus = appointment.status || 'N/A';
        patientData.lastVisitPurpose = appointment.service?.name || 'N/A';
        patientData.appointmentId = appointment.id;
        patientData.appointmentDate = appointment.appointmentDate;
        patientData.appointmentTime = appointment.appointmentTime;
        patientData.appointmentStatus = appointment.status;
        patientData.medicalForm = appointment.medicalForm;
        
        console.log(`Set last visit for ${patientData.name}: ${patientData.lastVisit} at ${patientData.lastVisitTime}`);
      }
    });

    // Convert map to array and paginate
    const allPatients = Array.from(patientMap.values());
    const totalUniquePatients = allPatients.length;
    const paginatedPatients = allPatients.slice(skip, skip + limit);

    console.log('Total unique patients:', totalUniquePatients);
    console.log('Patients with last visits:', paginatedPatients.map(p => ({
      name: p.name,
      lastVisit: p.lastVisit,
      totalAppointments: p.totalAppointments
    })));

    return {
      patients: paginatedPatients,
      total: totalUniquePatients,
      page,
      limit,
      totalPages: Math.ceil(totalUniquePatients / limit)
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
