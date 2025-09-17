import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
const { google } = require('googleapis');

@Injectable()
export class GoogleCalendarImportService {
  constructor(
    private prisma: PrismaService,
    private oauthService: GoogleCalendarOAuthService
  ) {}

  /**
   * Import working hours from Google Calendar events
   */
  async importWorkingHoursFromCalendar(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ success: boolean; workingHoursCreated: number; workingHoursUpdated: number; totalProcessed: number; schedulesGenerated: number; slotsGenerated: number; errors: string[] }> {
      const workingHoursCreated: any[] = [];
      const workingHoursUpdated: any[] = [];
      const errors: string[] = [];

      try {
      // Check if doctor is connected to Google Calendar
      const isConnected = await this.oauthService.isDoctorConnected(doctorId);
      if (!isConnected) {
        throw new Error('Doctor is not connected to Google Calendar');
      }

      // Get doctor's OAuth client
      const oauthResult = await this.oauthService.getDoctorOAuthClient(doctorId);
      if (!oauthResult.success) {
        throw new Error(oauthResult.error);
      }

      // Get doctor information
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          googleCalendarId: true
        }
      });

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Create calendar instance
      const calendar = google.calendar({ version: 'v3', auth: oauthResult.client });
      const calendarId = doctor.googleCalendarId || 'primary';

      // Get events from Google Calendar
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
        // Removed search query to get all events and filter in code
      });

      const events = response.data.items || [];
      console.log(`Found ${events.length} events in date range`);

      // Log all events found
      events.forEach((event, index) => {
        console.log(`Event ${index + 1}: "${event.summary}" (${event.start?.dateTime || event.start?.date})`);
      });

      // Process events and create working hours
      for (const event of events) {
        try {
          const workingHour = await this.parseEventToWorkingHours(event, doctorId);
          if (workingHour) {
            // Check if working hours already exist for this day
            const existing = await this.prisma.workingHours.findUnique({
              where: {
                doctorId_dayOfWeek: {
                  doctorId: doctorId,
                  dayOfWeek: workingHour.dayOfWeek
                }
              }
            });

            if (existing) {
              // Update existing working hours
              const updated = await this.prisma.workingHours.update({
                where: { id: existing.id },
                data: {
                  startTime: workingHour.startTime,
                  endTime: workingHour.endTime,
                  isActive: workingHour.isActive,
                  slotDuration: workingHour.slotDuration,
                  breakDuration: workingHour.breakDuration
                }
              });
              workingHoursUpdated.push(updated);
              console.log(`Updated working hours for day ${workingHour.dayOfWeek}`);
            } else {
              // Create new working hours
              const created = await this.prisma.workingHours.create({
                data: workingHour
              });
              workingHoursCreated.push(created);
              console.log(`Created working hours for day ${workingHour.dayOfWeek}`);
            }
          }
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error.message);
          errors.push(`Event ${event.summary}: ${error.message}`);
        }
      }

      // Generate schedules and slots for the imported working hours
      let schedulesGenerated = 0;
      let slotsGenerated = 0;
      
      if (workingHoursCreated.length > 0 || workingHoursUpdated.length > 0) {
        console.log('🔄 Generating schedules and slots for imported working hours...');
        
        try {
          // Generate schedules for the same date range as the import
          const generateResult = await this.generateSchedulesForDateRange(
            doctorId,
            startDate,
            endDate
          );
          
          schedulesGenerated = generateResult.schedulesCreated;
          slotsGenerated = generateResult.slotsCreated;
          
          console.log(`✅ Generated ${schedulesGenerated} schedules and ${slotsGenerated} slots`);
        } catch (error) {
          console.error('Error generating schedules:', error.message);
          errors.push(`Schedule generation failed: ${error.message}`);
        }
      }

      return {
        success: true,
        workingHoursCreated: workingHoursCreated.length,
        workingHoursUpdated: workingHoursUpdated.length,
        totalProcessed: workingHoursCreated.length + workingHoursUpdated.length,
        schedulesGenerated: schedulesGenerated,
        slotsGenerated: slotsGenerated,
        errors
      };
    } catch (error) {
      console.error('Error importing working hours from Google Calendar:', error.message);
      return {
        success: false,
        workingHoursCreated: 0,
        workingHoursUpdated: 0,
        totalProcessed: 0,
        schedulesGenerated: 0,
        slotsGenerated: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Parse Google Calendar event to working hours format
   */
  private async parseEventToWorkingHours(event: any, doctorId: string): Promise<any | null> {
    try {
      // Check if event is a working hours event
      const summary = event.summary?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      
      if (!this.isWorkingHoursEvent(summary, description)) {
        return null;
      }

      // Parse start and end times
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      if (!startTime || !endTime) {
        return null;
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      const dayOfWeek = start.getDay();

      // Extract time components
      const startTimeStr = start.toTimeString().slice(0, 5); // HH:MM format
      const endTimeStr = end.toTimeString().slice(0, 5); // HH:MM format

      // Parse slot and break duration from description or use defaults
      let slotDuration = 20; // default 20 minutes
      let breakDuration = 10; // default 10 minutes

      if (event.description) {
        const slotMatch = event.description.match(/slot[:\s]*(\d+)/i);
        const breakMatch = event.description.match(/break[:\s]*(\d+)/i);
        
        if (slotMatch) slotDuration = parseInt(slotMatch[1]);
        if (breakMatch) breakDuration = parseInt(breakMatch[1]);
      }

      return {
        doctorId,
        dayOfWeek,
        startTime: startTimeStr,
        endTime: endTimeStr,
        isActive: true,
        slotDuration,
        breakDuration
      };
    } catch (error) {
      console.error('Error parsing event:', error);
      return null;
    }
  }

  /**
   * Check if an event is a working hours event
   */
  private isWorkingHoursEvent(summary: string, description: string): boolean {
    const workingHoursKeywords = [
      'working hours',
      'workinghours',
      'working-hours',
      'availability',
      'schedule',
      'office hours',
      'officehours',
      'office-hours',
      'clinic hours',
      'clinic hours',
      'clinic-hours',
      'consultation hours',
      'consultationhours',
      'consultation-hours',
      'appointment hours',
      'appointmenthours',
      'appointment-hours'
    ];

    const text = `${summary} ${description}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    console.log(`🔍 Checking event: "${summary}" -> "${text}"`);
    
    const isMatch = workingHoursKeywords.some(keyword => {
      const keywordNormalized = keyword.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const matches = text.includes(keywordNormalized);
      if (matches) {
        console.log(`✅ Matched keyword: "${keywordNormalized}"`);
      }
      return matches;
    });
    
    console.log(`🎯 Event "${summary}" is working hours: ${isMatch}`);
    return isMatch;
  }

  /**
   * Get available time slots from Google Calendar for a specific date
   */
  async getAvailableSlotsFromCalendar(
    doctorId: string,
    date: Date
  ): Promise<{ success: boolean; slots: any[]; errors: string[] }> {
    const slots: any[] = [];
    const errors: string[] = [];

    try {
      // Check if doctor is connected
      const isConnected = await this.oauthService.isDoctorConnected(doctorId);
      if (!isConnected) {
        throw new Error('Doctor is not connected to Google Calendar');
      }

      // Get doctor's OAuth client
      const oauthResult = await this.oauthService.getDoctorOAuthClient(doctorId);
      if (!oauthResult.success) {
        throw new Error(oauthResult.error);
      }

      // Get doctor information
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { googleCalendarId: true }
      });

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Create calendar instance
      const calendar = google.calendar({ version: 'v3', auth: oauthResult.client });
      const calendarId = doctor.googleCalendarId || 'primary';

      // Get events for the specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      
      // Find working hours event for this day
      const workingHoursEvent = events.find(event => 
        this.isWorkingHoursEvent(
          event.summary?.toLowerCase() || '',
          event.description?.toLowerCase() || ''
        )
      );

      if (workingHoursEvent) {
        // Generate slots based on working hours event
        const startTime = new Date(workingHoursEvent.start?.dateTime || workingHoursEvent.start?.date);
        const endTime = new Date(workingHoursEvent.end?.dateTime || workingHoursEvent.end?.date);
        
        // Parse slot duration from description or use default
        let slotDuration = 20;
        if (workingHoursEvent.description) {
          const slotMatch = workingHoursEvent.description.match(/slot[:\s]*(\d+)/i);
          if (slotMatch) slotDuration = parseInt(slotMatch[1]);
        }

        // Generate slots
        const currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
          
          if (slotEnd <= endTime) {
            slots.push({
              startTime: currentTime.toTimeString().slice(0, 5),
              endTime: slotEnd.toTimeString().slice(0, 5),
              isAvailable: true
            });
          }
          
          currentTime.setTime(slotEnd.getTime());
        }
      }

      return {
        success: true,
        slots,
        errors
      };
    } catch (error) {
      console.error('Error getting available slots from calendar:', error.message);
      return {
        success: false,
        slots: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Generate schedules and slots for specific dates where events exist
   */
  private async generateSchedulesForDateRange(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ schedulesCreated: number; slotsCreated: number }> {
    let schedulesCreated = 0;
    let slotsCreated = 0;

    try {
      // Get all working hours for the doctor
      const workingHours = await this.prisma.workingHours.findMany({
        where: { doctorId, isActive: true }
      });

      if (workingHours.length === 0) {
        console.log('No active working hours found for doctor');
        return { schedulesCreated: 0, slotsCreated: 0 };
      }

      // Get the specific dates where events were found during import
      // We'll create schedules only for dates that have working hours events
      const eventDates = await this.getEventDatesFromCalendar(doctorId, startDate, endDate);
      
      console.log(`Found ${eventDates.length} event dates to create schedules for`);

      for (const eventDate of eventDates) {
        const dayOfWeek = eventDate.getDay();
        const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
        
        console.log(`Processing event date ${eventDate.toDateString()} (day ${dayOfWeek}) - working hour found: ${!!workingHour}`);

        if (workingHour) {
          try {
            // Check if schedule already exists for this date and time
            const existingSchedule = await this.prisma.schedule.findFirst({
              where: {
                doctorId,
                date: eventDate,
                startTime: workingHour.startTime
              }
            });

            if (!existingSchedule) {
              try {
                // Create schedule
                const schedule = await this.prisma.schedule.create({
                  data: {
                    doctorId,
                    date: eventDate,
                    startTime: workingHour.startTime,
                    endTime: workingHour.endTime,
                    workingHoursId: workingHour.id
                  }
                });

                schedulesCreated++;

                // Generate slots for this schedule
                const slots = this.generateSlots(
                  workingHour.startTime,
                  workingHour.endTime,
                  workingHour.slotDuration,
                  workingHour.breakDuration
                );

                // Create slots in database
                for (const slot of slots) {
                  await this.prisma.slot.create({
                    data: {
                      scheduleId: schedule.id,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                      isAvailable: true
                    }
                  });
                  slotsCreated++;
                }

                console.log(`Created schedule for ${eventDate.toDateString()} with ${slots.length} slots`);
              } catch (createError) {
                if (createError.code === 'P2002') {
                  // Unique constraint violation - schedule already exists
                  console.log(`Schedule already exists for ${eventDate.toDateString()}, skipping...`);
                } else {
                  throw createError;
                }
              }
            } else {
              console.log(`Schedule already exists for ${eventDate.toDateString()}, skipping...`);
            }
          } catch (error) {
            console.error(`Error creating schedule for ${eventDate.toDateString()}:`, error.message);
          }
        }
      }

    } catch (error) {
      console.error('Error generating schedules for date range:', error.message);
    }

    return { schedulesCreated, slotsCreated };
  }

  /**
   * Get specific dates where working hours events exist in Google Calendar
   */
  private async getEventDatesFromCalendar(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> {
    try {
      const oauthResult = await this.oauthService.getDoctorOAuthClient(doctorId);
      if (!oauthResult.success) {
        throw new Error(oauthResult.error);
      }

      const calendar = google.calendar({ version: 'v3', auth: oauthResult.client });
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      const calendarId = doctor?.googleCalendarId || 'primary';

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const eventDates: Date[] = [];

      for (const event of events) {
        if (this.isWorkingHoursEvent(event.summary || '', event.description || '')) {
          // Use the date directly from the event, don't convert to Date object
          const eventDateStr = event.start?.date || event.start?.dateTime?.split('T')[0];
          
          if (eventDateStr) {
            const eventDate = new Date(eventDateStr + 'T00:00:00.000Z');
            eventDates.push(eventDate);
            console.log(`Found working hours event on ${eventDate.toDateString()} (date string: ${eventDateStr})`);
          }
        }
      }

      return eventDates;
    } catch (error) {
      console.error('Error getting event dates from calendar:', error.message);
      return [];
    }
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
}
