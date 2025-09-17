const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

// Configuration
const DOCTOR_ID = '783dc7c6-11a2-4262-94f4-4dfe5ce05340';
const START_DATE = '2025-10-01'; // October 1st
const END_DATE = '2025-12-31';   // December 31st
const DRY_RUN = true; // Set to false to actually delete events

async function cleanupCalendarEvents() {
  try {
    console.log('🧹 Starting Google Calendar cleanup...');
    console.log(`📅 Date range: ${START_DATE} to ${END_DATE}`);
    console.log(`🔍 Doctor ID: ${DOCTOR_ID}`);
    console.log(`⚠️  Dry run mode: ${DRY_RUN ? 'ON (no actual deletion)' : 'OFF (will delete events)'}`);
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
      timeMin: new Date(START_DATE).toISOString(),
      timeMax: new Date(END_DATE + 'T23:59:59.999Z').toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500 // Google Calendar API limit
    });

    const events = response.data.items || [];
    console.log(`📊 Found ${events.length} events in the specified date range`);
    console.log('');

    if (events.length === 0) {
      console.log('✅ No events found to delete');
      return;
    }

    // Filter events to delete (exclude important events)
    const eventsToDelete = events.filter(event => {
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
      
      const shouldSkip = skipKeywords.some(keyword => 
        summary.includes(keyword) || description.includes(keyword)
      );
      
      return !shouldSkip;
    });

    console.log(`🎯 Events to delete: ${eventsToDelete.length}`);
    console.log(`⏭️  Events to keep: ${events.length - eventsToDelete.length}`);
    console.log('');

    // Show events that will be deleted
    if (eventsToDelete.length > 0) {
      console.log('📝 Events that will be deleted:');
      eventsToDelete.forEach((event, index) => {
        const start = event.start?.dateTime || event.start?.date;
        const summary = event.summary || 'No title';
        console.log(`  ${index + 1}. ${summary} (${start})`);
      });
      console.log('');
    }

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No events were actually deleted');
      console.log('💡 To actually delete events, set DRY_RUN = false in the script');
      return;
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete the events listed above!');
    console.log('🛑 To proceed with deletion, set DRY_RUN = false and run the script again');
    
    // Uncomment the following lines to actually delete events
    /*
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
    console.log('📊 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${deletedCount} events`);
    console.log(`❌ Failed to delete: ${errorCount} events`);
    console.log(`📅 Date range: ${START_DATE} to ${END_DATE}`);
    */

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupCalendarEvents();
