const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DHEA_PRESCRIPTION = `Indications
DHEA supplementation may be considered in patients with:
• Low serum DHEA-S levels
• Symptoms of hormonal decline
• Fatigue or reduced energy
• Decreased libido
• Reduced muscle mass
• Mood changes
• Age-related hormone decline
DHEA is an endogenous adrenal hormone that serves as a precursor to androgens and estrogens, and supplementation may support hormonal balance and overall metabolic health.

Expected Benefits
Patients may experience:
• Improved energy levels
• Enhanced libido
• Improved mood and motivation
• Support for muscle maintenance
• Potential support for bone density
• Hormonal balance support
Clinical effects are typically observed within 4–8 weeks.`;

const MULTIVITAMIN_PRESCRIPTION = `Expected Benefits
Patients may experience:
• Improved energy levels
• Enhanced immune support
• Improved metabolic function
• Support for cardiovascular health
• Support for hormone production
• Support for skin, hair, and nail health
Multivitamins may also help ensure adequate intake of essential micronutrients that support overall health.`;

const PREGNENOLONE_PRESCRIPTION = `Indications
Pregnenolone supplementation may be considered in patients with:
• Low serum pregnenolone levels
• Fatigue or low energy
• Cognitive decline or brain fog
• Reduced stress resilience
• Mood changes
• Age-related hormone decline
• Hormone optimization programs
Pregnenolone is a precursor steroid hormone produced primarily in the adrenal glands and brain. It serves as a precursor for multiple downstream hormones including:
• Progesterone
• DHEA
• Testosterone
• Estrogens
• Cortisol
Supplementation may support neurosteroid production, cognitive function, mood stability, and hormonal balance.

Expected Benefits
Patients may experience:
• Improved mental clarity
• Improved focus and memory
• Increased energy levels
• Improved stress resilience
• Improved mood stability
• Support for hormonal balance
Clinical benefits are typically observed within 2–6 weeks of therapy.

Potential Side Effects
Pregnenolone is generally well tolerated at appropriate doses. Possible side effects include:
• Mild headache
• Irritability
• Anxiety
• Gastrointestinal upset
• Sleep disturbances in sensitive individuals
Side effects are typically dose-related and may improve with dose adjustment.

Contraindications
Pregnenolone should not be used in patients with:
• Known hypersensitivity to pregnenolone
• Active hormone-sensitive malignancy without physician clearance
• Pregnancy

Precautions
Use caution in patients with:
• Hormone-sensitive cancers
• Severe mood disorders
• History of hormone imbalance
Pregnenolone may influence downstream hormone pathways and should be monitored appropriately.

Patient Counseling
Patients should be advised to:
• Take medication once daily in the evening
• Take with food if gastrointestinal upset occurs
• Avoid exceeding the recommended dose
• Report new symptoms such as anxiety, irritability, or sleep disturbances
• Continue routine follow-up visits and laboratory monitoring

Treatment Duration
Pregnenolone supplementation may be continued long-term if clinically beneficial and laboratory monitoring remains appropriate. Clinical reassessment is recommended every 3–6 months.

Informed Consent and Patient Acknowledgment
The risks, benefits, alternatives, and expected outcomes of pregnenolone supplementation were reviewed with the patient in detail. Potential side effects, contraindications, and the importance of appropriate monitoring were discussed.
The patient was given the opportunity to ask questions, and all questions were answered to their satisfaction. The patient verbalized understanding of the treatment plan and elects to proceed with pregnenolone therapy at this time. The patient acknowledges that individual responses to therapy may vary and that no guarantees regarding outcomes have been made.`;

const medications = [
  // DHEA E4M
  {
    name: 'DHEA E4M',
    categoryName: 'Supplements',
    therapyCategory: 'Supplements',
    strength: '25 mg Capsule',
    dose: '1 Capsule',
    frequency: 'Once daily in the morning',
    route: 'Oral',
    dosageInstruction: 'Take 1 capsule (25 mg) orally once daily in the morning.',
    directions: 'Take 1 capsule once daily in the morning.',
    prescription: DHEA_PRESCRIPTION,
    standardPrice: '0.00',
    membershipPrice: '0.00',
    price: '0.00',
    discountedPrice: '0.00',
    isActive: true,
  },

  // Prescription Grade Multivitamin
  {
    name: 'Prescription Grade Multivitamin',
    categoryName: 'Supplements',
    therapyCategory: 'Supplements',
    strength: 'As directed',
    dose: 'As directed',
    frequency: 'Once daily',
    route: 'Oral',
    dosageInstruction: 'Take as directed once daily.',
    directions: 'Take as directed once daily.',
    prescription: MULTIVITAMIN_PRESCRIPTION,
    standardPrice: '0.00',
    membershipPrice: '0.00',
    price: '0.00',
    discountedPrice: '0.00',
    isActive: true,
  },

  // Pregnenolone E4M Capsule — 3 dose options
  {
    name: 'Pregnenolone E4M Capsule',
    categoryName: 'Supplements',
    therapyCategory: 'Supplements',
    strength: '10 mg',
    dose: '1 Capsule',
    frequency: 'Once daily in the evening',
    route: 'Oral',
    dosageInstruction: 'Take 1 capsule (10 mg) orally once daily in the evening.',
    directions: 'Take 1 capsule once daily in the evening. May be taken with food if gastrointestinal upset occurs.',
    prescription: PREGNENOLONE_PRESCRIPTION,
    standardPrice: '0.00',
    membershipPrice: '0.00',
    price: '0.00',
    discountedPrice: '0.00',
    isActive: true,
  },
  {
    name: 'Pregnenolone E4M Capsule',
    categoryName: 'Supplements',
    therapyCategory: 'Supplements',
    strength: '25 mg',
    dose: '1 Capsule',
    frequency: 'Once daily in the evening',
    route: 'Oral',
    dosageInstruction: 'Take 1 capsule (25 mg) orally once daily in the evening.',
    directions: 'Take 1 capsule once daily in the evening. May be taken with food if gastrointestinal upset occurs.',
    prescription: PREGNENOLONE_PRESCRIPTION,
    standardPrice: '0.00',
    membershipPrice: '0.00',
    price: '0.00',
    discountedPrice: '0.00',
    isActive: true,
  },
  {
    name: 'Pregnenolone E4M Capsule',
    categoryName: 'Supplements',
    therapyCategory: 'Supplements',
    strength: '50 mg',
    dose: '1 Capsule',
    frequency: 'Once daily in the evening',
    route: 'Oral',
    dosageInstruction: 'Take 1 capsule (50 mg) orally once daily in the evening.',
    directions: 'Take 1 capsule once daily in the evening. May be taken with food if gastrointestinal upset occurs.',
    prescription: PREGNENOLONE_PRESCRIPTION,
    standardPrice: '0.00',
    membershipPrice: '0.00',
    price: '0.00',
    discountedPrice: '0.00',
    isActive: true,
  },
];

async function addSupplements() {
  console.log('Adding Supplements...\n');

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
        create: med,
      });
      console.log(`✓ Upserted: ${created.name} – ${created.strength} (${created.frequency})`);
    } catch (error) {
      console.error(`✗ Error: ${med.name} ${med.strength}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
  await prisma.$disconnect();
}

addSupplements();
