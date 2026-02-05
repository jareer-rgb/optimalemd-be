import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generate the next sequential patient ID (OPT-0001, OPT-0002, etc.)
 * @param prisma PrismaService instance
 * @returns Promise<string> The next available patient ID
 */
export async function generateNextPatientId(prisma: PrismaService): Promise<string> {
  // Get the highest existing patient ID number
  const existingUsers = await prisma.user.findMany({
    where: {
      patientId: {
        not: null,
      },
    },
    select: {
      patientId: true,
    },
    orderBy: {
      createdAt: 'desc', // Get most recent first to find highest number
    },
  });

  // Extract the highest number from existing IDs
  let highestNumber = 0;
  
  for (const user of existingUsers) {
    if (user.patientId && user.patientId.startsWith('OPT-')) {
      const numberStr = user.patientId.replace('OPT-', '');
      const number = parseInt(numberStr, 10);
      if (!isNaN(number) && number > highestNumber) {
        highestNumber = number;
      }
    }
  }

  // Generate next ID
  const nextNumber = highestNumber + 1;
  const patientId = `OPT-${String(nextNumber).padStart(4, '0')}`;

  return patientId;
}

