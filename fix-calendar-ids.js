const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

async function fixAllCalendarIds() {
  try {
    console.log('🔧 Fixing calendar IDs for all connected doctors...');
    
    // Get all connected doctors
    const doctors = await prisma.doctor.findMany({
      where: { googleCalendarConnected: true },
      select: { id: true, name: true, email: true, googleCalendarId: true }
    });
    
    console.log(`Found ${doctors.length} connected doctors`);
    
    let fixed = 0;
    const errors = [];
    
    for (const doctor of doctors) {
      try {
        console.log(`\n👨‍⚕️ Processing ${doctor.name} (${doctor.email})`);
        console.log(`   Current calendar ID: ${doctor.googleCalendarId}`);
        
        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        // Get doctor's tokens
        const doctorWithTokens = await prisma.doctor.findUnique({
          where: { id: doctor.id },
          select: { googleRefreshToken: true, googleAccessToken: true, googleTokenExpiry: true }
        });
        
        if (!doctorWithTokens?.googleRefreshToken) {
          console.log('   ❌ No refresh token found');
          errors.push(`${doctor.name}: No refresh token`);
          continue;
        }
        
        // Set credentials
        oauth2Client.setCredentials({
          refresh_token: doctorWithTokens.googleRefreshToken,
          access_token: doctorWithTokens.googleAccessToken,
          expiry_date: doctorWithTokens.googleTokenExpiry ? new Date(doctorWithTokens.googleTokenExpiry).getTime() : null
        });
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Try to get primary calendar
        let correctCalendarId = 'primary';
        try {
          const primaryCalendar = await calendar.calendars.get({
            calendarId: 'primary'
          });
          console.log('   ✅ Primary calendar accessible:', primaryCalendar.data.summary);
          correctCalendarId = 'primary';
        } catch (primaryError) {
          console.log('   ⚠️ Primary calendar not accessible, searching calendar list...');
          
          // Search through calendar list
          const response = await calendar.calendarList.list();
          const calendars = response.data.items || [];
          
          // Look for primary calendar
          const primaryCalendar = calendars.find(cal => cal.primary === true);
          if (primaryCalendar) {
            console.log('   ✅ Found primary in list:', primaryCalendar.summary);
            correctCalendarId = primaryCalendar.id;
          } else {
            // Look for user's email calendar
            const userCalendar = calendars.find(cal => 
              cal.id === doctor.email || 
              cal.summary === doctor.email ||
              cal.id?.includes(doctor.email?.split('@')[0])
            );
            if (userCalendar) {
              console.log('   ✅ Found user email calendar:', userCalendar.summary);
              correctCalendarId = userCalendar.id;
            } else {
              // Look for non-holiday calendar
              const nonHolidayCalendar = calendars.find(cal => 
                !cal.id?.includes('holiday') && 
                !cal.id?.includes('group.calendar.google.com')
              );
              if (nonHolidayCalendar) {
                console.log('   ⚠️ Using non-holiday calendar:', nonHolidayCalendar.summary);
                correctCalendarId = nonHolidayCalendar.id;
              }
            }
          }
        }
        
        // Update calendar ID if it's different
        if (correctCalendarId !== doctor.googleCalendarId) {
          await prisma.doctor.update({
            where: { id: doctor.id },
            data: { googleCalendarId: correctCalendarId }
          });
          console.log(`   ✅ Updated calendar ID: ${doctor.googleCalendarId} → ${correctCalendarId}`);
          fixed++;
        } else {
          console.log(`   ✅ Calendar ID already correct: ${correctCalendarId}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors.push(`${doctor.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Fixed: ${fixed} doctors`);
    console.log(`   Errors: ${errors.length} doctors`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllCalendarIds();
