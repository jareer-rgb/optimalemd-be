import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkingHoursDto,
  CreateMultipleWorkingHoursDto,
  UpdateWorkingHoursDto,
  QueryWorkingHoursDto,
  WorkingHoursResponseDto,
  WorkingHoursWithDoctorDto,
  GenerateScheduleFromWorkingHoursDto,
} from './dto';

@Injectable()
export class WorkingHoursService {
  constructor(
    private prisma: PrismaService
  ) {}

  /**
   * Create working hours for a specific day
   */
  async createWorkingHours(createWorkingHoursDto: CreateWorkingHoursDto): Promise<WorkingHoursResponseDto> {
    const { doctorId, dayOfWeek, startTime, endTime, slotDuration, breakDuration, isActive = true } = createWorkingHoursDto;

    // Check if doctor exists and is active
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, isActive: true, isAvailable: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (!doctor.isActive || !doctor.isAvailable) {
      throw new BadRequestException('Doctor is not available for scheduling');
    }

    // Validate time format and logic
    if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
      throw new BadRequestException('Invalid time format. Use HH:MM format');
    }

    if (!this.isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check if working hours already exist for this day
    const existingWorkingHours = await this.prisma.workingHours.findUnique({
      where: {
        doctorId_dayOfWeek: {
          doctorId,
          dayOfWeek
        }
      }
    });

    if (existingWorkingHours) {
      throw new ConflictException('Working hours already exist for this day');
    }

    // Create working hours
    const workingHours = await this.prisma.workingHours.create({
      data: {
        doctorId,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration,
        breakDuration,
        isActive
      }
    });

    return workingHours;
  }

  /**
   * Create working hours for multiple days
   */
  async createMultipleWorkingHours(createMultipleWorkingHoursDto: CreateMultipleWorkingHoursDto): Promise<WorkingHoursResponseDto[]> {
    const { doctorId, workingHours } = createMultipleWorkingHoursDto;

    // Check if doctor exists and is active
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, isActive: true, isAvailable: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (!doctor.isActive || !doctor.isAvailable) {
      throw new BadRequestException('Doctor is not available for scheduling');
    }

    // Validate all working hours
    for (const wh of workingHours) {
      if (!this.isValidTimeFormat(wh.startTime) || !this.isValidTimeFormat(wh.endTime)) {
        throw new BadRequestException(`Invalid time format for day ${wh.dayOfWeek}. Use HH:MM format`);
      }

      if (!this.isValidTimeRange(wh.startTime, wh.endTime)) {
        throw new BadRequestException(`Start time must be before end time for day ${wh.dayOfWeek}`);
      }
    }

    // Check for existing working hours
    const existingWorkingHours = await this.prisma.workingHours.findMany({
      where: {
        doctorId,
        dayOfWeek: { in: workingHours.map(wh => wh.dayOfWeek) }
      }
    });

    if (existingWorkingHours.length > 0) {
      const existingDays = existingWorkingHours.map(wh => wh.dayOfWeek);
      throw new ConflictException(`Working hours already exist for days: ${existingDays.join(', ')}`);
    }

    // Create all working hours
    const createdWorkingHours = await Promise.all(
      workingHours.map(wh =>
        this.prisma.workingHours.create({
          data: {
            doctorId,
            dayOfWeek: wh.dayOfWeek,
            startTime: wh.startTime,
            endTime: wh.endTime,
            slotDuration: wh.slotDuration,
            breakDuration: wh.breakDuration,
            isActive: wh.isActive ?? true
          }
        })
      )
    );

    return createdWorkingHours;
  }

  /**
   * Get working hours by ID
   */
  async findById(id: string): Promise<WorkingHoursResponseDto> {
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { id }
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    return workingHours;
  }

