const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRESCRIPTION_TEXT = `Prescription Information:
Reconstitute with bacteriostatic water per pharmacy instructions.
• Inject once daily before bedtime
• Administer on an empty stomach
• Avoid food 2 hours before and 30–60 minutes after injection

Indications:
Tesamorelin may be prescribed for patients with:
• Excess visceral adiposity
• Metabolic dysfunction
• Hormone optimization support
• Reduced recovery capacity
• Body composition optimization

Tesamorelin stimulates the pituitary gland to increase endogenous growth hormone secretion, which may lead to improved fat metabolism and increased IGF-1 production.

Expected Benefits:
Patients may experience:
• Reduction in visceral abdominal fat
• Improved body composition
• Increased growth hormone and IGF-1 production
• Improved lipid metabolism
• Improved energy, recovery, and sleep quality
Clinical benefits typically begin within 6–12 weeks of therapy.

Potential Side Effects:
Tesamorelin is generally well tolerated. Possible side effects include:
• Injection site redness or irritation
• Joint stiffness
• Peripheral edema
• Headache
• Mild fluid retention
• Increased appetite
Most symptoms are mild and often improve with continued therapy.

Contraindications:
Tesamorelin should not be used in patients with:
• Active malignancy
• Known hypersensitivity to Tesamorelin
• Pregnancy
• Untreated pituitary disorders

Precautions:
Use caution in patients with:
• Diabetes mellitus
• Insulin resistance
• Elevated IGF-1 levels
• History of carpal tunnel syndrome
Tesamorelin increases growth hormone secretion and may elevate IGF-1 levels. Periodic monitoring is recommended.

Informed Consent and Patient Acknowledgment:
The risks, benefits, alternatives, and expected outcomes of Tesamorelin therapy were reviewed in detail with the patient. Potential side effects, contraindications, and the off-label nature of this therapy were discussed. The importance of appropriate monitoring, adherence to dosing instructions, and follow-up laboratory testing was also reviewed.
The patient was given the opportunity to ask questions, and all questions were answered to their satisfaction. The patient demonstrated understanding of the information provided, verbalized understanding of the treatment plan, and elects to proceed with Tesamorelin therapy at this time.
The patient acknowledges that results may vary and that no guarantees regarding outcomes have been made.`;

const medications = [
  {
    name: 'Tesamorelin',
    categoryName: 'Peptides & Longevity Medicine',
    therapyCategory: 'Peptides & Longevity',
    strength: '1 mg',
    dose: '1 mg',
    route: 'Subcutaneous Injection',
    frequency: 'Once daily',
    dosageInstruction:
      'Inject 1 mg subcutaneously once daily before bedtime on an empty stomach (avoid food 2 hours before and 30–60 minutes after injection).',
    directions:
      'Reconstitute with bacteriostatic water per pharmacy instructions. Inject once daily before bedtime on an empty stomach. Avoid food 2 hours before and 30–60 minutes after injection.',
    prescription: PRESCRIPTION_TEXT,
    standardPrice: '325.00',
    membershipPrice: '195.00',
    price: '325.00',
    discountedPrice: '195.00',
  },
  {
    name: 'Tesamorelin',
    categoryName: 'Peptides & Longevity Medicine',
    therapyCategory: 'Peptides & Longevity',
    strength: '2 mg',
    dose: '2 mg',
    route: 'Subcutaneous Injection',
    frequency: 'Once daily',
    dosageInstruction:
      'Inject 2 mg subcutaneously once daily before bedtime on an empty stomach (avoid food 2 hours before and 30–60 minutes after injection).',
    directions:
      'Reconstitute with bacteriostatic water per pharmacy instructions. Inject once daily before bedtime on an empty stomach. Avoid food 2 hours before and 30–60 minutes after injection.',
    prescription: PRESCRIPTION_TEXT,
    standardPrice: '325.00',
    membershipPrice: '195.00',
    price: '325.00',
    discountedPrice: '195.00',
  },
];

async function addTesamorelin() {
  console.log('Adding Tesamorelin variations...\n');

  for (const med of medications) {
    try {
      const created = await prisma.medication.upsert({
        where: {
          name_strength_dose_frequency_route: {
            name: med.name,
            strength: med.strength,
            dose: med.dose,
            frequency: med.frequency,
            route: med.route,
          },
        },
        update: {
          categoryName: med.categoryName,
          therapyCategory: med.therapyCategory,
          dosageInstruction: med.dosageInstruction,
          directions: med.directions,
          prescription: med.prescription,
          standardPrice: med.standardPrice,
          membershipPrice: med.membershipPrice,
          price: med.price,
          discountedPrice: med.discountedPrice,
          isActive: true,
        },
        create: {
          ...med,
          isActive: true,
        },
      });
      console.log(`✓ Upserted: ${created.name} ${created.strength} (${created.route})`);
    } catch (error) {
      console.error(`✗ Error adding ${med.name} ${med.strength}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
  await prisma.$disconnect();
}

addTesamorelin();
