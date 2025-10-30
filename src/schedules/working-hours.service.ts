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
import { dateStringToUTC, isDateInPast, addDaysUTC, getUTCDayOfWeek, toISODateString } from '../common/utils/timezone.utils';
import { localTimeToUTC, utcToLocalTime, isValidTimezone } from '../common/utils/timezone-converter.utils';

@Injectable()
export class WorkingHoursService {
  constructor(
    private prisma: PrismaService
  ) {}

  /**
   * Create working hours for a specific day
   * Times are converted from doctor's local timezone to UTC before storing
   */
  async createWorkingHours(createWorkingHoursDto: CreateWorkingHoursDto): Promise<WorkingHoursResponseDto> {
    const { doctorId, dayOfWeek, startTime, endTime, slotDuration, breakDuration, isActive = true, timezone } = createWorkingHoursDto;

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

    // Validate timezone if provided
    const doctorTimezone = timezone || 'UTC';
    if (timezone && !isValidTimezone(timezone)) {
      throw new BadRequestException(`Invalid timezone: ${timezone}`);
    }

    // Validate time format and logic
    if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
      throw new BadRequestException('Invalid time format. Use HH:MM format');
    }

    if (!this.isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Convert local time to UTC
    let utcStartTime = startTime;
    let utcEndTime = endTime;
    
    if (timezone && timezone !== 'UTC') {
      try {
        utcStartTime = localTimeToUTC(startTime, doctorTimezone);
        utcEndTime = localTimeToUTC(endTime, doctorTimezone);
        
        console.log(`📅 Working Hours Timezone Conversion:`);
        console.log(`   Doctor timezone: ${doctorTimezone}`);
        console.log(`   Local time: ${startTime} - ${endTime}`);
        console.log(`   UTC time: ${utcStartTime} - ${utcEndTime}`);
      } catch (error) {
        throw new BadRequestException(`Timezone conversion failed: ${error.message}`);
      }
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

    // Create working hours with UTC times
    const workingHours = await this.prisma.workingHours.create({
      data: {
        doctorId,
        dayOfWeek,
        startTime: utcStartTime,  // Store UTC time
        endTime: utcEndTime,      // Store UTC time
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

    // Convert times to UTC if timezone is provided
    const updateData = { ...updateWorkingHoursDto };
    const timezone = updateWorkingHoursDto.timezone;
    
    if (timezone && timezone !== 'UTC') {
      // Validate timezone
      if (!isValidTimezone(timezone)) {
        throw new BadRequestException(`Invalid timezone: ${timezone}`);
      }

      // Convert times to UTC if they're being updated
      if (updateWorkingHoursDto.startTime) {
        try {
          const utcStartTime = localTimeToUTC(updateWorkingHoursDto.startTime, timezone);
          updateData.startTime = utcStartTime;
          console.log(`🔄 Update: ${updateWorkingHoursDto.startTime} (${timezone}) → ${utcStartTime} (UTC)`);
        } catch (error) {
          throw new BadRequestException(`Failed to convert start time: ${error.message}`);
        }
      }

      if (updateWorkingHoursDto.endTime) {
        try {
          const utcEndTime = localTimeToUTC(updateWorkingHoursDto.endTime, timezone);
          updateData.endTime = utcEndTime;
          console.log(`🔄 Update: ${updateWorkingHoursDto.endTime} (${timezone}) → ${utcEndTime} (UTC)`);
        } catch (error) {
          throw new BadRequestException(`Failed to convert end time: ${error.message}`);
        }
      }
      
      // Remove timezone from update data (it's not a database field)
      delete updateData.timezone;
    }

    const updatedWorkingHours = await this.prisma.workingHours.update({
      where: { id },
      data: updateData
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
   * IMPORTANT: If timezone is provided, assumes working hours times are in LOCAL time and converts to UTC
   * If no timezone provided, assumes working hours times are already in UTC
   */
  async generateSchedulesFromWorkingHours(generateDto: GenerateScheduleFromWorkingHoursDto): Promise<any> {
    const { doctorId, startDate, endDate, regenerateExisting = false, timezone } = generateDto;

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

    // Validate timezone if provided
    if (timezone && !isValidTimezone(timezone)) {
      throw new BadRequestException(`Invalid timezone: ${timezone}`);
    }

    // Validate date range
    const start = dateStringToUTC(startDate);
    const end = dateStringToUTC(endDate);
    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (isDateInPast(startDate)) {
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

    console.log(`📅 Generating schedules with timezone: ${timezone || 'UTC (no conversion)'}`);

    const generatedSchedules: any[] = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = getUTCDayOfWeek(currentDate);
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
            console.log(`Schedule already exists for ${toISODateString(currentDate)}, skipping...`);
            currentDate = addDaysUTC(currentDate, 1);
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

          // Working hours are already stored in UTC, so use them directly
          // DO NOT convert again - they were converted when created
          const startTimeUTC = workingHour.startTime;
          const endTimeUTC = workingHour.endTime;
          
          console.log(`   Day ${dayOfWeek}: Using working hours times: ${startTimeUTC}-${endTimeUTC} (already in UTC)`);

          // Generate slots using UTC times
          const slots = this.generateSlots(startTimeUTC, endTimeUTC, workingHour.slotDuration, workingHour.breakDuration);

          // Create schedule with UTC times
          const schedule = await this.prisma.schedule.create({
            data: {
              doctorId,
              workingHoursId: workingHour.id,
              date: currentDate,
              startTime: startTimeUTC,  // Already in UTC from working hours
              endTime: endTimeUTC,      // Already in UTC from working hours
              isAvailable: true,
              maxAppointments: 10,
              isAutoGenerated: true,
              slots: {
                create: slots.map(slot => ({
                  startTime: slot.startTime,  // Slots are already in UTC from generateSlots
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
          console.warn(`Error generating schedule for ${toISODateString(currentDate)}: ${error.message}`);
        }
      }

      currentDate = addDaysUTC(currentDate, 1);
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
