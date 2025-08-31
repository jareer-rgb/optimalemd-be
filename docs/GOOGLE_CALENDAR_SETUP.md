# 🔧 Google Calendar API Setup Guide

## Overview

This guide will help you set up Google Calendar API to create real Google Meet links for your OptimaleMD telemedicine appointments.

## Prerequisites

- Google account with access to Google Cloud Console
- Google Workspace account (recommended for production)
- Basic understanding of Google Cloud Platform

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `optimaleMD-calendar-api`
4. Click "Create"

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: OptimaleMD
   - User support email: your-email@domain.com
   - Developer contact information: your-email@domain.com
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
4. Click "Save and Continue" through the remaining steps
5. Back to "Create OAuth client ID":
   - Application type: Web application
   - Name: OptimaleMD Calendar API
   - **Authorized redirect URIs: Leave empty or add any placeholder** (we don't need this for our implementation)
6. Click "Create"
7. **Save the Client ID and Client Secret** - you'll need these for your environment variables

## Step 4: Get Refresh Token

### Option A: Using Google OAuth Playground (Recommended)

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the settings icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your OAuth Client ID and Client Secret
5. Click "Close"
6. In the left panel, find "Google Calendar API v3"
7. Select "https://www.googleapis.com/auth/calendar"
8. Click "Authorize APIs"
9. Sign in with your Google account
10. Click "Exchange authorization code for tokens"
11. **Copy the Refresh Token** - you'll need this for your environment variables

### Option B: Using Your Application

1. Create a simple OAuth flow in your application
2. Redirect users to Google OAuth
3. Exchange authorization code for refresh token
4. Store the refresh token securely

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_ID="your_oauth_client_id_here"
GOOGLE_CLIENT_SECRET="your_oauth_client_secret_here"
GOOGLE_REFRESH_TOKEN="your_refresh_token_here"
GOOGLE_CALENDAR_ID="primary"
DOCTOR_EMAIL="doctor@optimaleMD.com"
```

## Step 6: Test the Integration

1. Start your application:
   ```bash
   npm run start:dev
   ```

2. Create a test appointment
3. Complete the payment process
4. Check the logs for:
   - "Google Calendar API initialized successfully"
   - "Creating Google Calendar event with Meet integration..."
   - "Google Calendar event created successfully"
   - "Meet link generated: [link]"

5. Try joining the generated Meet link

## Step 7: Verify Calendar Events

1. Go to [Google Calendar](https://calendar.google.com/)
2. Check if the appointment events are being created
3. Verify that Meet links are included in the events
4. Test joining the Meet links

## Troubleshooting

### Common Issues

#### 1. "Google API credentials not configured"
- **Cause**: Missing environment variables
- **Solution**: Ensure all Google API environment variables are set

#### 2. "Invalid credentials" error
- **Cause**: Incorrect or expired credentials
- **Solution**: 
  - Verify Client ID and Client Secret
  - Generate new refresh token
  - Check OAuth consent screen configuration

#### 3. "Calendar permission denied"
- **Cause**: Insufficient calendar permissions
- **Solution**:
  - Ensure the Google account has calendar access
  - Check if the calendar ID is correct
  - Verify OAuth scopes include calendar access

#### 4. "Meet link not generated"
- **Cause**: Conference data not created
- **Solution**:
  - Check if Google Workspace has Meet enabled
  - Verify the calendar supports Meet integration
  - Ensure the event creation includes conference data

### Debug Steps

1. **Check API Quotas**:
   - Go to Google Cloud Console → APIs & Services → Quotas
   - Ensure you haven't exceeded API limits

2. **Verify API Status**:
   - Check if Google Calendar API is enabled
   - Ensure billing is set up (if required)

3. **Test with Google APIs Explorer**:
   - Go to [Google APIs Explorer](https://developers.google.com/apis-explorer/)
   - Test calendar.events.insert API directly

## Production Considerations

### 1. Service Account (Recommended for Production)

Instead of OAuth 2.0, use a service account:

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a new service account
3. Download the JSON key file
4. Share the calendar with the service account email
5. Use the service account credentials in your application

### 2. Calendar Sharing

Ensure the calendar is shared with:
- The service account email (if using service account)
- The doctor's email address
- Any other required participants

### 3. Error Handling

The current implementation includes fallback mechanisms:
- If Google Calendar API fails, it uses fallback Meet links
- Logs are provided for debugging
- Graceful degradation ensures the system continues to work

### 4. Security

- Store credentials securely (use environment variables)
- Rotate refresh tokens regularly
- Monitor API usage and quotas
- Implement proper error handling

## Next Steps

1. **Test thoroughly** with real appointments
2. **Monitor logs** for any issues
3. **Set up monitoring** for API quotas and errors
4. **Consider implementing** service account for production
5. **Add calendar event management** (update, delete, reschedule)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Google Calendar API documentation
3. Check Google Cloud Console for error details
4. Monitor application logs for specific error messages

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Meet API Documentation](https://developers.google.com/meet/api)
- [Google Cloud Console](https://console.cloud.google.com/)
