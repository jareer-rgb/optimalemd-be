const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const medications = [
  {
    name: 'Standard Lab Panel & Consultation',
    price: '85.00',
    discountedPrice: '30.00',
  },
  {
    name: 'Testosterone shots (injectible)',
    price: '60.00',
    discountedPrice: '30.00',
  },
  {
    name: 'Testosterone cream',
    price: '120.00',
    discountedPrice: '60.00',
  },
  
  {
    name: 'Testosterone sublingual tablet',
    price: '120.00',
    discountedPrice: '60.00',
  },
  {
    name: 'Oral capsule minoxidil',
    price: '120.00',
    discountedPrice: '95.99',
  },
  {
    name: 'Oral capsule minoxidil/finasteride/vitamins',
    price: '245.00',
    discountedPrice: '130.00',
  },
  {
    name: 'Finasteride pill',
    price: '150.00',
    discountedPrice: '99.99',
  },
  {
    name: 'Hair restore topical solution',
    price: '195.00',
    discountedPrice: '120.00',
  },
  {
    name: 'Tirzepatide (injectible) - Monthly',
    price: '699.00',
    discountedPrice: '399.00',
  },
  {
    name: 'Tirzepatide (injectible) - Full course',
    price: '2097.00',
    discountedPrice: '1197.00',
  },
  {
    name: 'Semaglutide (injectible) - Monthly',
    price: '399.00',
    discountedPrice: '309.00',
  },
  {
    name: 'Semaglutide (injectible) - 3-month lumpsum',
    price: '1199.99',
    discountedPrice: '925.99',
  },
  {
    name: 'Bupropion/topiramate/naltrexone - 3-month supply',
    price: '395.00',
    discountedPrice: '199.99',
  },
  {
    name: 'Bupropion/topiramate/naltrexone - Monthly',
    price: '140.00',
    discountedPrice: '75.00',
  },
  {
    name: 'Tadalafil (oral tablets)',
    price: '120.00',
    discountedPrice: '59.99',
  },
  {
    name: 'Sildenafil (oral tablets)',
    price: '150.00',
    discountedPrice: '80.99',
  },
  {
    name: 'PT141',
    price: '305.00',
    discountedPrice: '225.00',
  },
  {
    name: 'Sermorellin (injectible)',
    price: '299.00',
    discountedPrice: '130.00',
  },
  {
    name: 'CJC/Ipamorellin (injectible)',
    price: '275.00',
    discountedPrice: '170.00',
  },
  {
    name: 'Tesamorelin',
    price: '325.00',
    discountedPrice: '195.00',
  },
  {
    name: 'BPC-157 (injectible)',
    price: '175.00',
    discountedPrice: '95.99',
  },
  {
    name: 'Wolverine blend (injectible)',
    price: '250.00',
    discountedPrice: '145.99',
  },
  {
    name: 'Selanke/Semax (intranasal)',
    price: '312.50',
    discountedPrice: '187.50',
  },
  {
    name: 'Labs and Initial Consult',
    price: '75.00',
    discountedPrice: null,
  },
  {
    name: 'Enclomiphene',
    price: '210.00',
    discountedPrice: '120.00',
  },
  {
    name: 'Retatrutide',
    price: '1200.00',
    discountedPrice: '800.00',
  },
  {
    name: 'DHEA Sulfate sustained Release 90 day',
    price: '120.00',
    discountedPrice: '120.00',
  },
  {
    name: 'Pregnenolone',
    price: '120.00',
    discountedPrice: '120.00',
  },
  {
    name: 'Shilajit Supplementation - Monthly',
    price: '90.00',
    discountedPrice: '70.00',
  },
  {
    name: 'Magnesium L-Threonate - 60-day supply',
    price: '69.99',
    discountedPrice: '45.00',
  },
  {
    name: 'Prescription Grade Multivitamin - 90-day supply',
    price: '220.00',
    discountedPrice: '160.00',
  },
  {
    name: 'Ashwagandha Root - 60-day supply',
    price: '70.00',
    discountedPrice: '49.99',
  },
  {
    name: 'Vitamin D3 - 90-day supply',
    price: '70.00',
    discountedPrice: '49.99',
  },
];

async function addMedications() {
  try {
    console.log('Starting to add medications...');
    
    for (const medication of medications) {
      try {
        const created = await prisma.medication.create({
          data: {
            name: medication.name,
            price: medication.price,
            discountedPrice: medication.discountedPrice,
            isActive: true,
          },
        });
        console.log(`✓ Added: ${medication.name}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠ Skipped (already exists): ${medication.name}`);
        } else {
          console.error(`✗ Error adding ${medication.name}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Finished adding medications!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMedications();

