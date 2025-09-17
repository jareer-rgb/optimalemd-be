const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchedules() {
  try {
    console.log('🔍 Checking schedules in database...');
    
    const schedules = await prisma.schedule.findMany({
      where: { 
        doctorId: '783dc7c6-11a2-4262-94f4-4dfe5ce05340' 
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`Found ${schedules.length} schedules:`);
    schedules.forEach(schedule => {
      console.log(`  ${schedule.date.toDateString()}: ${schedule.startTime} - ${schedule.endTime}`);
    });
    
    // Check for October 2025 schedules specifically
    const octoberSchedules = schedules.filter(s => 
      s.date.getFullYear() === 2025 && s.date.getMonth() === 9
    );
    console.log(`\nOctober 2025 schedules: ${octoberSchedules.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchedules();
