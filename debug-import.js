const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

// Test keyword matching function
function isWorkingHoursEvent(summary, description) {
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

async function debugImport() {
  try {
    console.log('🔍 Debugging Google Calendar Import...');
    console.log('');

    const doctorId = '783dc7c6-11a2-4262-94f4-4dfe5ce05340';
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';

    // Get doctor information
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        googleCalendarConnected: true,
        googleRefreshToken: true,
        googleAccessToken: true,
        googleTokenExpiry: true
      }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    if (!doctor.googleCalendarConnected) {
      throw new Error('Doctor is not connected to Google Calendar');
    }

    console.log(`👨‍⚕️ Doctor: Dr. ${doctor.firstName} ${doctor.lastName}`);
    console.log('');

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/oauth/callback'
    );

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: doctor.googleRefreshToken,
      access_token: doctor.googleAccessToken
    });

    // Check if token needs refresh
    const now = new Date();
    if (doctor.googleTokenExpiry && now >= doctor.googleTokenExpiry) {
      console.log('🔄 Refreshing access token...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      oauth2Client.setCredentials({
        refresh_token: doctor.googleRefreshToken,
        access_token: credentials.access_token
      });
    }

    // Initialize Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get all events in the date range
    console.log('📋 Fetching events from Google Calendar...');
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    console.log('');

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate + 'T23:59:59.999Z').toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500
    });

    const events = response.data.items || [];
    console.log(`📊 Found ${events.length} events in the specified date range`);
    console.log('');

    if (events.length === 0) {
      console.log('❌ No events found in the date range');
      console.log('💡 Make sure you have events in October 2025');
      return;
    }

    // Show all events
    console.log('📝 All events found:');
    events.forEach((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      const summary = event.summary || 'No title';
      const description = event.description || '';
      console.log(`  ${index + 1}. "${summary}"`);
      console.log(`     Description: "${description}"`);
      console.log(`     Start: ${start}`);
      console.log('');
    });

    // Test keyword matching
    console.log('🔍 Testing keyword matching:');
    let workingHoursCount = 0;
    
    events.forEach((event, index) => {
      const summary = event.summary || '';
      const description = event.description || '';
      
      console.log(`\n--- Event ${index + 1} ---`);
      const isWorkingHours = isWorkingHoursEvent(summary, description);
      
      if (isWorkingHours) {
        workingHoursCount++;
        console.log(`✅ This is a working hours event!`);
        
        // Show event details
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        console.log(`   Start: ${start}`);
        console.log(`   End: ${end}`);
        console.log(`   Summary: ${summary}`);
        console.log(`   Description: ${description}`);
      } else {
        console.log(`❌ This is NOT a working hours event`);
      }
    });

    console.log('\n📊 Summary:');
    console.log(`Total events found: ${events.length}`);
    console.log(`Working hours events: ${workingHoursCount}`);
    console.log(`Non-working hours events: ${events.length - workingHoursCount}`);

    if (workingHoursCount === 0) {
      console.log('\n💡 Suggestions:');
      console.log('1. Make sure your event title contains one of these keywords:');
      console.log('   - "Working hours"');
      console.log('   - "Availability"');
      console.log('   - "Schedule"');
      console.log('   - "Office hours"');
      console.log('2. Check that the event is in the correct date range (October 2025)');
      console.log('3. Make sure the event is in your primary calendar');
    }

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugImport();
