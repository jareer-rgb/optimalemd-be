import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  QueryAppointmentsDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
  AppointmentResponseDto,
  AppointmentWithRelationsResponseDto,
} from './dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private googleCalendarService: GoogleCalendarService
  ) {}

  /**
   * Create a temporary appointment for payment processing
   */
  async createTemporaryAppointment(createAppointmentDto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const { patientId, doctorId, serviceId, slotId, appointmentDate, appointmentTime, duration, patientNotes, symptoms, amount, primaryServiceId, selectedSlotTime } = createAppointmentDto;

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
    // Note: We don't check hasCompletedMedicalForm here because the patient only needs to complete Screen 2
    // before booking. The full medical form is completed AFTER booking the first appointment.

    // Check if doctor exists and is active (only if doctorId is provided)
    if (doctorId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, isActive: true, isAvailable: true }
      });
      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }
      if (!doctor.isActive || !doctor.isAvailable) {
        throw new BadRequestException('Doctor is not available');
      }
    }

    // Check if service exists and is active
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, isActive: true, duration: true }
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    // Check if slot exists and is available (only if slotId is provided)
    let slot: any = null;
    if (slotId) {
      slot = await this.prisma.slot.findUnique({
        where: { id: slotId },
        include: { schedule: true }
      });
      if (!slot) {
        throw new NotFoundException('Slot not found');
      }
      if (!slot.isAvailable) {
        throw new BadRequestException('Slot is not available');
      }

      // Check if slot duration is sufficient for service
      const slotStart = new Date(`2000-01-01T${slot.startTime}`);
      const slotEnd = new Date(`2000-01-01T${slot.endTime}`);
      const slotDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
      if (slotDuration < service.duration) {
        throw new BadRequestException('Slot duration is insufficient for this service');
      }
    }

    // Check if appointment date is not in the past
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime < new Date()) {
      throw new BadRequestException('Appointment date and time cannot be in the past');
    }

    // Check for double booking (doctor) - only if doctorId is provided
    if (doctorId) {
      const existingDoctorAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate: new Date(appointmentDate),
          appointmentTime,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
          }
        }
      });
      if (existingDoctorAppointment) {
        throw new ConflictException('Doctor already has an appointment at this time');
      }
    }

    // Create temporary appointment with PENDING status
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        serviceId,
        slotId,
        primaryServiceId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        selectedSlotTime,
        duration,
        patientNotes,
        symptoms,
        amount,
        status: AppointmentStatus.PENDING,
        isPaid: false,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
          },
        },
        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return appointment;
  }

  /**
   * Create a new appointment
   */
  async createAppointment(createAppointmentDto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const { patientId, doctorId, serviceId, slotId, appointmentDate, appointmentTime, duration, patientNotes, symptoms, amount, primaryServiceId } = createAppointmentDto;

    // Check if patient exists and is active
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, isActive: true, hasCompletedMedicalForm: true }
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    if (!patient.isActive) {
      throw new BadRequestException('Patient account is not active');
    }
    if (!patient.hasCompletedMedicalForm) {
      throw new BadRequestException('Patient must complete the medical consultation form before booking appointments. Please complete the form and try again.');
    }

    // Check if doctor exists and is active
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, isActive: true, isAvailable: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (!doctor.isActive || !doctor.isAvailable) {
      throw new BadRequestException('Doctor is not available');
    }

    // Check if service exists and is active
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, isActive: true, duration: true }
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    // Check if slot exists and is available
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { schedule: true }
    });
    if (!slot) {
      throw new NotFoundException('Slot not found');
    }
    if (!slot.isAvailable) {
      throw new BadRequestException('Slot is not available');
    }

    // Check if slot duration is sufficient for service
    const slotStart = new Date(`2000-01-01T${slot.startTime}`);
    const slotEnd = new Date(`2000-01-01T${slot.endTime}`);
    const slotDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
    if (slotDuration < service.duration) {
      throw new BadRequestException('Slot duration is insufficient for this service');
    }

    // Check if appointment date is not in the past
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime < new Date()) {
      throw new BadRequestException('Appointment date and time cannot be in the past');
    }

    // Check for double booking (doctor)
    const existingDoctorAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
        }
      }
    });
    if (existingDoctorAppointment) {
      throw new ConflictException('Doctor already has an appointment at this time');
    }

    console.log(`✅ Slot ${slotId} made available again after cancellation`);

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        serviceId,
        slotId,
        primaryServiceId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        duration,
        status: AppointmentStatus.PENDING,
        patientNotes,
        symptoms,
        amount,
        isPaid: false,
        scheduledAt: new Date()
      }
    });

    // Update slot availability
    await this.prisma.slot.update({
      where: { id: slotId },
      data: { isAvailable: false }
    });

    return appointment;
  }

  /**
   * Get appointment by ID with relations
   */
  async findById(id: string): Promise<AppointmentWithRelationsResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            primaryPhone: true
          }
        },
        doctor: {
          select: {
            id: true,
            licenseNumber: true,
            specialization: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            category: true
          }
        },
        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            schedule: {
              select: {
                date: true
              }
            }
          }
        },
        medicalForm: true // Include medical form data
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  /**
   * Get all appointments with filtering and pagination
   */
  async findAll(query: QueryAppointmentsDto): Promise<{ appointments: AppointmentWithRelationsResponseDto[], total: number }> {
    const { patientId, doctorId, serviceId, status, startDate, endDate, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate);
      if (endDate) where.appointmentDate.lte = new Date(endDate);
    }

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
              primaryPhone: true
            }
          },
          doctor: {
            select: {
              id: true,
              licenseNumber: true,
              specialization: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              category: true
            }
          },
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              schedule: {
                select: {
                  date: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { appointmentDate: 'asc' },
          { appointmentTime: 'asc' }
        ]
      }),
      this.prisma.appointment.count({ where })
    ]);

    return { appointments, total };
  }

  /**
   * Update appointment
   */
  async updateAppointment(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment can be updated
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be updated');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cancelled appointments cannot be updated');
    }

    // Update status-specific fields
    const updateData: any = { ...updateAppointmentDto };

    if (updateData.status) {
      if (updateData.status === AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.CONFIRMED) {
        updateData.confirmedAt = new Date();
      } else if (updateData.status === AppointmentStatus.COMPLETED && (appointment.status as AppointmentStatus) !== AppointmentStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (updateData.status === AppointmentStatus.CANCELLED && (appointment.status as AppointmentStatus) !== AppointmentStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
      }
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData
    });

    return updatedAppointment;
  }

  /**
   * Update internal notes for an appointment (doctor only)
   */
  async updateInternalNotes(appointmentId: string, internalNotes: string, doctorId: string): Promise<AppointmentResponseDto> {
    // Check if appointment exists and belongs to the doctor
    const appointment = await this.prisma.appointment.findFirst({
      where: { 
        id: appointmentId,
        doctorId: doctorId
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found or you do not have permission to update this appointment');
    }

    // Update the internal notes
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { internalNotes }
    });

    return updatedAppointment;
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(id: string, cancelAppointmentDto: CancelAppointmentDto): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { 
        slot: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment can be cancelled
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be cancelled');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    // Check cancellation window (1 hour before appointment as per requirements)
    const appointmentDateTime = new Date(`${appointment.appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 1) {
      throw new BadRequestException('Appointments can only be cancelled at least 1 hour in advance');
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Cancel appointment
      const cancelledAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: cancelAppointmentDto.cancellationReason,
          cancelledAt: new Date()
        }
      });

      // Make slot available again (if slotId exists)
      if (appointment.slotId) {
        const updatedSlot = await prisma.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true }
        });
        console.log(`✅ Slot ${appointment.slotId} made available again after cancellation`);
        console.log(`📅 Slot details:`, {
          id: updatedSlot.id,
          startTime: updatedSlot.startTime,
          endTime: updatedSlot.endTime,
          isAvailable: updatedSlot.isAvailable
        });
      }

      return cancelledAppointment;
    });

    // Send email notifications
    try {
      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
      const doctorName = appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'To be assigned';
      const appointmentDate = appointment.appointmentDate.toISOString().split('T')[0];
      const amount = appointment.amount.toString();

      // Send cancellation email to patient
      await this.mailerService.sendCancellationEmail(
        appointment.patient.primaryEmail,
        patientName,
        doctorName,
        appointmentDate,
        appointment.appointmentTime,
        amount
      );

      // Send cancellation notification to doctor with refund request (if doctor exists)
      if (appointment.doctor) {
        await this.mailerService.sendDoctorCancellationNotification(
          appointment.doctor.email,
          doctorName,
          patientName,
          appointment.patient.primaryEmail,
          appointmentDate,
          appointment.appointmentTime,
          amount
        );
      }
    } catch (error) {
      console.error('Failed to send cancellation emails:', error);
      // Don't throw error to avoid breaking the cancellation process
    }

    return result;
  }

  /**
   * Reschedule appointment
   */
  async rescheduleAppointment(id: string, rescheduleAppointmentDto: RescheduleAppointmentDto): Promise<AppointmentResponseDto> {
    const { newSlotId, reason } = rescheduleAppointmentDto;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { 
        slot: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment can be rescheduled
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be rescheduled');
    }

    // Check if new slot exists and is available
    const newSlot = await this.prisma.slot.findUnique({
      where: { id: newSlotId },
      include: { schedule: true }
    });
    if (!newSlot) {
      throw new NotFoundException('New slot not found');
    }
    if (!newSlot.isAvailable) {
      throw new BadRequestException('New slot is not available');
    }

    // Check if new slot duration is sufficient
    const service = await this.prisma.service.findUnique({
      where: { id: appointment.serviceId },
      select: { duration: true }
    });
    if (service) {
      const slotStart = new Date(`2000-01-01T${newSlot.startTime}`);
      const slotEnd = new Date(`2000-01-01T${newSlot.endTime}`);
      const slotDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
      if (slotDuration < service.duration) {
        throw new BadRequestException('New slot duration is insufficient for this service');
      }
    }

    // Store old appointment details for email
    const oldDate = appointment.appointmentDate.toISOString().split('T')[0];
    const oldTime = appointment.appointmentTime;
    const newDate = newSlot.schedule.date.toISOString().split('T')[0];
    const newTime = newSlot.startTime;

    // Generate new Google Meet link for rescheduled appointment
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const doctorName = appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'To be assigned';
    
    const meetResult = await this.googleCalendarService.generateMeetLink(
      newSlot.schedule.date,
      newSlot.startTime,
      appointment.duration,
      doctorName,
      patientName,
      appointment.service.name,
      appointment.patient.primaryEmail // Pass patient email
    );

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Make old slot available again (if slotId exists)
      if (appointment.slotId) {
        await prisma.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true }
        });
      }

      // Update appointment with new slot and new Google Meet link
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          slotId: newSlotId,
          appointmentDate: newSlot.schedule.date,
          appointmentTime: newSlot.startTime,
          status: AppointmentStatus.CONFIRMED, // Keep as confirmed since payment was already made
          googleMeetLink: meetResult.meetLink,
        }
      });

      // Make new slot unavailable
      await prisma.slot.update({
        where: { id: newSlotId },
        data: { isAvailable: false }
      });

      return updatedAppointment;
    });

    // Send email notifications
    try {
      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
      const doctorName = appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'To be assigned';

      // Send reschedule email to patient with new Google Meet link
      await this.mailerService.sendRescheduleEmail(
        appointment.patient.primaryEmail,
        patientName,
        doctorName,
        oldDate,
        oldTime,
        newDate,
        newTime,
        meetResult.meetLink
      );

      // Send reschedule notification to doctor with new Google Meet link (only if doctor is assigned)
      if (appointment.doctor) {
        await this.mailerService.sendDoctorRescheduleNotification(
          appointment.doctor.email,
          doctorName,
          patientName,
          oldDate,
          oldTime,
          newDate,
          newTime,
          meetResult.meetLink
        );
      }
    } catch (error) {
      console.error('Failed to send reschedule emails:', error);
      // Don't throw error to avoid breaking the reschedule process
    }

    return result;
  }

  /**
   * Get patient appointments
   */
  async getPatientAppointments(patientId: string, query: QueryAppointmentsDto): Promise<{ appointments: AppointmentWithRelationsResponseDto[], total: number }> {
    const { status, startDate, endDate, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { patientId };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate);
      if (endDate) where.appointmentDate.lte = new Date(endDate);
    }

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
              primaryPhone: true
            }
          },
          doctor: {
            select: {
              id: true,
              licenseNumber: true,
              specialization: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              category: true
            }
          },
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              schedule: {
                select: {
                  date: true
                }
              }
            }
          },
          medicalForm: true // Include medical form data
        },
        skip,
        take: limit,
        orderBy: [
          { appointmentDate: 'asc' },
          { appointmentTime: 'asc' }
        ]
      }),
      this.prisma.appointment.count({ where })
    ]);

    return { appointments, total };
  }

  /**
   * Get doctor appointments
   */
  async getDoctorAppointments(doctorId: string, query: QueryAppointmentsDto): Promise<{ appointments: AppointmentWithRelationsResponseDto[], total: number }> {
    const { status, startDate, endDate, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { doctorId };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate);
      if (endDate) where.appointmentDate.lte = new Date(endDate);
    }

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
              primaryPhone: true
            }
          },
          doctor: {
            select: {
              id: true,
              licenseNumber: true,
              specialization: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              category: true
            }
          },
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              schedule: {
                select: {
                  date: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { appointmentDate: 'asc' },
          { appointmentTime: 'asc' }
        ]
      }),
      this.prisma.appointment.count({ where })
    ]);

    return { appointments, total };
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(userId: string, userType: 'patient' | 'doctor'): Promise<AppointmentWithRelationsResponseDto[]> {
    const where: any = {
      appointmentDate: {
        gte: new Date()
      },
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]
      }
    };

    if (userType === 'patient') {
      where.patientId = userId;
    } else if (userType === 'doctor') {
      where.doctorId = userId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            primaryPhone: true
          }
        },
        doctor: {
          select: {
            id: true,
            licenseNumber: true,
            specialization: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            category: true
          }
        },
        slot: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            schedule: {
              select: {
                date: true
              }
            }
          }
        }
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { appointmentTime: 'asc' }
      ]
    });

    return appointments;
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(doctorId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    
    if (doctorId) {
      where.doctorId = doctorId;
    }
    
    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) {
        where.appointmentDate.gte = startDate;
      }
      if (endDate) {
        where.appointmentDate.lte = endDate;
      }
    }

    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments
    ] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.PENDING } }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.CONFIRMED } }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.COMPLETED } }),
      this.prisma.appointment.count({ where: { ...where, status: AppointmentStatus.CANCELLED } }),
      this.prisma.appointment.count({
        where: {
          ...where,
          appointmentDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      })
    ]);

    return {
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments
    };
  }

  /**
   * Delete appointment (admin only)
   */
  async deleteAppointment(id: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { slot: true }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment can be deleted
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Completed appointments cannot be deleted');
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (prisma) => {
      // Make slot available again (if slotId exists)
      if (appointment.slotId) {
        await prisma.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true }
        });
      }

      // Delete appointment
      await prisma.appointment.delete({
        where: { id }
      });
    });
  }

  async getDoctorSlots(doctorId: string, date: string): Promise<any[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // First, find schedules for the doctor on the given date
    const schedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        slots: {
          include: {
            appointment: {
              include: {
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    primaryEmail: true,
                    primaryPhone: true,
                  },
                },
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    // Flatten all slots from all schedules
    const allSlots = schedules.flatMap(schedule => schedule.slots);

    // Create a map to deduplicate slots by time range, prioritizing booked slots
    const slotMap = new Map<string, any>();

    allSlots.forEach(slot => {
      const timeKey = `${slot.startTime}-${slot.endTime}`;
      const isBooked = slot.appointment && slot.appointment.length > 0;
      
      // If slot doesn't exist in map, or if current slot is booked and existing is not, use current slot
      if (!slotMap.has(timeKey) || (isBooked && !slotMap.get(timeKey).isBooked)) {
        slotMap.set(timeKey, {
          ...slot,
          isBooked
        });
      }
    });

    // Convert map back to array and sort by start time
    return Array.from(slotMap.values())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.isBooked ? 'booked' : slot.isAvailable ? 'available' : 'blocked',
        appointment: slot.isBooked ? {
          id: slot.appointment[0].id,
          patientName: `${slot.appointment[0].patient?.firstName || ''} ${slot.appointment[0].patient?.lastName || ''}`.trim() || 'Unknown Patient',
          patientEmail: slot.appointment[0].patient?.primaryEmail || '',
          patientPhone: slot.appointment[0].patient?.primaryPhone || '',
          serviceName: slot.appointment[0].service?.name || 'General Consultation',
          notes: slot.appointment[0].patientNotes || '',
          status: slot.appointment[0].status,
        } : undefined,
      }));
  }

  /**
   * Get all available slots from all doctors for a specific date
   */
  async getGlobalSlots(date: string): Promise<any[]> {
    const targetDate = new Date(date);
    
    // Get all slots for the specified date from all doctors
    const slots = await this.prisma.slot.findMany({
      where: {
        isAvailable: true,
        schedule: {
          date: targetDate
        }
      },
      include: {
        schedule: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                licenseNumber: true
              }
            }
          }
        },
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                primaryPhone: true
              }
            },
            service: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Create a map to deduplicate slots by time
    const slotMap = new Map<string, any>();
    
    slots.forEach(slot => {
      const timeKey = slot.startTime;
      
      // If this time slot doesn't exist or if current slot is booked (prioritize booked slots)
      if (!slotMap.has(timeKey) || (slot.appointment.length > 0 && slotMap.get(timeKey).appointment.length === 0)) {
        slotMap.set(timeKey, {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable,
          doctor: {
            id: slot.schedule.doctor.id,
            name: `${slot.schedule.doctor.firstName} ${slot.schedule.doctor.lastName}`,
            specialization: slot.schedule.doctor.specialization,
            licenseNumber: slot.schedule.doctor.licenseNumber
          },
          appointment: slot.appointment.length > 0 ? {
            id: slot.appointment[0].id,
            patientName: `${slot.appointment[0].patient?.firstName || ''} ${slot.appointment[0].patient?.lastName || ''}`.trim(),
            patientPhone: slot.appointment[0].patient?.primaryPhone || '',
            serviceName: slot.appointment[0].service?.name || 'General Consultation',
            notes: slot.appointment[0].patientNotes || '',
            status: slot.appointment[0].status,
          } : undefined,
        });
      }
    });

    // Convert map to array and sort by time
    return Array.from(slotMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Get available doctors for a specific appointment's slot time
   */
  async getAvailableDoctorsForAppointment(appointmentId: string): Promise<any[]> {
    // Get the appointment details
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        appointmentDate: true,
        selectedSlotTime: true,
        doctorId: true,
        status: true
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId) {
      throw new BadRequestException('Appointment already has a doctor assigned');
    }

    if (!appointment.selectedSlotTime) {
      throw new BadRequestException('Appointment does not have a selected slot time');
    }

    // Find all available slots for the appointment date and time
    const availableSlots = await this.prisma.slot.findMany({
      where: {
        isAvailable: true,
        startTime: appointment.selectedSlotTime,
        schedule: {
          date: appointment.appointmentDate
        }
      },
      include: {
        schedule: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                licenseNumber: true,
                isActive: true,
                isAvailable: true
              }
            }
          }
        }
      }
    });

    // Filter out inactive or unavailable doctors and format the response
    const availableDoctors = availableSlots
      .filter(slot => slot.schedule.doctor.isActive && slot.schedule.doctor.isAvailable)
      .map(slot => ({
        id: slot.schedule.doctor.id,
        firstName: slot.schedule.doctor.firstName,
        lastName: slot.schedule.doctor.lastName,
        specialization: slot.schedule.doctor.specialization,
        licenseNumber: slot.schedule.doctor.licenseNumber,
        slotId: slot.id,
        slotStartTime: slot.startTime,
        slotEndTime: slot.endTime
      }));

    return availableDoctors;
  }

  /**
   * Assign doctor and slot to an appointment
   */
  async assignDoctorToAppointment(assignDoctorDto: any): Promise<AppointmentResponseDto> {
    const { appointmentId, doctorId, slotId } = assignDoctorDto;

    // Get the appointment with all relations
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId) {
      throw new BadRequestException('Appointment already has a doctor assigned');
    }

    // Verify the slot exists and is available
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        schedule: {
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
                isAvailable: true
              }
            }
          }
        }
      }
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (!slot.isAvailable) {
      throw new BadRequestException('Slot is not available');
    }

    if (slot.schedule.doctor.id !== doctorId) {
      throw new BadRequestException('Slot does not belong to the specified doctor');
    }

    if (!slot.schedule.doctor.isActive || !slot.schedule.doctor.isAvailable) {
      throw new BadRequestException('Doctor is not available');
    }

    // Update the appointment with doctor and slot
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        doctorId: doctorId,
        slotId: slotId,
        status: 'CONFIRMED'
      },
      include: {
        patient: true,
        doctor: true,
        service: true,
        slot: {
          include: {
            schedule: true
          }
        },
        medicalForm: true
      }
    });

    // Update slot availability to false
    await this.prisma.slot.update({
      where: { id: slotId },
      data: {
        isAvailable: false
      }
    });

    // Send email notification to doctor only
    try {
      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
      const doctorName = `Dr. ${slot.schedule.doctor.firstName} ${slot.schedule.doctor.lastName}`;
      const appointmentDate = appointment.appointmentDate.toISOString().split('T')[0];
      const amount = appointment.amount.toString();

      // Send notification to doctor with Google Meet link
      await this.mailerService.sendDoctorAppointmentNotification(
        slot.schedule.doctor.email,
        doctorName,
        patientName,
        appointment.service.name,
        appointmentDate,
        appointment.appointmentTime,
        amount,
        appointment.googleMeetLink || undefined
      );
    } catch (error) {
      console.error('Failed to send doctor assignment email:', error);
      // Don't throw error to avoid breaking the assignment process
    }

    return updatedAppointment;
  }
}
