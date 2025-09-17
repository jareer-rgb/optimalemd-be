const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

async function testImportProcess() {
  try {
    console.log('🧪 Testing Import Process...');
    console.log('');

    const doctorId = '783dc7c6-11a2-4262-94f4-4dfe5ce05340';

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

    // Initialize Google Calendar API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/oauth/callback'
    );

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

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get the specific event
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date('2025-10-01').toISOString(),
      timeMax: new Date('2025-10-31T23:59:59.999Z').toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10
    });

    const events = response.data.items || [];
    console.log(`Found ${events.length} events`);

    // Find the working hours event
    const workingHoursEvent = events.find(event => {
      const summary = event.summary?.toLowerCase() || '';
      return summary.includes('working hours');
    });

    if (!workingHoursEvent) {
      console.log('❌ No working hours event found');
      return;
    }

    console.log('✅ Found working hours event:');
    console.log(`   Summary: ${workingHoursEvent.summary}`);
    console.log(`   Start: ${workingHoursEvent.start?.dateTime || workingHoursEvent.start?.date}`);
    console.log(`   End: ${workingHoursEvent.end?.dateTime || workingHoursEvent.end?.date}`);
    console.log(`   Description: ${workingHoursEvent.description}`);
    console.log('');

    // Parse the event
    console.log('🔍 Parsing event...');
    
    const startTime = workingHoursEvent.start?.dateTime || workingHoursEvent.start?.date;
    const endTime = workingHoursEvent.end?.dateTime || workingHoursEvent.end?.date;

    if (!startTime || !endTime) {
      console.log('❌ Missing start or end time');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const dayOfWeek = start.getDay();

    console.log(`   Parsed start: ${start}`);
    console.log(`   Parsed end: ${end}`);
    console.log(`   Day of week: ${dayOfWeek} (0=Sunday, 1=Monday, etc.)`);

    // Extract time components
    const startTimeStr = start.toTimeString().slice(0, 5); // HH:MM format
    const endTimeStr = end.toTimeString().slice(0, 5); // HH:MM format

    console.log(`   Start time string: ${startTimeStr}`);
    console.log(`   End time string: ${endTimeStr}`);

    // Parse slot and break duration from description
    let slotDuration = 20; // default 20 minutes
    let breakDuration = 10; // default 10 minutes

    if (workingHoursEvent.description) {
      const slotMatch = workingHoursEvent.description.match(/slot[:\s]*(\d+)/i);
      const breakMatch = workingHoursEvent.description.match(/break[:\s]*(\d+)/i);
      
      if (slotMatch) slotDuration = parseInt(slotMatch[1]);
      if (breakMatch) breakDuration = parseInt(breakMatch[1]);
    }

    console.log(`   Slot duration: ${slotDuration} minutes`);
    console.log(`   Break duration: ${breakDuration} minutes`);

    // Create working hours object
    const workingHour = {
      doctorId,
      dayOfWeek,
      startTime: startTimeStr,
      endTime: endTimeStr,
      isActive: true,
      slotDuration,
      breakDuration
    };

    console.log('\n📝 Working hours object:');
    console.log(JSON.stringify(workingHour, null, 2));

    // Check if working hours already exist for this day
    console.log('\n🔍 Checking for existing working hours...');
    const existing = await prisma.workingHours.findUnique({
      where: {
        doctorId_dayOfWeek: {
          doctorId: doctorId,
          dayOfWeek: dayOfWeek
        }
      }
    });

    if (existing) {
      console.log('⚠️  Working hours already exist for this day:');
      console.log(JSON.stringify(existing, null, 2));
      
      console.log('\n🔄 Updating existing working hours...');
      const updated = await prisma.workingHours.update({
        where: { id: existing.id },
        data: {
          startTime: workingHour.startTime,
          endTime: workingHour.endTime,
          isActive: workingHour.isActive,
          slotDuration: workingHour.slotDuration,
          breakDuration: workingHour.breakDuration
        }
      });
      console.log('✅ Updated working hours:', updated.id);
    } else {
      console.log('\n➕ Creating new working hours...');
      const created = await prisma.workingHours.create({
        data: workingHour
      });
      console.log('✅ Created working hours:', created.id);
    }

    console.log('\n🎉 Import process completed successfully!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testImportProcess();
