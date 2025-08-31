# 📹 Google Meet Integration for OptimaleMD

## Overview

This document describes the Google Meet integration implemented in the OptimaleMD backend system. The integration automatically generates Google Meet links for telemedicine appointments and includes them in confirmation emails sent to both patients and doctors.

## 🎯 Features

### 1. **Automatic Meet Link Generation**
- Generates unique Google Meet links for each appointment
- Links are created when payment is confirmed
- Links are regenerated when appointments are rescheduled

### 2. **Email Integration**
- Google Meet links are included in appointment confirmation emails
- Links are included in reschedule notification emails
- Both patients and doctors receive the Meet links

### 3. **Database Storage**
- Meet links are stored in the `appointments` table
- Links are updated when appointments are rescheduled
- Links are accessible via the API

## 🏗️ Architecture

### Database Schema
```sql
-- Added to appointments table
googleMeetLink String?  // Google Meet link for video consultation
```

### Service Components

#### 1. **GoogleCalendarService** (`src/google-calendar/google-calendar.service.ts`)
- Handles Google Meet link generation
- Creates timed meeting links
- Generates unique meeting IDs
- Provides fallback for link generation failures

#### 2. **MailerService Updates** (`src/mailer/mailer.service.ts`)
- Updated appointment confirmation emails
- Updated doctor notification emails
- Updated reschedule emails
- Includes Google Meet link sections in email templates

#### 3. **StripeService Updates** (`src/stripe/stripe.service.ts`)
- Generates Meet links when payment is confirmed
- Stores links in the database
- Passes links to email services

#### 4. **AppointmentsService Updates** (`src/appointments/appointments.service.ts`)
- Generates new Meet links when appointments are rescheduled
- Updates stored links in the database
- Passes new links to email services

## 🔧 Implementation Details

### Meet Link Generation
```typescript
// Generate a Google Meet link for an appointment
async generateMeetLink(
  appointmentDate: Date,
  appointmentTime: string,
  duration: number,
  doctorName: string,
  patientName: string,
  serviceName: string
): Promise<string>
```

### Email Template Integration
```html
<!-- Google Meet section in email templates -->
<div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
  <h3 style="color: #28a745; margin-top: 0;">Video Consultation</h3>
  <p style="color: #333; margin-bottom: 15px;">This is a telemedicine appointment. Please use the Google Meet link below to join your video consultation:</p>
  <a href="${googleMeetLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">Join Google Meet</a>
  <p style="color: #666; font-size: 14px; margin-top: 10px;">Or copy this link: <span style="word-break: break-all;">${googleMeetLink}</span></p>
</div>
```

## 📧 Email Types Updated

### 1. **Appointment Confirmation Email**
- **Recipients**: Patient
- **Includes**: Google Meet link for video consultation
- **Triggered**: When payment is confirmed

### 2. **Doctor Appointment Notification**
- **Recipients**: Doctor
- **Includes**: Google Meet link for video consultation
- **Triggered**: When payment is confirmed

### 3. **Reschedule Email**
- **Recipients**: Patient
- **Includes**: Updated Google Meet link
- **Triggered**: When appointment is rescheduled

### 4. **Doctor Reschedule Notification**
- **Recipients**: Doctor
- **Includes**: Updated Google Meet link
- **Triggered**: When appointment is rescheduled

## 🔄 Workflow

### Appointment Confirmation Flow
1. Patient books appointment
2. Payment is processed via Stripe
3. Payment confirmation triggers Meet link generation
4. Meet link is stored in database
5. Confirmation emails sent to patient and doctor with Meet link

### Reschedule Flow
1. Appointment is rescheduled
2. New Meet link is generated for new time
3. Database is updated with new Meet link
4. Reschedule emails sent with updated Meet link

## 🛠️ API Endpoints

### Updated Response DTOs
The `AppointmentResponseDto` now includes:
```typescript
@ApiProperty({ description: 'Google Meet link for video consultation', required: false })
googleMeetLink: string | null;
```

### Available Endpoints
- `GET /appointments` - Returns appointments with Meet links
- `GET /appointments/:id` - Returns specific appointment with Meet link
- `POST /appointments/:id/reschedule` - Reschedules and generates new Meet link

## 🔒 Security Considerations

### Meet Link Security
- Links are generated with unique meeting IDs
- Links are only shared with authorized participants (patient and doctor)
- Links are stored securely in the database

### Email Security
- Meet links are only sent to verified email addresses
- Links are included in secure, encrypted email templates
- No sensitive information is exposed in the links

## 🚀 Future Enhancements

### Planned Features
1. **Google Calendar API Integration**
   - Direct calendar event creation
   - Automatic calendar invites
   - Calendar synchronization

2. **Advanced Meet Features**
   - Meeting recording options
   - Waiting room configuration
   - Meeting duration limits

3. **Analytics**
   - Meeting attendance tracking
   - Duration analytics
   - No-show detection

## 🐛 Troubleshooting

### Common Issues

#### 1. **Meet Link Generation Fails**
- **Cause**: Network issues or service unavailability
- **Solution**: System falls back to simple Meet link generation
- **Logs**: Check console for generation errors

#### 2. **Email Delivery Issues**
- **Cause**: SMTP configuration problems
- **Solution**: Verify SMTP settings in environment variables
- **Logs**: Check mailer service logs

#### 3. **Database Update Failures**
- **Cause**: Database connection issues
- **Solution**: Check database connectivity and schema
- **Logs**: Check Prisma logs

### Debugging
```bash
# Check if Google Calendar service is working
npm run start:dev

# Monitor logs for Meet link generation
tail -f logs/app.log

# Verify database schema
npx prisma db push
```

## 📝 Environment Variables

No additional environment variables are required for the basic Meet link generation. For future Google Calendar API integration, you may need:

```env
# Future Google Calendar API integration
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_refresh_token
```

## ✅ Testing

### Manual Testing
1. Create a test appointment
2. Complete payment process
3. Verify Meet link is generated and stored
4. Check email delivery with Meet links
5. Test reschedule functionality
6. Verify new Meet link is generated

### Automated Testing
```bash
# Run tests
npm run test

# Run specific service tests
npm run test -- --testNamePattern="GoogleCalendarService"
```

## 📚 Related Documentation

- [Email Setup Guide](./EMAIL_SETUP_GUIDE.md)
- [API Documentation](./API_DOCS.md)
- [Database Schema](./../prisma/schema.prisma)
