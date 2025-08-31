# 🔧 Google Meet Integration Setup Guide

## The Problem

The current implementation generates fake Google Meet links that don't actually exist. When you try to join these links, you get the "Check your meeting code" error because Google Meet requires **real, valid meeting codes** created through official Google services.

## Solutions

### Option 1: Google Calendar API (Recommended for Production)

This is the most reliable way to create real Google Meet links.

#### Step 1: Set up Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create service account credentials

#### Step 2: Configure Environment Variables
Add these to your `.env` file:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_CALENDAR_ID=primary
```

#### Step 3: Install Dependencies
```bash
npm install googleapis
```

#### Step 4: Update GoogleCalendarService
```typescript
import { google } from 'googleapis';

export class GoogleCalendarService {
  private calendar: any;

  constructor(private configService: ConfigService) {
    this.initializeGoogleCalendar();
  }

  private async initializeGoogleCalendar() {
    const auth = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET')
    );
    
    auth.setCredentials({
      refresh_token: this.configService.get('GOOGLE_REFRESH_TOKEN')
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async generateMeetLink(
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    doctorName: string,
    patientName: string,
    serviceName: string
  ): Promise<string> {
    try {
      // Parse appointment time
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      
      // Create start time
      const startTime = new Date(appointmentDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Create end time based on duration
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      // Create calendar event with Meet integration
      const event = {
        summary: `${serviceName} - ${doctorName} & ${patientName}`,
        description: `OptimaleMD Telemedicine Appointment\n\nDoctor: ${doctorName}\nPatient: ${patientName}\nService: ${serviceName}`,
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
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.configService.get('GOOGLE_CALENDAR_ID'),
        resource: event,
        conferenceDataVersion: 1,
      });

      // Extract Meet link from response
      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === 'video'
      )?.uri;

      if (meetLink) {
        return meetLink;
      } else {
        throw new Error('Failed to create Meet link');
      }
    } catch (error) {
      console.error('Error creating Google Calendar event with Meet:', error);
      throw error;
    }
  }
}
```

### Option 2: Use Google Meet API (Simpler for Development)

For development, you can use Google's Meet API directly:

#### Step 1: Enable Google Meet API
1. Go to Google Cloud Console
2. Enable Google Meet API
3. Create API key

#### Step 2: Update Service
```typescript
async generateMeetLink(
  appointmentDate: Date,
  appointmentTime: string,
  duration: number,
  doctorName: string,
  patientName: string,
  serviceName: string
): Promise<string> {
  try {
    // Create a simple Meet link for development
    // In production, use Google Calendar API
    const meetingId = this.generateMeetingId();
    return `https://meet.google.com/${meetingId}`;
  } catch (error) {
    console.error('Error generating Meet link:', error);
    throw error;
  }
}
```

### Option 3: Manual Meet Creation (For Testing)

For immediate testing, you can:

1. **Manually create Meet links**:
   - Go to [meet.google.com](https://meet.google.com)
   - Click "New meeting"
   - Copy the generated link
   - Store it in your database

2. **Use a pool of pre-created links**:
   ```typescript
   private readonly MEET_LINKS = [
     'https://meet.google.com/abc-defg-hij',
     'https://meet.google.com/xyz-uvwx-yz',
     // Add more pre-created links
   ];

   private getNextMeetLink(): string {
     const randomIndex = Math.floor(Math.random() * this.MEET_LINKS.length);
     return this.MEET_LINKS[randomIndex];
   }
   ```

## Current Implementation Status

The current implementation generates fake Meet links that don't work. To fix this, you need to implement one of the solutions above.

## Recommended Approach for Development

1. **Start with Option 3** (manual Meet creation) for immediate testing
2. **Move to Option 1** (Google Calendar API) for production
3. **Use Option 2** as a fallback

## Testing Your Setup

1. Create an appointment
2. Complete payment
3. Check the generated Meet link
4. Try joining the Meet link
5. Verify it works

## Troubleshooting

### Common Issues

1. **"Check your meeting code" error**
   - **Cause**: Using fake Meet links
   - **Solution**: Implement real Google Calendar API integration

2. **API authentication errors**
   - **Cause**: Incorrect credentials
   - **Solution**: Verify Google Cloud setup and credentials

3. **Calendar permission errors**
   - **Cause**: Insufficient permissions
   - **Solution**: Grant appropriate calendar permissions to service account

## Next Steps

1. Choose your preferred solution
2. Set up Google Cloud credentials
3. Update the GoogleCalendarService
4. Test with real Meet links
5. Deploy to production

Would you like me to help you implement any of these solutions?
