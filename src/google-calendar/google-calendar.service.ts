import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const { google } = require('googleapis');

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private calendar: any;
  private auth: any;
  private credentialsValid: boolean = false;

  constructor(private configService: ConfigService) {}

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
  async generateMeetLink(
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    doctorName: string,
    patientName: string,
    serviceName: string,
    patientEmail?: string
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
      
      // Create start time
      const startTime = new Date(appointmentDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Create end time based on duration
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      // Prepare attendees array
      const attendees = [
        { email: this.configService.get<string>('DOCTOR_EMAIL') || 'doctor@optimaleMD.com' }
      ];
      
      // Add patient email if provided
      if (patientEmail) {
        attendees.push({ email: patientEmail });
      }

      // Create calendar event with Meet integration
      const event = {
        summary: `${serviceName} - ${doctorName} & ${patientName}`,
        description: `OptimaleMD Telemedicine Appointment\n\nDoctor: ${doctorName}\nPatient: ${patientName}\nService: ${serviceName}\n\nPlease join this Google Meet call at your scheduled appointment time.`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
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
