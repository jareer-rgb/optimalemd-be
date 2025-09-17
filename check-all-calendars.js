const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

async function checkAllCalendars() {
  try {
    console.log('🔍 Checking all calendars and events...');
    
    // Get doctor's OAuth credentials
    const doctor = await prisma.doctor.findUnique({
      where: { id: '783dc7c6-11a2-4262-94f4-4dfe5ce05340' }
    });
    
    if (!doctor || !doctor.googleRefreshToken) {
      console.log('❌ Doctor not found or not connected to Google Calendar');
      return;
    }
    
    console.log('👨‍⚕️ Doctor:', doctor.name);
    console.log('🔑 Has refresh token:', !!doctor.googleRefreshToken);
    console.log('📅 Calendar ID:', doctor.googleCalendarId || 'primary');
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      refresh_token: doctor.googleRefreshToken,
      access_token: doctor.googleAccessToken,
      expiry_date: doctor.googleTokenExpiry ? new Date(doctor.googleTokenExpiry).getTime() : null
    });
    
    // List all calendars
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    console.log('\n📋 Available Calendars:');
    const calendarsResponse = await calendar.calendarList.list();
    calendarsResponse.data.items.forEach((cal, index) => {
      console.log(`  ${index + 1}. ${cal.summary} (${cal.id})`);
      console.log(`     Primary: ${cal.primary || false}`);
      console.log(`     Access: ${cal.accessRole}`);
    });
    
    // Search for "Working hours" in all calendars
    console.log('\n🔍 Searching for "Working hours" events in all calendars...');
    
    for (const cal of calendarsResponse.data.items) {
      console.log(`\n📅 Checking calendar: ${cal.summary} (${cal.id})`);
      
      try {
        const eventsResponse = await calendar.events.list({
          calendarId: cal.id,
          timeMin: new Date('2025-09-01').toISOString(),
          timeMax: new Date('2025-11-30').toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });
        
        const events = eventsResponse.data.items || [];
        console.log(`   Found ${events.length} events`);
        
        events.forEach((event, index) => {
          if (event.summary && event.summary.toLowerCase().includes('working')) {
            console.log(`   🎯 FOUND: "${event.summary}"`);
            console.log(`      Start: ${event.start?.dateTime || event.start?.date}`);
            console.log(`      End: ${event.end?.dateTime || event.end?.date}`);
            console.log(`      Description: ${event.description || 'No description'}`);
          }
        });
        
      } catch (error) {
        console.log(`   ❌ Error accessing calendar: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllCalendars();
