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
    doctorEmail?: string
  ): Promise<{ meetLink: string; eventId?: string }> {
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
      // We need to convert it to the user's LOCAL time before creating the calendar event
      // This way the calendar shows the ACTUAL local time without timezone labels
      
      // Create a UTC date and convert to local time
      const [year, month, day] = dateString.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      
      // Get local time components
      const localYear = utcDate.getFullYear();
      const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
      const localDay = String(utcDate.getDate()).padStart(2, '0');
      const localHours = String(utcDate.getHours()).padStart(2, '0');
      const localMinutes = String(utcDate.getMinutes()).padStart(2, '0');
      
      const localDateString = `${localYear}-${localMonth}-${localDay}`;
      const startDateTime = `${localDateString}T${localHours}:${localMinutes}:00`;
      
      // Calculate end time in local
      const endDate = new Date(utcDate.getTime() + duration * 60000);
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const endHours = String(endDate.getHours()).padStart(2, '0');
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
      
      const endDateString = `${endYear}-${endMonth}-${endDay}`;
      const endDateTime = `${endDateString}T${endHours}:${endMinutes}:00`;

      console.log(`📅 Creating Google Calendar event:`);
      console.log(`   UTC time from DB: ${appointmentTime}`);
      console.log(`   Converted to local: ${localHours}:${localMinutes}`);
      console.log(`   Start: ${startDateTime}`);
      console.log(`   End: ${endDateTime}`);

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
      // Get user's timezone (default to UTC if not available)
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      
      const event = {
        summary: `${serviceName} - ${doctorName} & ${patientName}`,
        description: `OptimaleMD Telemedicine Appointment\n\nDoctor: ${doctorName}\nPatient: ${patientName}\nService: ${serviceName}\n\nPlease join this Google Meet call at your scheduled appointment time.`,
        start: {
          dateTime: startDateTime,
          timeZone: userTimezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: userTimezone,
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
   */
  async updateEventWithPatientEmail(eventId: string, patientEmail: string): Promise<void> {
    try {
      if (!this.calendar) {
        console.warn('⚠️  Google Calendar API not available, skipping event update');
        return;
      }

      await this.calendar.events.patch({
        calendarId: this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'primary',
        eventId: eventId,
        resource: {
          attendees: [
            { email: this.configService.get<string>('DOCTOR_EMAIL') },
            { email: patientEmail },
          ],
        },
        sendUpdates: 'all',
      });

      console.log('✅ Calendar event updated with patient email');
    } catch (error) {
      console.error('❌ Error updating calendar event with patient email:', error);
    }
  }
}
