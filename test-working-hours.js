const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWorkingHours() {
  try {
    const doctorId = '783dc7c6-11a2-4262-94f4-4dfe5ce05340';
    
    console.log('Checking doctor...');
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });
    
    if (!doctor) {
      console.log('Doctor not found');
      return;
    }
    
    console.log('Doctor found:', doctor.firstName, doctor.lastName);
    console.log('Google Calendar connected:', doctor.googleCalendarConnected);
    
    console.log('\nChecking existing working hours...');
    const workingHours = await prisma.workingHours.findMany({
      where: { doctorId }
    });
    
    console.log('Existing working hours:', workingHours.length);
    
    if (workingHours.length === 0) {
      console.log('\nCreating sample working hours...');
      
      // Create working hours for Monday to Friday
      const sampleHours = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isActive: true }, // Monday
        { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', isActive: true }, // Tuesday
        { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isActive: true }, // Wednesday
        { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', isActive: true }, // Thursday
        { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', isActive: true }, // Friday
      ];
      
      for (const hour of sampleHours) {
        await prisma.workingHours.create({
          data: {
            doctorId,
            ...hour,
            slotDuration: 20,
            breakDuration: 10
          }
        });
      }
      
      console.log('Sample working hours created!');
    }
    
    console.log('\nFinal working hours:');
    const finalHours = await prisma.workingHours.findMany({
      where: { doctorId }
    });
    
    console.log(finalHours);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkingHours();