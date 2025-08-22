import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  QueryBookingsDto,
  RespondToBookingDto,
  BookingResponseDto,
  BookingWithRelationsResponseDto,
} from './dto';
import { BookingStatus, UrgencyLevel } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new booking request
   */
  async createBooking(createBookingDto: CreateBookingDto): Promise<BookingResponseDto> {
    const {
      patientId,
      doctorId,
      serviceId,
      preferredDate,
      preferredTime,
      alternativeDates,
      alternativeTimes,
      patientNotes,
      symptoms,
      urgency
    } = createBookingDto;

    // Validate preferred date is not in the past
    const preferredDateTime = new Date(`${preferredDate}T${preferredTime}`);
    if (preferredDateTime < new Date()) {
      throw new BadRequestException('Preferred date and time cannot be in the past');
    }

    // Check if patient exists and is active
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, isActive: true }
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    if (!patient.isActive) {
      throw new BadRequestException('Patient account is not active');
    }

    // Check if doctor exists and is available
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, isAvailable: true, isActive: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (!doctor.isAvailable || !doctor.isActive) {
      throw new BadRequestException('Doctor is not available for bookings');
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

    // Check if doctor offers this service
    const doctorService = await this.prisma.doctorService.findUnique({
      where: {
        doctorId_serviceId: {
          doctorId,
          serviceId
        }
      },
      select: { id: true, isAvailable: true }
    });
    if (!doctorService) {
      throw new BadRequestException('Doctor does not offer this service');
    }
    if (!doctorService.isAvailable) {
      throw new BadRequestException('Doctor is not available for this service');
    }

    // Check for existing pending booking from same patient to same doctor
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        patientId,
        doctorId,
        status: BookingStatus.PENDING
      }
    });
    if (existingBooking) {
      throw new ConflictException('Patient already has a pending booking with this doctor');
    }

    // Set expiration time (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        patientId,
        doctorId,
        serviceId,
        preferredDate: new Date(preferredDate),
        preferredTime,
        alternativeDates: alternativeDates ? alternativeDates.map(date => new Date(date)) : [],
        alternativeTimes: alternativeTimes || [],
        patientNotes,
        symptoms,
        urgency: urgency || UrgencyLevel.ROUTINE,
        status: BookingStatus.PENDING,
        expiresAt
      }
    });

    return booking;
  }

  /**
   * Get booking by ID
   */
  async findById(id: string): Promise<BookingWithRelationsResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            primaryPhone: true,
          }
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
            licenseNumber: true,
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
          }
        }
      }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Get bookings with filtering and pagination
   */
  async findAll(query: QueryBookingsDto): Promise<{ bookings: BookingWithRelationsResponseDto[], total: number }> {
    const { patientId, doctorId, serviceId, status, urgency, startDate, endDate, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (startDate || endDate) {
      where.preferredDate = {};
      if (startDate) where.preferredDate.gte = new Date(startDate);
      if (endDate) where.preferredDate.lte = new Date(endDate);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              primaryEmail: true,
              primaryPhone: true,
            }
          },
          doctor: {
            select: {
              id: true,
              specialization: true,
              licenseNumber: true,
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
            }
          }
        },
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' }
      }),
      this.prisma.booking.count({ where })
    ]);

    return { bookings, total };
  }

  /**
   * Update booking
   */
  async updateBooking(id: string, updateBookingDto: UpdateBookingDto): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Prevent updates to approved, rejected, or expired bookings
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Cannot update non-pending bookings');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateBookingDto
    });

    return updatedBooking;
  }

  /**
   * Doctor responds to booking request
   */
  async respondToBooking(id: string, doctorId: string, respondToBookingDto: RespondToBookingDto): Promise<BookingResponseDto> {
    const { doctorNotes, suggestedDate, suggestedTime } = respondToBookingDto;

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { doctor: { select: { id: true } } }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Ensure only the requested doctor can respond
    if (booking.doctorId !== doctorId) {
      throw new BadRequestException('Only the requested doctor can respond to this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only respond to pending bookings');
    }

    // Validate suggested date if provided
    if (suggestedDate) {
      const suggestedDateTime = new Date(suggestedDate);
      if (suggestedDateTime < new Date()) {
        throw new BadRequestException('Suggested date cannot be in the past');
      }
    }

    // Update booking with doctor's response
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        doctorNotes,
        suggestedDate: suggestedDate ? new Date(suggestedDate) : null,
        suggestedTime,
        respondedAt: new Date(),
        status: suggestedDate && suggestedTime ? BookingStatus.APPROVED : BookingStatus.PENDING
      }
    });

    return updatedBooking;
  }

  /**
   * Approve booking
   */
  async approveBooking(id: string, doctorId: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { doctor: { select: { id: true } } }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.doctorId !== doctorId) {
      throw new BadRequestException('Only the requested doctor can approve this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only approve pending bookings');
    }

    if (!booking.suggestedDate || !booking.suggestedTime) {
      throw new BadRequestException('Must provide suggested date and time before approving');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.APPROVED,
        respondedAt: new Date()
      }
    });

    return updatedBooking;
  }

  /**
   * Reject booking
   */
  async rejectBooking(id: string, doctorId: string, reason?: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { doctor: { select: { id: true } } }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.doctorId !== doctorId) {
      throw new BadRequestException('Only the requested doctor can reject this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Can only reject pending bookings');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.REJECTED,
        doctorNotes: reason || 'Booking rejected by doctor',
        respondedAt: new Date()
      }
    });

    return updatedBooking;
  }

  /**
   * Convert booking to appointment
   */
  async convertToAppointment(id: string, slotId: string): Promise<{ booking: BookingResponseDto, appointmentId: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        doctor: { select: { id: true } },
        service: { select: { duration: true, basePrice: true } }
      }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Can only convert approved bookings to appointments');
    }

    // Check if slot exists and is available
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      select: { id: true, isAvailable: true, startTime: true, schedule: { select: { doctorId: true, date: true } } }
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (!slot.isAvailable) {
      throw new BadRequestException('Selected slot is not available');
    }

    if (slot.schedule.doctorId !== booking.doctorId) {
      throw new BadRequestException('Selected slot does not belong to the requested doctor');
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          patientId: booking.patientId,
          doctorId: booking.doctorId,
          serviceId: booking.serviceId,
          slotId: slot.id,
          appointmentDate: slot.schedule.date,
          appointmentTime: slot.startTime,
          duration: booking.service.duration,
          amount: booking.service.basePrice,
          status: 'PENDING',
          scheduledAt: new Date(),
          patientNotes: booking.patientNotes,
          symptoms: booking.symptoms
        }
      });

      // Mark slot as unavailable
      await prisma.slot.update({
        where: { id: slot.id },
        data: { isAvailable: false }
      });

      // Update booking status
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONVERTED_TO_APPOINTMENT,
          respondedAt: new Date()
        }
      });

      return { booking: updatedBooking, appointmentId: appointment.id };
    });

    return result;
  }

  /**
   * Get patient bookings
   */
  async getPatientBookings(patientId: string, query: QueryBookingsDto): Promise<{ bookings: BookingWithRelationsResponseDto[], total: number }> {
    const queryWithPatient = { ...query, patientId };
    return this.findAll(queryWithPatient);
  }

  /**
   * Get doctor bookings
   */
  async getDoctorBookings(doctorId: string, query: QueryBookingsDto): Promise<{ bookings: BookingWithRelationsResponseDto[], total: number }> {
    const queryWithDoctor = { ...query, doctorId };
    return this.findAll(queryWithDoctor);
  }

  /**
   * Get pending bookings for a doctor
   */
  async getPendingBookings(doctorId: string): Promise<BookingWithRelationsResponseDto[]> {
    return this.prisma.booking.findMany({
      where: {
        doctorId,
        status: BookingStatus.PENDING
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            primaryPhone: true,
          }
        },
        doctor: {
          select: {
            id: true,
            licenseNumber: true,
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
          }
        }
      },
      orderBy: [
        { urgency: 'desc' },
        { requestedAt: 'asc' }
      ]
    });
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(doctorId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (doctorId) where.doctorId = doctorId;
    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = startDate;
      if (endDate) where.requestedAt.lte = endDate;
    }

    const [total, pending, approved, rejected, converted] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.APPROVED } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.REJECTED } }),
      this.prisma.booking.count({ where: { ...where, status: BookingStatus.CONVERTED_TO_APPOINTMENT } })
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      converted,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
      conversionRate: total > 0 ? (converted / total) * 100 : 0
    };
  }

  /**
   * Clean up expired bookings
   */
  async cleanupExpiredBookings(): Promise<number> {
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        expiresAt: { lt: new Date() }
      }
    });

    if (expiredBookings.length > 0) {
      await this.prisma.booking.updateMany({
        where: {
          id: { in: expiredBookings.map(b => b.id) }
        },
        data: {
          status: BookingStatus.EXPIRED
        }
      });
    }

    return expiredBookings.length;
  }

  /**
   * Delete booking (admin only)
   */
  async deleteBooking(id: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only allow deletion of expired or rejected bookings
    if (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.APPROVED) {
      throw new BadRequestException('Only expired or rejected bookings can be deleted');
    }

    await this.prisma.booking.delete({
      where: { id }
    });
  }
}
