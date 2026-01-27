import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding lab test types...');

  const labTestTypes = [
    {
      name: 'Hemoglobin and Hematocrit',
      description: 'Measures hemoglobin and hematocrit levels to assess blood health and detect anemia',
      code: '7998',
    },
    {
      name: 'Comprehensive Metabolic Panel (CMP)',
      description: 'Comprehensive panel assessing glucose, electrolytes, kidney function, and liver enzymes',
      code: '10231',
    },
    {
      name: 'Testosterone, Free and Total, MS',
      description: 'Measures both free and total testosterone levels using mass spectrometry for accurate hormone assessment',
      code: '30741',
    },
    {
      name: 'Estradiol',
      description: 'Measures estradiol levels, a key estrogen hormone important for hormone balance',
      code: '4021',
    },
    {
      name: 'PSA, Total',
      description: 'Prostate-specific antigen test to assess prostate health',
      code: '5363',
    },
    {
      name: 'Luteinizing Hormone (LH)',
      description: 'Measures luteinizing hormone levels, important for reproductive and hormone function',
      code: '615',
    },
    {
      name: 'Sex Hormone Binding Globulin (SHBG)',
      description: 'Measures SHBG levels which affects the availability of sex hormones in the body',
      code: '30740',
    },
    {
      name: 'Lipid Panel with Ratios',
      description: 'Comprehensive lipid assessment including total cholesterol, HDL, LDL, triglycerides, and calculated ratios',
      code: '19543',
    },
  ];

  for (const testType of labTestTypes) {
    await prisma.labTestType.upsert({
      where: { name: testType.name },
      update: {
        description: testType.description,
        code: testType.code,
        isActive: true,
      },
      create: {
        name: testType.name,
        description: testType.description,
        code: testType.code,
        isActive: true,
      },
    });
    console.log(`✓ Seeded: ${testType.name}`);
  }

  console.log('Lab test types seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

