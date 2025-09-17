const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWorkingHours() {
  try {
    console.log('🔍 Checking working hours in database...');
    
    const workingHours = await prisma.workingHours.findMany({
      where: { 
        doctorId: '783dc7c6-11a2-4262-94f4-4dfe5ce05340' 
      }
    });
    
    console.log(`Found ${workingHours.length} working hours:`);
    workingHours.forEach(wh => {
      console.log(`  Day ${wh.dayOfWeek}: ${wh.startTime} - ${wh.endTime} (Active: ${wh.isActive})`);
    });
    
    const activeWorkingHours = workingHours.filter(wh => wh.isActive);
    console.log(`\nActive working hours: ${activeWorkingHours.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkingHours();
