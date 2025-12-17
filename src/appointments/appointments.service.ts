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
import { dateStringToUTC, isDateTimeInPast, getUTCMidnight, getUTCEndOfDay } from '../common/utils/timezone.utils';

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
    const { patientId, doctorId, serviceId, slotId, appointmentDate, appointmentTime, duration, patientNotes, symptoms, amount, primaryServiceId, selectedSlotTime, patientTimezone, additionalServiceIds } = createAppointmentDto;

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
      select: { id: true, isActive: true, duration: true, name: true }
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    const uniqueAdditionalServiceIds = Array.from(new Set((additionalServiceIds || []).filter(id => id && id !== serviceId)));

    let additionalServicesData: Array<{ id: string; name: string; duration: number }> = [];
    let additionalServicesDuration = 0;

    if (uniqueAdditionalServiceIds.length > 0) {
      const additionalServices = await this.prisma.service.findMany({
        where: { id: { in: uniqueAdditionalServiceIds } },
        select: { id: true, name: true, duration: true, isActive: true }
      });

      if (additionalServices.length !== uniqueAdditionalServiceIds.length) {
        throw new BadRequestException('One or more additional services are invalid');
      }

      for (const additional of additionalServices) {
        if (!additional.isActive) {
          throw new BadRequestException(`Service "${additional.name}" is not active`);
        }
        additionalServicesDuration += additional.duration;
        additionalServicesData.push({
          id: additional.id,
          name: additional.name,
          duration: additional.duration,
        });
      }
    }

    const computedDuration = service.duration + additionalServicesDuration;
    const appointmentDuration = additionalServicesData.length > 0
      ? computedDuration
      : (typeof duration === 'number' ? duration : service.duration);

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
      if (slotDuration < appointmentDuration) {
        throw new BadRequestException('Slot duration is insufficient for the selected services');
      }
    }

    // Check if appointment date is not in the past
    if (isDateTimeInPast(appointmentDate, appointmentTime)) {
      throw new BadRequestException('Appointment date and time cannot be in the past');
    }

    // Check for double booking (doctor) - only if doctorId is provided
    if (doctorId) {
      const existingDoctorAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate: dateStringToUTC(appointmentDate),
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
        appointmentDate: dateStringToUTC(appointmentDate),
        appointmentTime,
        selectedSlotTime,
        duration: appointmentDuration,
        patientNotes,
        symptoms,
        amount,
        status: AppointmentStatus.PENDING,
        isPaid: false,
        additionalServices: additionalServicesData.length > 0 ? additionalServicesData : undefined,
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
    const { patientId, doctorId, serviceId, slotId, appointmentDate, appointmentTime, duration, patientNotes, symptoms, amount, primaryServiceId, patientTimezone } = createAppointmentDto;

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
    if (isDateTimeInPast(appointmentDate, appointmentTime)) {
      throw new BadRequestException('Appointment date and time cannot be in the past');
    }

    // Check for double booking (doctor)
    const existingDoctorAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: dateStringToUTC(appointmentDate),
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
        appointmentDate: dateStringToUTC(appointmentDate),
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
            primaryPhone: true,
            gender: true,
            dateOfBirth: true,
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
        medicalForm: true, // Include medical form data
        medicationPrescriptions: true // Include medication prescriptions
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
    const { patientId, doctorId, serviceId, status, startDate, endDate, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) {
        // Ensure we're comparing dates at the start of the day (UTC)
        where.appointmentDate.gte = getUTCMidnight(dateStringToUTC(startDate));
      }
      if (endDate) {
        // Ensure we're comparing dates at the end of the day (UTC)
        where.appointmentDate.lte = getUTCEndOfDay(dateStringToUTC(endDate));
      }
    }

    // Handle search functionality
    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length === 1) {
        // Single term search
        where.OR = [
          {
            patient: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { middleName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { primaryEmail: { contains: search, mode: 'insensitive' } }
              ]
            }
          },
          {
            doctor: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          },
          {
            service: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        ];
      } else {
        // Multiple terms search
        const searchConditions: any[] = [];
        
        // Search for patient name combinations
        if (searchTerms.length === 2) {
          // Two terms: try different combinations
          searchConditions.push({
            patient: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { lastName: { contains: searchTerms[1], mode: 'insensitive' } }
              ]
            }
          });
          searchConditions.push({
            patient: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { middleName: { contains: searchTerms[1], mode: 'insensitive' } }
              ]
            }
          });
          searchConditions.push({
            patient: {
              AND: [
                { middleName: { contains: searchTerms[0], mode: 'insensitive' } },
                { lastName: { contains: searchTerms[1], mode: 'insensitive' } }
              ]
            }
          });
        } else if (searchTerms.length === 3) {
          // Three terms: try different combinations
          searchConditions.push({
            patient: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { middleName: { contains: searchTerms[1], mode: 'insensitive' } },
                { lastName: { contains: searchTerms[2], mode: 'insensitive' } }
              ]
            }
          });
          searchConditions.push({
            patient: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { lastName: { contains: searchTerms[2], mode: 'insensitive' } }
              ]
            }
          });
        } else if (searchTerms.length > 3) {
          // More than 3 terms: try first + last, and first + middle + last
          searchConditions.push({
            patient: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { lastName: { contains: searchTerms[searchTerms.length - 1], mode: 'insensitive' } }
              ]
            }
          });
          if (searchTerms.length >= 3) {
            searchConditions.push({
              patient: {
                AND: [
                  { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                  { middleName: { contains: searchTerms[1], mode: 'insensitive' } },
                  { lastName: { contains: searchTerms[searchTerms.length - 1], mode: 'insensitive' } }
                ]
              }
            });
          }
        }
        
        // Search for doctor name combinations
        if (searchTerms.length >= 2) {
          searchConditions.push({
            doctor: {
              AND: [
                { firstName: { contains: searchTerms[0], mode: 'insensitive' } },
                { lastName: { contains: searchTerms.slice(1).join(' '), mode: 'insensitive' } }
              ]
            }
          });
        }
        
        // Search for service name
        searchConditions.push({
          service: {
            name: { contains: search, mode: 'insensitive' }
          }
        });
        
        // Individual term searches
        searchTerms.forEach(term => {
          searchConditions.push(
            {
              patient: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { middleName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                  { primaryEmail: { contains: term, mode: 'insensitive' } }
                ]
              }
            },
            {
              doctor: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                  { email: { contains: term, mode: 'insensitive' } }
                ]
              }
            },
            {
              service: {
                name: { contains: term, mode: 'insensitive' }
              }
            }
          );
        });
        
        where.OR = searchConditions;
      }
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
   * Update subjective notes for an appointment (doctor only)
   */
  async updateCarePlan(appointmentId: string, carePlan: string, doctorId: string): Promise<AppointmentResponseDto> {
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

    // Update the care plan
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { carePlan },
    });

    return updatedAppointment;
  }

  async updateSubjectiveNotes(appointmentId: string, subjectiveNotes: string, doctorId: string): Promise<AppointmentResponseDto> {
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

    // Update the subjective notes
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { subjectiveNotes }
    });

    return updatedAppointment;
  }

  /**
   * Update medications JSON for an appointment (doctor only)
   * Supports both old format (string[]) and new format (MedicationObject[]) for backward compatibility
   */
  async updateMedications(
    appointmentId: string,
    medications: Record<string, string[] | any[]>, // Can be string[] (old) or MedicationObject[] (new)
    merge: boolean,
    doctorId: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.doctorId && appointment.doctorId !== doctorId) {
      // Optional ownership check: only the assigned doctor can update
    }

    console.log('=== Backend updateMedications Debug ===');
    console.log('Appointment ID:', appointmentId);
    console.log('Incoming medications:', JSON.stringify(medications, null, 2));
    console.log('Merge flag:', merge);

    let updatedMedications: any = medications;
    const appointmentAny = appointment as any;
    
    console.log('Existing medications in DB:', JSON.stringify(appointmentAny.medications, null, 2));
    
    if (merge && appointmentAny.medications) {
      // When merging, we keep existing services and replace/update the specified services
      const existing = appointmentAny.medications as Record<string, string[] | any[]>;
      updatedMedications = { ...existing };
      
      console.log('After copying existing:', JSON.stringify(updatedMedications, null, 2));
      
      // For each service in the incoming medications, REPLACE that service's medications
      // This allows updating a specific service while preserving all other services
      for (const [serviceName, meds] of Object.entries(medications)) {
        console.log(`Updating service "${serviceName}" with:`, meds);
        // Store medications as-is (can be string[] or MedicationObject[])
        updatedMedications[serviceName] = meds; // Replace medications for this service
      }
    }

    console.log('Final medications to save:', JSON.stringify(updatedMedications, null, 2));

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { medications: updatedMedications } as any,
    });

    console.log('Saved medications:', JSON.stringify((updatedAppointment as any).medications, null, 2));
    console.log('=== End Backend Debug ===');

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
        appointment.patient.primaryEmail || '',
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
          appointment.patient.primaryEmail || '',
          appointmentDate,
          appointment.appointmentTime,
          amount,
          'America/Chicago'
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
    const { newSlotId, reason, patientTimezone } = rescheduleAppointmentDto;

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

    // Prepare patient and doctor names
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const doctorName = appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'To be assigned';
    
    // Try to update existing Google Calendar event if eventId exists
    // Otherwise create a new event
    let meetResult: { meetLink: string; eventId?: string };
    const appointmentAdditionalServices =
      (appointment as any).additionalServices as Array<{ id: string; name: string; duration: number }> | null;
    
    if (appointment.googleEventId) {
      try {
        console.log(`📅 Appointment has existing event ID (${appointment.googleEventId}), updating it...`);
        // Update the existing event with new date/time (with proper time conversion)
        meetResult = await this.googleCalendarService.updateEvent(
          appointment.googleEventId,
      newSlot.schedule.date,
      newSlot.startTime,
      appointment.duration,
      doctorName,
      patientName,
      appointment.service.name,
          appointment.patient.primaryEmail || undefined,
          appointment.doctor?.email,
          patientTimezone // Pass patient's timezone for correct event time
        );
        console.log('✅ Successfully updated existing Google Calendar event');
      } catch (error: any) {
        console.error('⚠️  Failed to update existing event, creating new one:', error.message);
        // Fallback to creating new event if update fails (event might have been deleted)
        meetResult = await this.googleCalendarService.generateMeetLink(
          newSlot.schedule.date,
          newSlot.startTime,
          appointment.duration,
          doctorName,
          patientName,
          appointment.service.name,
          appointment.patient.primaryEmail || undefined,
          appointment.doctor?.email,
          patientTimezone, // Pass patient's timezone for correct event time
          appointmentAdditionalServices || undefined,
          appointment.doctorId || undefined
        );
      }
    } else {
      // No existing event ID, create new event
      console.log('📅 No existing event ID found, creating new Google Calendar event...');
      meetResult = await this.googleCalendarService.generateMeetLink(
        newSlot.schedule.date,
        newSlot.startTime,
        appointment.duration,
        doctorName,
        patientName,
        appointment.service.name,
        appointment.patient.primaryEmail || undefined,
        appointment.doctor?.email,
        patientTimezone, // Pass patient's timezone for correct event time
        appointmentAdditionalServices || undefined,
        appointment.doctorId || undefined
      );
    }

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Make old slot available again (if slotId exists)
      if (appointment.slotId) {
        await prisma.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true }
        });
      }

      // Update appointment with new slot and new Google Meet link and event ID
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          slotId: newSlotId,
          appointmentDate: newSlot.schedule.date,
          appointmentTime: newSlot.startTime,
          status: AppointmentStatus.CONFIRMED, // Keep as confirmed since payment was already made
          googleMeetLink: meetResult.meetLink,
          googleEventId: meetResult.eventId || null,
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
        appointment.patient.primaryEmail || '',
        patientName,
        doctorName,
        oldDate,
        oldTime,
        newDate,
        newTime,
        meetResult.meetLink,
        patientTimezone // Use patient's timezone from frontend
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
          meetResult.meetLink,
          'America/Chicago'
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
      if (startDate) {
        // Ensure we're comparing dates at the start of the day (UTC)
        where.appointmentDate.gte = getUTCMidnight(dateStringToUTC(startDate));
      }
      if (endDate) {
        // Ensure we're comparing dates at the end of the day (UTC)
        where.appointmentDate.lte = getUTCEndOfDay(dateStringToUTC(endDate));
      }
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
      if (startDate) {
        // Ensure we're comparing dates at the start of the day (UTC)
        where.appointmentDate.gte = getUTCMidnight(dateStringToUTC(startDate));
      }
      if (endDate) {
        // Ensure we're comparing dates at the end of the day (UTC)
        where.appointmentDate.lte = getUTCEndOfDay(dateStringToUTC(endDate));
      }
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
    const targetDate = dateStringToUTC(date);
    const startOfDay = getUTCMidnight(targetDate);
    const endOfDay = getUTCEndOfDay(targetDate);

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
          googleMeetLink: slot.appointment[0].googleMeetLink || null,
        } : undefined,
      }));
  }

  async adminCreateConfirmed(dto: any): Promise<any> {
    const { patientId, doctorId, serviceId, primaryServiceId, slotId, appointmentDate, appointmentTime, duration, patientNotes, patientTimezone } = dto;

    // Basic validations
    const patient = await this.prisma.user.findUnique({ where: { id: patientId }, select: { id: true, isActive: true } });
    if (!patient || !patient.isActive) {
      throw new BadRequestException('Invalid or inactive patient');
    }

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true, isActive: true, isAvailable: true } });
    if (!doctor || !doctor.isActive || !doctor.isAvailable) {
      throw new BadRequestException('Invalid or unavailable doctor');
    }

    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, isActive: true } });
    if (!service || !service.isActive) {
      throw new BadRequestException('Invalid or inactive service');
    }

    // Validate primary service
    const primaryService = await this.prisma.primaryService.findUnique({ where: { id: primaryServiceId }, select: { id: true, isActive: true } });
    if (!primaryService || !primaryService.isActive) {
      throw new BadRequestException('Invalid or inactive primary service');
    }

    // Optional: verify slot availability
    if (slotId) {
      const slot = await this.prisma.slot.findUnique({ where: { id: slotId }, select: { id: true, isAvailable: true } });
      if (!slot || !slot.isAvailable) {
        throw new BadRequestException('Selected slot is not available');
      }
    }

    // Default care plan for new appointments
    const defaultCarePlan = `1. Continue current treatment regimen as prescribed
2. Monitor symptoms and report any changes
3. Follow up with lab work as scheduled
4. Maintain healthy lifestyle habits (diet, exercise, sleep)`;

    const created = await this.prisma.appointment.create({
      data: {
        patient: { connect: { id: patientId } },
        doctor: { connect: { id: doctorId } },
        service: { connect: { id: serviceId } },
        primaryService: { connect: { id: primaryServiceId } },
        slot: slotId ? { connect: { id: slotId } } : undefined,
        appointmentDate: dateStringToUTC(appointmentDate),
        appointmentTime,
        duration,
        status: 'CONFIRMED',
        patientNotes: patientNotes ?? null,
        carePlan: defaultCarePlan,
        isPaid: false,
        amount: '0.00',
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, primaryEmail: true }
        },
        doctor: {
          select: { firstName: true, lastName: true, email: true }
        },
        service: {
          select: { name: true }
        },
        slot: true,
      },
    });

    // Clone latest medical form to new one bound to this appointment
    try {
      const lastForm = await this.prisma.medicalForm.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      });
      if (lastForm) {
        const { id: _id, createdAt: _ca, updatedAt: _ua, appointmentId: _oldAptId, ...rest } = lastForm as any;
        await this.prisma.medicalForm.create({
          data: {
            ...rest,
            patientId,
            appointmentId: created.id,
          } as any,
        });
      } else {
        // Ensure there is at least an empty medical form record for this appointment
        await this.prisma.medicalForm.create({
          data: {
            patientId,
            appointmentId: created.id,
          },
        });
      }
    } catch (err) {
      console.error('Failed to clone/create medical form for appointment:', err);
    }

    // Mark slot unavailable if provided
    if (slotId) {
      await this.prisma.slot.update({ where: { id: slotId }, data: { isAvailable: false } });
    }

    // Generate Google Meet link (best-effort)
    try {
      const patientName = `${created.patient.firstName} ${created.patient.lastName}`;
      const doctorName = created.doctor ? `Dr. ${created.doctor.firstName} ${created.doctor.lastName}` : 'To be assigned';
      const additionalServices = (created as any).additionalServices as Array<{ id: string; name: string; duration: number }> | null;
      const meetResult = await this.googleCalendarService.generateMeetLink(
        created.appointmentDate,
        created.appointmentTime,
        created.duration,
        doctorName,
        patientName,
        created.service.name,
        created.patient.primaryEmail || undefined,
        created.doctor?.email,
        patientTimezone, // Pass patient's timezone for correct event time
        additionalServices || undefined,
        doctorId || undefined
      );

      if (meetResult?.meetLink) {
        await this.prisma.appointment.update({
          where: { id: created.id },
          data: { 
            googleMeetLink: meetResult.meetLink,
            googleEventId: meetResult.eventId || null,
            confirmedAt: new Date() 
          },
        });

        // Send emails (best-effort)
        const dateStr = created.appointmentDate.toISOString().split('T')[0];
        const amountStr = typeof (created as any).amount === 'string' ? (created as any).amount : '0.00';
        try {
          if (created.patient?.primaryEmail) {
            const additionalServices = (created as any).additionalServices as Array<{ id: string; name: string; duration: number }> | null;
            await this.mailerService.sendAppointmentConfirmationEmail(
              created.patient.primaryEmail || '',
              patientName,
              doctorName,
              created.service.name,
              dateStr,
              created.appointmentTime,
              amountStr,
              meetResult.meetLink,
              patientTimezone, // Use patient's timezone from frontend
              additionalServices || undefined
            );
          }
        } catch (err) {
          console.error('Failed to send patient confirmation email:', err);
        }

        try {
          if (created.doctor?.email) {
            const additionalServices = (created as any).additionalServices as Array<{ id: string; name: string; duration: number }> | null;
            await this.mailerService.sendDoctorAppointmentNotification(
              created.doctor.email,
              doctorName,
              patientName,
              created.service.name,
              dateStr,
              created.appointmentTime,
              amountStr,
              meetResult.meetLink,
              'America/Chicago',
              additionalServices || undefined
            );
          }
        } catch (err) {
          console.error('Failed to send doctor notification email:', err);
        }
      }
    } catch (err) {
      console.error('Failed to generate Google Meet link or send emails:', err);
    }

    return created as any;
  }

  async getUnassignedAppointments(params: { page?: number; limit?: number; status?: string }): Promise<any[]> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      doctorId: null,
      slotId: null,
    };
    if (params.status) {
      where.status = params.status.toUpperCase();
    }

    const items = await this.prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, primaryEmail: true, primaryPhone: true }
        },
        service: { select: { id: true, name: true, duration: true } },
      },
    });

    return items;
  }
  /**
   * Get all available slots from all doctors for a specific date
   */
  async getGlobalSlots(date: string): Promise<any[]> {
    const targetDate = dateStringToUTC(date);
    
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

    // Convert map to array
    const slotArray = Array.from(slotMap.values());
    
    // Detect if we have midnight crossover (early morning slots < 12:00 and late night slots >= 12:00)
    // This happens when UTC times cross midnight (e.g., 16:00-01:00 UTC from 10 AM-7 PM CST)
    const hasEarlyMorning = slotArray.some(s => {
      const [h] = s.startTime.split(':').map(Number);
      return h < 12;
    });
    const hasLateNight = slotArray.some(s => {
      const [h] = s.startTime.split(':').map(Number);
      return h >= 12;
    });
    const crossesMidnight = hasEarlyMorning && hasLateNight;
    
    // Custom sort function to handle midnight crossover
    // Times that cross midnight (e.g., 00:00, 00:30) should come after late night times (e.g., 23:00, 23:30)
    const sortSlots = (a: any, b: any) => {
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const aMinutes = timeToMinutes(a.startTime);
      const bMinutes = timeToMinutes(b.startTime);
      
      if (crossesMidnight) {
        // If crossing midnight, treat early morning times (< 12:00) as next day (add 24 hours)
        // This ensures 14:00, 15:00, ..., 23:00, 23:30, 00:00, 00:30 order
        const aSortMinutes = aMinutes < 12 * 60 ? aMinutes + 24 * 60 : aMinutes;
        const bSortMinutes = bMinutes < 12 * 60 ? bMinutes + 24 * 60 : bMinutes;
        return aSortMinutes - bSortMinutes;
      } else {
        // Normal sort (no midnight crossover)
        return aMinutes - bMinutes;
      }
    };
    
    return slotArray.sort(sortSlots);
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

    // Do not send email on assignment; emails are sent after payment confirmation

    return updatedAppointment;
  }
}
