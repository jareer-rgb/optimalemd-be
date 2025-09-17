import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
const { google } = require('googleapis');

@Injectable()
export class GoogleCalendarOAuthService {
  private oauth2Client: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    this.initializeOAuth2Client();
  }

  /**
   * Initialize OAuth2 client with app credentials
   */
  private initializeOAuth2Client() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI') || 'http://localhost:3000/api/google-calendar/oauth/callback';

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate OAuth2 authorization URL for a doctor
   */
  generateAuthUrl(doctorId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.events.owned'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: doctorId, // Pass doctor ID in state for security
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<{ success: boolean; doctorId?: string; error?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Verify state matches doctor ID
      const doctorId = state;
      if (!doctorId) {
        throw new Error('Invalid state parameter');
      }

      // Verify doctor exists
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Store tokens in database
      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          googleRefreshToken: tokens.refresh_token,
          googleAccessToken: tokens.access_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          googleCalendarConnected: true
        }
      });

      // Get doctor's primary calendar ID
      const calendarId = await this.getDoctorCalendarId(doctorId);
      if (calendarId) {
        await this.prisma.doctor.update({
          where: { id: doctorId },
          data: { googleCalendarId: calendarId }
        });
      }

      return { success: true, doctorId };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get doctor's primary calendar ID
   */
  private async getDoctorCalendarId(doctorId: string): Promise<string | null> {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor?.googleRefreshToken) {
        return null;
      }

      // Set credentials for this doctor
      this.oauth2Client.setCredentials({
        refresh_token: doctor.googleRefreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // First, try to get the primary calendar directly
      try {
        const primaryCalendar = await calendar.calendars.get({
          calendarId: 'primary'
        });
        console.log('✅ Using primary calendar:', primaryCalendar.data.summary);
        return 'primary';
      } catch (primaryError) {
        console.log('⚠️ Primary calendar not accessible, searching for primary in calendar list...');
        
        // Fallback: search through calendar list for primary calendar
        const response = await calendar.calendarList.list();
        const calendars = response.data.items || [];
        
        // Look for the primary calendar first
        const primaryCalendar = calendars.find(cal => cal.primary === true);
        if (primaryCalendar) {
          console.log('✅ Found primary calendar in list:', primaryCalendar.summary);
          return primaryCalendar.id;
        }
        
        // If no primary found, look for the user's email calendar
        const userEmail = doctor.email;
        const userCalendar = calendars.find(cal => 
          cal.id === userEmail || 
          cal.summary === userEmail ||
          cal.id?.includes(userEmail?.split('@')[0])
        );
        if (userCalendar) {
          console.log('✅ Found user email calendar:', userCalendar.summary);
          return userCalendar.id;
        }
        
        // Last resort: use the first calendar that's not a holiday calendar
        const nonHolidayCalendar = calendars.find(cal => 
          !cal.id?.includes('holiday') && 
          !cal.id?.includes('group.calendar.google.com')
        );
        if (nonHolidayCalendar) {
          console.log('⚠️ Using first non-holiday calendar:', nonHolidayCalendar.summary);
          return nonHolidayCalendar.id;
        }
        
        // Final fallback
        console.log('⚠️ No suitable calendar found, using primary as fallback');
        return 'primary';
      }
    } catch (error) {
      console.error('Error getting doctor calendar ID:', error);
      return 'primary'; // Always fallback to primary
    }
  }

  /**
   * Refresh access token for a doctor
   */
  async refreshDoctorToken(doctorId: string): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor?.googleRefreshToken) {
        return { success: false, error: 'No refresh token found' };
      }

      // Set credentials
      this.oauth2Client.setCredentials({
        refresh_token: doctor.googleRefreshToken
      });

      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update database with new tokens
      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        }
      });

      return { success: true, accessToken: credentials.access_token };
    } catch (error) {
      console.error('Error refreshing doctor token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get authenticated OAuth2 client for a specific doctor
   */
  async getDoctorOAuthClient(doctorId: string): Promise<{ success: boolean; client?: any; error?: string }> {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor?.googleRefreshToken) {
        return { success: false, error: 'Doctor not connected to Google Calendar' };
      }

      // Check if token needs refresh
      const now = new Date();
      const tokenExpiry = doctor.googleTokenExpiry;
      
      if (!tokenExpiry || now >= tokenExpiry) {
        const refreshResult = await this.refreshDoctorToken(doctorId);
        if (!refreshResult.success) {
          return { success: false, error: refreshResult.error };
        }
      }

      // Set credentials for this doctor
      this.oauth2Client.setCredentials({
        refresh_token: doctor.googleRefreshToken,
        access_token: doctor.googleAccessToken
      });

      return { success: true, client: this.oauth2Client };
    } catch (error) {
      console.error('Error getting doctor OAuth client:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect doctor from Google Calendar
   */
  async disconnectDoctor(doctorId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          googleCalendarConnected: false,
          googleCalendarId: null,
          googleRefreshToken: null,
          googleAccessToken: null,
          googleTokenExpiry: null
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting doctor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if doctor is connected to Google Calendar
   */
  async isDoctorConnected(doctorId: string): Promise<boolean> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { googleCalendarConnected: true }
    });

    return doctor?.googleCalendarConnected || false;
  }

  /**
   * Fix calendar ID for existing doctors (admin function)
   */
  async fixDoctorCalendarId(doctorId: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor?.googleRefreshToken) {
        return { success: false, message: 'Doctor not connected to Google Calendar' };
      }

      const correctCalendarId = await this.getDoctorCalendarId(doctorId);
      if (!correctCalendarId) {
        return { success: false, message: 'Could not determine correct calendar ID' };
      }

      // Update the doctor's calendar ID
      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: { googleCalendarId: correctCalendarId }
      });

      return { 
        success: true, 
        message: `Updated calendar ID to: ${correctCalendarId}` 
      };
    } catch (error) {
      console.error('Error fixing doctor calendar ID:', error);
      return { success: false, message: 'Failed to fix calendar ID', error: error.message };
    }
  }

  /**
   * Fix calendar IDs for all connected doctors (admin function)
   */
  async fixAllDoctorsCalendarIds(): Promise<{ success: boolean; fixed: number; errors: string[] }> {
    try {
      const connectedDoctors = await this.prisma.doctor.findMany({
        where: { googleCalendarConnected: true },
        select: { id: true, email: true, googleCalendarId: true }
      });

      let fixed = 0;
      const errors: string[] = [];

      for (const doctor of connectedDoctors) {
        try {
          const result = await this.fixDoctorCalendarId(doctor.id);
          if (result.success) {
            fixed++;
            console.log(`✅ Fixed calendar ID for ${doctor.email}: ${result.message}`);
          } else {
            errors.push(`${doctor.email}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`${doctor.email}: ${error.message}`);
        }
      }

      return { success: true, fixed, errors };
    } catch (error) {
      console.error('Error fixing all doctors calendar IDs:', error);
      return { success: false, fixed: 0, errors: [error.message] };
    }
  }
}
