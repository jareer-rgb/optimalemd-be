const { PrismaClient } = require('@prisma/client');
const { GoogleCalendarImportService } = require('./dist/google-calendar/google-calendar-import.service');
const { GoogleCalendarOAuthService } = require('./dist/google-calendar/google-calendar-oauth.service');

const prisma = new PrismaClient();

async function testApiService() {
  try {
    console.log('🧪 Testing API Service...');
    
    const oauthService = new GoogleCalendarOAuthService();
    const importService = new GoogleCalendarImportService(prisma, oauthService);
    
    const result = await importService.importWorkingHoursFromCalendar(
      '783dc7c6-11a2-4262-94f4-4dfe5ce05340',
      new Date('2025-10-01'),
      new Date('2025-10-31')
    );
    
    console.log('📊 API Service Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testApiService();
