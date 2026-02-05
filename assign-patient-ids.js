const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script to assign sequential patient IDs (OPT-0001, OPT-0002, etc.) to existing patients
 * Patients are assigned IDs based on their creation date (oldest first)
 */
async function assignPatientIds() {
  try {
    console.log('Starting patient ID assignment...');

    // Get all users ordered by creation date (oldest first)
    const users = await prisma.user.findMany({
      where: {
        patientId: null, // Only get users without patient IDs
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
    });

    console.log(`Found ${users.length} patients without patient IDs`);

    if (users.length === 0) {
      console.log('No patients need ID assignment.');
      return;
    }

    // Get the highest existing patient ID number
    const existingUsersWithIds = await prisma.user.findMany({
      where: {
        patientId: {
          not: null,
        },
      },
      select: {
        patientId: true,
      },
    });

    // Extract the highest number from existing IDs
    let highestNumber = 0;
    existingUsersWithIds.forEach((user) => {
      if (user.patientId && user.patientId.startsWith('OPT-')) {
        const number = parseInt(user.patientId.replace('OPT-', ''), 10);
        if (!isNaN(number) && number > highestNumber) {
          highestNumber = number;
        }
      }
    });

    console.log(`Highest existing patient ID number: ${highestNumber}`);
    console.log(`Starting assignment from: OPT-${String(highestNumber + 1).padStart(4, '0')}`);

    // Assign IDs sequentially
    let currentNumber = highestNumber + 1;
    let assignedCount = 0;

    for (const user of users) {
      const patientId = `OPT-${String(currentNumber).padStart(4, '0')}`;
      
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { patientId },
        });
        
        console.log(`✓ Assigned ${patientId} to user ${user.id} (${user.firstName || ''} ${user.lastName || ''} - ${user.primaryEmail || 'no email'})`);
        assignedCount++;
        currentNumber++;
      } catch (error) {
        console.error(`✗ Failed to assign ${patientId} to user ${user.id}:`, error.message);
        // Continue with next user
        currentNumber++;
      }
    }

    console.log(`\n✅ Successfully assigned ${assignedCount} patient IDs`);
    console.log(`Next available patient ID will be: OPT-${String(currentNumber).padStart(4, '0')}`);
  } catch (error) {
    console.error('Error assigning patient IDs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignPatientIds()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

