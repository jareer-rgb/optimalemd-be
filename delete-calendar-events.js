const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

// Configuration
const DOCTOR_ID = '783dc7c6-11a2-4262-94f4-4dfe5ce05340';
const START_DATE = '2025-10-01'; // October 1st
const END_DATE = '2025-12-31';   // December 31st
const DELETE_WORKING_HOURS_ONLY = true; // Set to true to only delete working hours events
const BATCH_SIZE = 10; // Delete events in batches to avoid rate limits

async function deleteCalendarEvents() {
  try {
    console.log('🗑️  Starting Google Calendar event deletion...');
    console.log(`📅 Date range: ${START_DATE} to ${END_DATE}`);
    console.log(`🔍 Doctor ID: ${DOCTOR_ID}`);
    console.log(`🎯 Working hours only: ${DELETE_WORKING_HOURS_ONLY ? 'YES' : 'NO'}`);
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

    // Filter events to delete
    let eventsToDelete = events;

    if (DELETE_WORKING_HOURS_ONLY) {
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
          'dr. john smith - working hours' // Specific to your doctor
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

    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete the events listed above!');
    console.log('🛑 Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete events in batches
    console.log('🗑️  Deleting events...');
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < eventsToDelete.length; i += BATCH_SIZE) {
      const batch = eventsToDelete.slice(i, i + BATCH_SIZE);
      
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eventsToDelete.length / BATCH_SIZE)}`);
      
      for (const event of batch) {
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
      
      // Wait between batches to avoid rate limits
      if (i + BATCH_SIZE < eventsToDelete.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('');
    console.log('📊 Deletion Summary:');
    console.log(`✅ Successfully deleted: ${deletedCount} events`);
    console.log(`❌ Failed to delete: ${errorCount} events`);
    console.log(`📅 Date range: ${START_DATE} to ${END_DATE}`);
    console.log(`🎯 Working hours only: ${DELETE_WORKING_HOURS_ONLY ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error during deletion:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteCalendarEvents();
