import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import { dateTimeToUTC, toISODateString } from '../common/utils/timezone.utils';
const { google } = require('googleapis');

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private calendar: any;
  private auth: any;
  private credentialsValid: boolean = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private oauthService: GoogleCalendarOAuthService
  ) {}

  async onModuleInit() {
    await this.initializeGoogleCalendar();
    await this.validateCredentials();
  }

  /**
   * Initialize Google Calendar API
   */
  private async initializeGoogleCalendar() {
    try {
      // Check if Google API credentials are configured
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
      const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

      if (!clientId || !clientSecret || !refreshToken) {
        console.warn('⚠️  Google API credentials not configured. Using fallback Meet links.');
        console.warn('   Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your .env file');
        return;
      }

      // Initialize OAuth2 client
      this.auth = new google.auth.OAuth2(clientId, clientSecret);
      
      // Set credentials
      this.auth.setCredentials({
        refresh_token: refreshToken
      });

      // Initialize Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      console.log('✅ Google Calendar API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar API:', error);
    }
  }

  /**
   * Validate Google API credentials by testing a simple API call
   */
  private async validateCredentials() {
    try {
      if (!this.calendar) {
        console.warn('⚠️  Google Calendar API not available - skipping credential validation');
        return;
      }

      console.log('🔍 Validating Google API credentials...');

      // Test the credentials by making a simple API call
      const response = await this.calendar.calendarList.list({
        maxResults: 1
      });

      if (response.data && response.data.items) {
        this.credentialsValid = true;
        console.log('✅ Google API credentials are valid!');
        console.log(`   Calendar access confirmed for: ${response.data.items[0]?.summary || 'Primary calendar'}`);
      } else {
        throw new Error('Invalid response from Google Calendar API');
      }
    } catch (error) {
      this.credentialsValid = false;
      console.error('❌ Google API credentials validation failed:', error.message);
      console.error('   Please check your GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN');
      console.error('   Make sure your OAuth app is properly configured and the refresh token is valid');
    }
  }

  /**
   * Check if credentials are valid
   */
  public areCredentialsValid(): boolean {
    return this.credentialsValid;
  }

  /**
   * Generate a real Google Meet link for an appointment
   * This creates an actual Google Calendar event with Meet integration
   */
  /**
   * Sync working hours to Google Calendar for a specific doctor
   */
  async syncWorkingHoursToCalendar(
    doctorId: string,
    workingHours: any[],
    startDate: Date,
    endDate: Date
  ): Promise<{ success: boolean; eventsCreated: number; errors: string[] }> {
    const eventsCreated: any[] = [];
    const errors: string[] = [];

    try {
      // Check if doctor is connected to Google Calendar
      const isConnected = await this.oauthService.isDoctorConnected(doctorId);
      if (!isConnected) {
        throw new Error('Doctor is not connected to Google Calendar. Please connect your Google Calendar first.');
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

      // Create calendar instance with doctor's credentials
      const calendar = google.calendar({ version: 'v3', auth: oauthResult.client });
      // Always use primary calendar for working hours to avoid permission issues
      const calendarId = 'primary';

      // Check calendar permissions before creating events
      try {
        const calendarInfo = await calendar.calendars.get({
          calendarId: calendarId
        });
        console.log(`✅ Calendar access confirmed: ${calendarInfo.data.summary}`);
      } catch (error) {
        console.error('❌ Calendar access denied:', error.message);
        // Try to create a dedicated calendar for the doctor
        try {
          console.log('🔄 Attempting to create dedicated calendar...');
          const newCalendar = await calendar.calendars.insert({
            requestBody: {
              summary: `Dr. ${doctor.firstName} ${doctor.lastName} - Working Hours`,
              description: 'Working hours and appointments for OptimaleMD',
              timeZone: 'UTC'
            }
          });
          console.log(`✅ Created dedicated calendar: ${newCalendar.data.id}`);
          // Update doctor's calendar ID
          await this.prisma.doctor.update({
            where: { id: doctorId },
            data: { googleCalendarId: newCalendar.data.id }
          });
        } catch (createError) {
          console.error('❌ Failed to create calendar:', createError.message);
          throw new Error(`Cannot access or create calendar: ${error.message}`);
        }
      }

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getUTCDay(); // Use UTC day of week
        const workingHour = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);

        if (workingHour && workingHour.isActive) {
          try {
            // Create a calendar event for the working hours
            // Use UTC methods to avoid timezone shifts
            const dateString = toISODateString(currentDate);
            const startTime = dateTimeToUTC(dateString, workingHour.startTime);
            const endTime = dateTimeToUTC(dateString, workingHour.endTime);

            const event = {
              summary: `Dr. ${doctor.firstName} ${doctor.lastName} - Working Hours`,
              description: `Dr. ${doctor.firstName} ${doctor.lastName} is available for appointments.\n\nSlot Duration: ${workingHour.slotDuration} minutes\nBreak Duration: ${workingHour.breakDuration} minutes`,
              start: {
                dateTime: startTime.toISOString(),
                timeZone: 'UTC',
              },
              end: {
                dateTime: endTime.toISOString(),
                timeZone: 'UTC',
              },
              colorId: '2', // Green color for working hours
              visibility: 'private',
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 24 * 60 }, // 1 day before
                  { method: 'popup', minutes: 30 }, // 30 minutes before
                ],
              },
            };

            const response = await calendar.events.insert({
              calendarId: calendarId,
              resource: event,
              sendUpdates: 'none', // Don't send email notifications for working hours
            });

            eventsCreated.push({
              date: currentDate.toISOString().split('T')[0],
              eventId: response.data.id,
              startTime: workingHour.startTime,
              endTime: workingHour.endTime
            });

            console.log(`✅ Working hours synced to Dr. ${doctor.firstName}'s Google Calendar for ${currentDate.toISOString().split('T')[0]}`);
          } catch (error) {
            console.error(`❌ Error syncing working hours for ${currentDate.toISOString().split('T')[0]}:`, error.message);
            errors.push(`${currentDate.toISOString().split('T')[0]}: ${error.message}`);
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        success: true,
        eventsCreated: eventsCreated.length,
        errors
      };
    } catch (error) {
      console.error('❌ Error syncing working hours to Google Calendar:', error.message);
      return {
        success: false,
        eventsCreated: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Get doctor information (helper method)
   */
  private async getDoctorInfo(doctorId: string): Promise<any> {
    // This would typically come from your database
    // For now, we'll return a placeholder
    return {
      id: doctorId,
      firstName: 'Doctor',
      lastName: 'Name'
    };
  }

  async generateMeetLink(
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    doctorName: string,
    patientName: string,
    serviceName: string,
    patientEmail?: string,
    doctorEmail?: string,
    patientTimezone?: string // Optional IANA timezone (e.g., "America/New_York"). Defaults to server timezone if not provided.
  ): Promise<{ meetLink: string; eventId?: string }> {
    // SKIPPED: Google Calendar event creation is disabled per user request
    // Only generating Meet link without creating calendar events
    console.log('📅 Google Calendar event creation skipped - using fallback Meet link only');
    return { meetLink: this.createFallbackMeetLink() };

    /* COMMENTED OUT: Google Calendar event creation
    try {
      // Check if credentials are valid
      if (!this.credentialsValid) {
        console.log('⚠️  Google API credentials not valid, using fallback Meet link');
        return { meetLink: this.createFallbackMeetLink() };
      }

      // If Google Calendar API is not configured, use fallback
      if (!this.calendar) {
        console.log('⚠️  Google Calendar API not available, using fallback Meet link');
        return { meetLink: this.createFallbackMeetLink() };
      }

      // Parse appointment time (format: "HH:MM")
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      
      // Get date string in YYYY-MM-DD format
      const dateString = toISODateString(appointmentDate);
      
      // IMPORTANT: appointmentTime is stored in UTC in the database
      // We convert UTC to New York timezone for Google Calendar event
      // Google Calendar will then auto-convert for each attendee based on their calendar settings
      
      // Create UTC date from the appointment time
      const [year, month, day] = dateString.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      
      // Convert UTC to New York timezone
      const nyTimezone = 'America/New_York';
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: nyTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: nyTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      // Format start time in New York timezone
      const startParts = timeFormatter.formatToParts(utcDate);
      const startDateParts = dateFormatter.formatToParts(utcDate);
      
      const startYear = startDateParts.find(p => p.type === 'year')?.value || String(year);
      const startMonth = startDateParts.find(p => p.type === 'month')?.value || String(month).padStart(2, '0');
      const startDay = startDateParts.find(p => p.type === 'day')?.value || String(day).padStart(2, '0');
      const startHour = startParts.find(p => p.type === 'hour')?.value || String(hours).padStart(2, '0');
      const startMinute = startParts.find(p => p.type === 'minute')?.value || String(minutes).padStart(2, '0');
      
      const startDateTime = `${startYear}-${startMonth}-${startDay}T${startHour}:${startMinute}:00`;
      
      // Calculate end time in New York timezone
      const endUtcDate = new Date(utcDate.getTime() + duration * 60000);
      const endParts = timeFormatter.formatToParts(endUtcDate);
      const endDateParts = dateFormatter.formatToParts(endUtcDate);
      
      const endYear = endDateParts.find(p => p.type === 'year')?.value || String(year);
      const endMonth = endDateParts.find(p => p.type === 'month')?.value || String(month).padStart(2, '0');
      const endDay = endDateParts.find(p => p.type === 'day')?.value || String(day).padStart(2, '0');
      const endHour = endParts.find(p => p.type === 'hour')?.value || String(hours).padStart(2, '0');
      const endMinute = endParts.find(p => p.type === 'minute')?.value || String(minutes).padStart(2, '0');
      
      const endDateTime = `${endYear}-${endMonth}-${endDay}T${endHour}:${endMinute}:00`;

      console.log(`📅 Creating Google Calendar event (New York timezone):`);
      console.log(`   UTC time from DB: ${appointmentTime}`);
      console.log(`   Start: ${startDateTime} (${nyTimezone})`);
      console.log(`   End: ${endDateTime} (${nyTimezone})`);
      console.log(`   Google Calendar will auto-convert for each attendee's timezone`);

      // Prepare attendees array
      const attendees: { email: string }[] = [];
      
      // Add doctor email if provided, otherwise use default
      if (doctorEmail) {
        attendees.push({ email: doctorEmail });
      } else {
        attendees.push({ email: this.configService.get<string>('DOCTOR_EMAIL') || 'doctor@optimaleMD.com' });
      }
      
      // Add patient email if provided
      if (patientEmail) {
        attendees.push({ email: patientEmail });
      }

      // Create calendar event with Meet integration
      // Using New York timezone for consistency (Google Calendar will auto-convert for each attendee)
      const event = {
        summary: `${serviceName} - ${doctorName} & ${patientName}`,
        description: `OptimaleMD Telemedicine Appointment\n\nDoctor: ${doctorName}\nPatient: ${patientName}\nService: ${serviceName}\n\nPlease join this Google Meet call at your scheduled appointment time.`,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/New_York',
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 10 }, // 10 minutes before
          ],
        },
      };

      console.log('📅 Creating Google Calendar event with Meet integration...');

      // Create the calendar event
      const response = await this.calendar.events.insert({
        calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send email notifications to attendees
      });

      console.log('✅ Google Calendar event created successfully');

      // Extract Meet link from response
      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === 'video'
      )?.uri;

      if (meetLink) {
        console.log('🔗 Meet link generated:', meetLink);
        console.log(`📅 Calendar event created for ${dateString} at ${appointmentTime}`);
        console.log(`   Event ID: ${response.data.id}`);
        return { 
          meetLink,
          eventId: response.data.id
        };
      } else {
        console.error('❌ Failed to extract Meet link from calendar event');
        throw new Error('Failed to create Meet link');
      }
    } catch (error) {
      console.error('❌ Error creating Google Calendar event with Meet:', error);
      
      // Fallback to simple Meet link if API fails
      console.log('⚠️  Using fallback Meet link due to API error');
      return { meetLink: this.createFallbackMeetLink() };
    }
    */
  }

  /**
   * Create a fallback Meet link for development/testing
   * This is used when Google Calendar API is not configured or fails
   */
  private createFallbackMeetLink(): string {
    // Generate a simple meeting ID for development
    const meetingId = this.generateMeetingId();
    const fallbackLink = `https://meet.google.com/${meetingId}`;
    console.log('🔗 Generated fallback Meet link:', fallbackLink);
    return fallbackLink;
  }

  /**
   * Generate a unique meeting ID for Google Meet
   */
  private generateMeetingId(): string {
    // Google Meet IDs are typically 3 groups of 3-4 characters separated by hyphens
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const generateGroup = (length: number) => {
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };
    
    // Create a more realistic meeting ID format
    return `${generateGroup(3)}-${generateGroup(4)}-${generateGroup(3)}`;
  }

  /**
   * Update calendar event with patient email
   * This can be called after the initial event creation to add the patient
   * NOTE: This is now redundant since we pass patient email during initial creation.
   * Keeping it for backward compatibility but using 'none' to avoid duplicate emails.
   */
  async updateEventWithPatientEmail(eventId: string, patientEmail: string): Promise<void> {
    try {
      if (!this.calendar) {
        console.warn('⚠️  Google Calendar API not available, skipping event update');
        return;
      }

      // Get existing event to check if patient is already an attendee
      const existingEvent = await this.calendar.events.get({
        calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
        eventId: eventId,
      });

      // Check if patient email is already in attendees
      const existingAttendees = existingEvent.data.attendees || [];
      const patientAlreadyAttendee = existingAttendees.some(
        (attendee: any) => attendee.email === patientEmail
      );

      // Only update if patient is not already an attendee
      if (!patientAlreadyAttendee) {
        await this.calendar.events.patch({
        calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
        eventId: eventId,
        resource: {
          attendees: [
              ...existingAttendees,
            { email: patientEmail },
          ],
        },
          sendUpdates: 'none', // Don't send email notifications to avoid duplicate emails
      });

      console.log('✅ Calendar event updated with patient email');
      } else {
        console.log('ℹ️  Patient email already in attendees, skipping update');
      }
    } catch (error) {
      console.error('❌ Error updating calendar event with patient email:', error);
    }
  }

  /**
   * Find a Google Calendar event by searching for it using appointment details
   * This is used when we don't have the eventId stored
   */
  async findEventByAppointmentDetails(
    appointmentDate: Date,
    appointmentTime: string,
    doctorName: string,
    patientName: string,
    serviceName: string
  ): Promise<string | null> {
    try {
      if (!this.calendar) {
        return null;
      }

      // Search for events on the appointment date
      const dateString = toISODateString(appointmentDate);
      const timeMin = new Date(`${dateString}T00:00:00Z`).toISOString();
      const timeMax = new Date(`${dateString}T23:59:59Z`).toISOString();

      const response = await this.calendar.events.list({
        calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
        timeMin,
        timeMax,
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      // Search for event matching our appointment details
      const searchSummary = `${serviceName} - ${doctorName} & ${patientName}`;
      const matchingEvent = response.data.items?.find(
        (event: any) => event.summary === searchSummary
      );

      return matchingEvent?.id || null;
    } catch (error) {
      console.error('❌ Error finding calendar event:', error);
      return null;
    }
  }

  /**
   * Update an existing Google Calendar event with new date/time
   * Uses the same time conversion logic as generateMeetLink
   */
  async updateEvent(
    eventId: string,
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    doctorName: string,
    patientName: string,
    serviceName: string,
    patientEmail?: string,
    doctorEmail?: string,
    patientTimezone?: string // Optional IANA timezone (e.g., "America/New_York"). Defaults to server timezone if not provided.
  ): Promise<{ meetLink: string; eventId: string }> {
    // SKIPPED: Google Calendar event updates are disabled per user request
    // Only generating Meet link without updating calendar events
    console.log('📅 Google Calendar event update skipped - using fallback Meet link only');
    return { meetLink: this.createFallbackMeetLink(), eventId: eventId || 'skipped' };

    /* COMMENTED OUT: Google Calendar event update
    try {
      // Check if credentials are valid
      if (!this.credentialsValid || !this.calendar) {
        console.log('⚠️  Google API credentials not valid, cannot update event');
        throw new Error('Google Calendar API not available');
      }

      // Parse appointment time (format: "HH:MM") - stored in UTC
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      
      // Get date string in YYYY-MM-DD format
      const dateString = toISODateString(appointmentDate);
      
      // IMPORTANT: appointmentTime is stored in UTC in the database
      // We convert UTC to New York timezone for Google Calendar event
      // Google Calendar will then auto-convert for each attendee based on their calendar settings
      
      // Create UTC date from the appointment time
      const [year, month, day] = dateString.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      
      // Convert UTC to New York timezone
      const nyTimezone = 'America/New_York';
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: nyTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: nyTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      // Format start time in New York timezone
      const startParts = timeFormatter.formatToParts(utcDate);
      const startDateParts = dateFormatter.formatToParts(utcDate);
      
      const startYear = startDateParts.find(p => p.type === 'year')?.value || String(year);
      const startMonth = startDateParts.find(p => p.type === 'month')?.value || String(month).padStart(2, '0');
      const startDay = startDateParts.find(p => p.type === 'day')?.value || String(day).padStart(2, '0');
      const startHour = startParts.find(p => p.type === 'hour')?.value || String(hours).padStart(2, '0');
      const startMinute = startParts.find(p => p.type === 'minute')?.value || String(minutes).padStart(2, '0');
      
      const startDateTime = `${startYear}-${startMonth}-${startDay}T${startHour}:${startMinute}:00`;
      
      // Calculate end time in New York timezone
      const endUtcDate = new Date(utcDate.getTime() + duration * 60000);
      const endParts = timeFormatter.formatToParts(endUtcDate);
      const endDateParts = dateFormatter.formatToParts(endUtcDate);
      
      const endYear = endDateParts.find(p => p.type === 'year')?.value || String(year);
      const endMonth = endDateParts.find(p => p.type === 'month')?.value || String(month).padStart(2, '0');
      const endDay = endDateParts.find(p => p.type === 'day')?.value || String(day).padStart(2, '0');
      const endHour = endParts.find(p => p.type === 'hour')?.value || String(hours).padStart(2, '0');
      const endMinute = endParts.find(p => p.type === 'minute')?.value || String(minutes).padStart(2, '0');
      
      const endDateTime = `${endYear}-${endMonth}-${endDay}T${endHour}:${endMinute}:00`;

      console.log(`📅 Updating Google Calendar event (New York timezone):`);
      console.log(`   UTC time from DB: ${appointmentTime}`);
      console.log(`   Start: ${startDateTime} (${nyTimezone})`);
      console.log(`   End: ${endDateTime} (${nyTimezone})`);
      console.log(`   Google Calendar will auto-convert for each attendee's timezone`);

      // Prepare attendees array
      const attendees: { email: string }[] = [];
      
      // Add doctor email if provided, otherwise use default
      if (doctorEmail) {
        attendees.push({ email: doctorEmail });
      } else {
        attendees.push({ email: this.configService.get<string>('DOCTOR_EMAIL') || 'doctor@optimaleMD.com' });
      }
      
      // Add patient email if provided
      if (patientEmail) {
        attendees.push({ email: patientEmail });
      }

      // Update calendar event using New York timezone for consistency
      const response = await this.calendar.events.patch({
        calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
        eventId: eventId,
        resource: {
          summary: `${serviceName} - ${doctorName} & ${patientName}`,
          description: `OptimaleMD Telemedicine Appointment\n\nDoctor: ${doctorName}\nPatient: ${patientName}\nService: ${serviceName}\n\nPlease join this Google Meet call at your scheduled appointment time.`,
          start: {
            dateTime: startDateTime,
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: endDateTime,
            timeZone: 'America/New_York',
          },
          attendees,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 10 }, // 10 minutes before
            ],
          },
        },
        sendUpdates: 'all', // Send email notifications to attendees
      });

      console.log('✅ Google Calendar event updated successfully');

      // Extract Meet link from response (should remain the same)
      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === 'video'
      )?.uri;

      if (meetLink) {
        console.log('🔗 Meet link from updated event:', meetLink);
        return { 
          meetLink,
          eventId: response.data.id
        };
      } else {
        // If Meet link is not in response, try to get it from the existing event
        const existingEvent = await this.calendar.events.get({
          calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
          eventId: eventId,
        });
        
        const existingMeetLink = existingEvent.data.conferenceData?.entryPoints?.find(
          (entry: any) => entry.entryPointType === 'video'
        )?.uri;
        
        if (existingMeetLink) {
          console.log('🔗 Using existing Meet link:', existingMeetLink);
          return { 
            meetLink: existingMeetLink,
            eventId: response.data.id
          };
        } else {
          throw new Error('Failed to retrieve Meet link from updated event');
        }
      }
    } catch (error) {
      console.error('❌ Error updating Google Calendar event:', error);
      throw error;
    }
    */
  }
}
