const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const readline = require('readline');

const prisma = new PrismaClient();

// Configuration
const DOCTOR_ID = '783dc7c6-11a2-4262-94f4-4dfe5ce05340';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function cleanupCalendarEvents() {
  try {
    console.log('🧹 Google Calendar Cleanup Tool');
    console.log('================================');
    console.log('');

    // Get date range from user
    const startDate = await askQuestion('📅 Start date (YYYY-MM-DD): ');
    const endDate = await askQuestion('📅 End date (YYYY-MM-DD): ');
    console.log('');

    // Get deletion mode
    const mode = await askQuestion('🎯 What to delete? (1=Working hours only, 2=All events, 3=Preview only): ');
    console.log('');

    const deleteWorkingHoursOnly = mode === '1';
    const previewOnly = mode === '3';

    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    console.log(`🎯 Mode: ${previewOnly ? 'Preview only' : deleteWorkingHoursOnly ? 'Working hours only' : 'All events'}`);
    console.log('');

    // Get doctor information
    const doctor = await prisma.doctor.findUnique({
      where: { id: DOCTOR_ID },
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
      
      // Update database with new tokens
      await prisma.doctor.update({
        where: { id: DOCTOR_ID },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
        }
      });
      
      oauth2Client.setCredentials({
        refresh_token: doctor.googleRefreshToken,
        access_token: credentials.access_token
      });
    }

    // Initialize Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get all events in the date range
    console.log('📋 Fetching events from Google Calendar...');
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
      console.log('✅ No events found');
      rl.close();
      return;
    }

    // Filter events to delete
    let eventsToDelete = events;

    if (deleteWorkingHoursOnly) {
      // Only delete working hours related events
      eventsToDelete = events.filter(event => {
        const summary = event.summary?.toLowerCase() || '';
        const description = event.description?.toLowerCase() || '';
        
        const workingHoursKeywords = [
          'working hours',
          'availability',
          'schedule',
          'office hours',
          'clinic hours',
          'consultation hours',
          'appointment hours',
          'dr. john smith - working hours'
        ];
        
        return workingHoursKeywords.some(keyword => 
          summary.includes(keyword) || description.includes(keyword)
        );
      });
    } else {
      // Delete all events except important ones
      eventsToDelete = events.filter(event => {
        const summary = event.summary?.toLowerCase() || '';
        const description = event.description?.toLowerCase() || '';
        
        // Skip important events
        const skipKeywords = [
          'holiday',
          'birthday',
          'anniversary',
          'vacation',
          'personal',
          'important',
          'meeting',
          'appointment'
        ];
        
        return !skipKeywords.some(keyword => 
          summary.includes(keyword) || description.includes(keyword)
        );
      });
    }

    console.log(`🎯 Events to delete: ${eventsToDelete.length}`);
    console.log(`⏭️  Events to keep: ${events.length - eventsToDelete.length}`);
    console.log('');

    if (eventsToDelete.length === 0) {
      console.log('✅ No events found matching the criteria');
      rl.close();
      return;
    }

    // Show events that will be deleted
    console.log('📝 Events that will be deleted:');
    eventsToDelete.forEach((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      const summary = event.summary || 'No title';
      const startDate = new Date(start).toLocaleDateString();
      const startTime = new Date(start).toLocaleTimeString();
      console.log(`  ${index + 1}. ${summary} (${startDate} ${startTime})`);
    });
    console.log('');

    if (previewOnly) {
      console.log('🔍 PREVIEW MODE - No events were deleted');
      rl.close();
      return;
    }

    // Confirm deletion
    const confirm = await askQuestion('⚠️  Are you sure you want to delete these events? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Deletion cancelled');
      rl.close();
      return;
    }

    // Delete events
    console.log('🗑️  Deleting events...');
    let deletedCount = 0;
    let errorCount = 0;

    for (const event of eventsToDelete) {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: event.id
        });
        deletedCount++;
        console.log(`✅ Deleted: ${event.summary || 'No title'}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to delete ${event.summary || 'No title'}: ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 Deletion Summary:');
    console.log(`✅ Successfully deleted: ${deletedCount} events`);
    console.log(`❌ Failed to delete: ${errorCount} events`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the cleanup
cleanupCalendarEvents();
