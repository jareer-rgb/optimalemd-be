import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleCalendarService } from './google-calendar.service';

@ApiTags('Google Calendar')
@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Google Calendar API health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Google Calendar API health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        credentialsValid: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Google Calendar API is working correctly' }
      }
    }
  })
  async getHealth() {
    const credentialsValid = this.googleCalendarService.areCredentialsValid();
    
    return {
      status: credentialsValid ? 'healthy' : 'unhealthy',
      credentialsValid,
      message: credentialsValid 
        ? 'Google Calendar API is working correctly' 
        : 'Google Calendar API credentials are not valid or not configured'
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test Google Calendar API connection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Google Calendar API test successful' },
        meetLink: { type: 'string', example: 'https://meet.google.com/abc-defg-hij' }
      }
    }
  })
  async testConnection() {
    try {
      // Test creating a simple Meet link
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1); // Tomorrow
      
      const meetResult = await this.googleCalendarService.generateMeetLink(
        testDate,
        '10:00',
        30,
        'Dr. Test Doctor',
        'Test Patient',
        'Test Consultation',
        'test@example.com'
      );

      return {
        success: true,
        message: 'Google Calendar API test successful',
        meetLink: meetResult.meetLink,
        eventId: meetResult.eventId,
        credentialsValid: this.googleCalendarService.areCredentialsValid()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Google Calendar API test failed',
        error: error.message,
        credentialsValid: this.googleCalendarService.areCredentialsValid()
      };
    }
  }

  @Post('sync-working-hours')
  @ApiOperation({
    summary: 'Sync working hours to Google Calendar',
    description: 'Sync doctor working hours to Google Calendar for a date range'
  })
  @ApiResponse({
    status: 200,
    description: 'Working hours synced successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Working hours synced successfully' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            eventsCreated: { type: 'number', example: 5 },
            errors: { type: 'array', items: { type: 'string' }, example: [] }
          }
        }
      }
    }
  })
  async syncWorkingHours(
    @Body() body: {
      doctorId: string;
      workingHours: any[];
      startDate: string;
      endDate: string;
    }
  ) {
    try {
      const result = await this.googleCalendarService.syncWorkingHoursToCalendar(
        body.doctorId,
        body.workingHours,
        new Date(body.startDate),
        new Date(body.endDate)
      );

      return {
        success: true,
        message: 'Working hours synced successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to sync working hours',
        error: error.message
      };
    }
  }

  @Get('create-meeting')
  @ApiOperation({ summary: 'Create a test Google Meet link' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test meeting creation result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Meeting created successfully' },
        meetLink: { type: 'string', example: 'https://meet.google.com/abc-defg-hij' },
        eventId: { type: 'string', example: 'event_id_123' },
        appointmentDetails: {
          type: 'object',
          properties: {
            date: { type: 'string', example: '2025-09-01' },
            time: { type: 'string', example: '14:00' },
            duration: { type: 'number', example: 30 },
            doctorName: { type: 'string', example: 'Dr. John Smith' },
            patientName: { type: 'string', example: 'Jane Doe' },
            serviceName: { type: 'string', example: 'Telemedicine Consultation' }
          }
        }
      }
    }
  })
  async createTestMeeting() {
    try {
      // Create a test appointment for tomorrow at 2 PM
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1); // Tomorrow
      testDate.setHours(14, 0, 0, 0); // 2:00 PM
      
      const meetResult = await this.googleCalendarService.generateMeetLink(
        testDate,
        '14:00',
        30,
        'Dr. John Smith',
        'Jane Doe',
        'Telemedicine Consultation',
        'jane.doe@example.com'
      );

      return {
        success: true,
        message: 'Test meeting created successfully',
        meetLink: meetResult.meetLink,
        eventId: meetResult.eventId,
        credentialsValid: this.googleCalendarService.areCredentialsValid(),
        appointmentDetails: {
          date: testDate.toISOString().split('T')[0],
          time: '14:00',
          duration: 30,
          doctorName: 'Dr. John Smith',
          patientName: 'Jane Doe',
          serviceName: 'Telemedicine Consultation'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create test meeting',
        error: error.message,
        credentialsValid: this.googleCalendarService.areCredentialsValid()
      };
    }
  }
}