  /**
   * Get working hours with doctor info
   */
  async findByIdWithDoctorInfo(id: string): Promise<WorkingHoursWithDoctorDto> {
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        }
      }
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    return workingHours;
  }

  /**
   * Get working hours with filtering and pagination
   */
  async findAll(query: QueryWorkingHoursDto): Promise<{ workingHours: WorkingHoursResponseDto[], total: number }> {
    const { doctorId, dayOfWeek, isActive, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (dayOfWeek !== undefined) where.dayOfWeek = dayOfWeek;
    if (isActive !== undefined) where.isActive = isActive;

    const [workingHours, total] = await Promise.all([
      this.prisma.workingHours.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { doctorId: 'asc' },
          { dayOfWeek: 'asc' }
        ]
      }),
      this.prisma.workingHours.count({ where })
    ]);

    return { workingHours, total };
  }

  /**
   * Update working hours
   */
  async updateWorkingHours(id: string, updateWorkingHoursDto: UpdateWorkingHoursDto): Promise<WorkingHoursResponseDto> {
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { id }
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    // Validate time format and logic if provided
    if (updateWorkingHoursDto.startTime && !this.isValidTimeFormat(updateWorkingHoursDto.startTime)) {
      throw new BadRequestException('Invalid start time format. Use HH:MM format');
    }

    if (updateWorkingHoursDto.endTime && !this.isValidTimeFormat(updateWorkingHoursDto.endTime)) {
      throw new BadRequestException('Invalid end time format. Use HH:MM format');
    }

    if (updateWorkingHoursDto.startTime && updateWorkingHoursDto.endTime) {
      if (!this.isValidTimeRange(updateWorkingHoursDto.startTime, updateWorkingHoursDto.endTime)) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    const updatedWorkingHours = await this.prisma.workingHours.update({
      where: { id },
      data: updateWorkingHoursDto
    });

    return updatedWorkingHours;
  }

  /**
   * Delete working hours
   */
  async deleteWorkingHours(id: string): Promise<void> {
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { id },
      include: {
        generatedSchedules: {
          include: {
            slots: {
              include: {
                appointment: true
              }
            }
          }
        }
      }
    });

    if (!workingHours) {
      throw new NotFoundException('Working hours not found');
    }

    // Check if there are any appointments in generated schedules
    const hasAppointments = workingHours.generatedSchedules.some(schedule =>
      schedule.slots.some(slot => slot.appointment)
    );

    if (hasAppointments) {
      throw new BadRequestException('Cannot delete working hours with existing appointments');
    }

    // Use transaction to ensure data consistency
    await this.prisma.$transaction(async (prisma) => {
      // Delete all generated schedules and their slots
      for (const schedule of workingHours.generatedSchedules) {
        await prisma.slot.deleteMany({
          where: { scheduleId: schedule.id }
        });
        await prisma.schedule.delete({
          where: { id: schedule.id }
        });
      }

      // Delete working hours
      await prisma.workingHours.delete({
        where: { id }
      });
    });
  }

  /**
   * Generate schedules from working hours for a date range
   */
  async generateSchedulesFromWorkingHours(generateDto: GenerateScheduleFromWorkingHoursDto): Promise<any> {
    const { doctorId, startDate, endDate, regenerateExisting = false } = generateDto;

    // Check if doctor exists and is active
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, isActive: true, isAvailable: true }
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    if (!doctor.isActive || !doctor.isAvailable) {
      throw new BadRequestException('Doctor is not available for scheduling');
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (start < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Get all active working hours for the doctor
    const workingHours = await this.prisma.workingHours.findMany({
      where: {
        doctorId,
        isActive: true
      },
      orderBy: { dayOfWeek: 'asc' }
    });

    if (workingHours.length === 0) {
      throw new BadRequestException('No active working hours found for this doctor');
    }

    const generatedSchedules: any[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);

      if (workingHour) {
        try {
          // Check if schedule already exists for this date
          const existingSchedule = await this.prisma.schedule.findFirst({
            where: {
              doctorId,
              date: currentDate,
              workingHoursId: workingHour.id
            }
          });

          if (existingSchedule && !regenerateExisting) {
            console.log(`Schedule already exists for ${currentDate.toISOString().split('T')[0]}, skipping...`);
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }

          // Delete existing schedule if regenerating
          if (existingSchedule && regenerateExisting) {
            await this.prisma.$transaction(async (prisma) => {
              await prisma.slot.deleteMany({
                where: { scheduleId: existingSchedule.id }
              });
              await prisma.schedule.delete({
                where: { id: existingSchedule.id }
              });
            });
          }

          // Generate slots for this working hour
          const slots = this.generateSlots(workingHour.startTime, workingHour.endTime, workingHour.slotDuration, workingHour.breakDuration);

          // Create schedule
          const schedule = await this.prisma.schedule.create({
            data: {
              doctorId,
              workingHoursId: workingHour.id,
              date: currentDate,
              startTime: workingHour.startTime,
              endTime: workingHour.endTime,
              isAvailable: true,
              maxAppointments: 10,
              isAutoGenerated: true,
              slots: {
                create: slots.map(slot => ({
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isAvailable: true
                }))
              }
            },
            include: {
              slots: true
            }
          });

          generatedSchedules.push(schedule);
        } catch (error) {
          console.warn(`Error generating schedule for ${currentDate.toISOString().split('T')[0]}: ${error.message}`);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Google Calendar sync removed - no longer needed
    const calendarSyncResult = {
      success: true,
      eventsCreated: 0,
      errors: []
    };

    return {
      doctorId,
      startDate,
      endDate,
      generatedSchedules,
      totalGenerated: generatedSchedules.length,
      calendarSync: calendarSyncResult
    };
  }

  /**
   * Generate time slots based on working hours
   */
  private generateSlots(startTime: string, endTime: string, slotDuration: number, breakDuration: number): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let currentTime = new Date(start);

    while (currentTime < end) {
      const slotStart = currentTime.toTimeString().slice(0, 5);
      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
      
      if (currentTime > end) break;
      
      const slotEnd = currentTime.toTimeString().slice(0, 5);
      slots.push({ startTime: slotStart, endTime: slotEnd });

      // Add break time
      if (breakDuration > 0) {
        currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
      }
    }

    return slots;
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate time range (start < end)
   */
  private isValidTimeRange(startTime: string, endTime: string): boolean {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return start < end;
  }
}
