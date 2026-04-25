const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRESCRIPTION_TEXT = `Prescription Information:

Administration Instructions:
• Inject once weekly on the same day each week
• May be administered with or without food
• If a dose is missed and the next scheduled dose is more than 48 hours away, administer the missed dose as soon as possible
• If within 48 hours of next scheduled dose, skip the missed dose and resume normal schedule

Injection Instructions:
Retatrutide should be administered subcutaneously. Recommended injection sites:
• Abdomen
• Upper thigh
• Upper outer arm

Injection guidance:
• Use 29–31 gauge insulin syringe
• Clean injection site with alcohol swab
• Inject into subcutaneous fat
• Rotate injection sites weekly

Expected Benefits:
Patients may experience:
• Reduced appetite and cravings
• Earlier satiety with meals
• Significant weight loss
• Reduction in visceral fat
• Improved insulin sensitivity
• Improved metabolic markers (lipids, glucose)
Clinical weight loss often begins within 2–4 weeks, with progressive improvements over 3–12 months.

Lifestyle Recommendations:
Medication should be used in conjunction with:
• Calorie-controlled diet
• Adequate protein intake
• Regular physical activity
• Resistance training to preserve lean muscle mass
• Adequate hydration

Common Side Effects:
Most side effects are gastrointestinal and occur during dose escalation. Possible side effects include:
• Nausea
• Reduced appetite
• Constipation
• Diarrhea
• Bloating
• Fatigue
• Mild reflux
Symptoms are typically transient and improve with continued therapy.

Serious Risks (Rare):
Patients should seek medical attention for:
• Persistent severe abdominal pain (possible pancreatitis)
• Severe vomiting or dehydration
• Signs of gallbladder disease
• Symptoms of allergic reaction

Contraindications:
Retatrutide should not be used in patients with:
• Personal or family history of medullary thyroid carcinoma
• Multiple endocrine neoplasia syndrome type 2 (MEN2)
• Known hypersensitivity to medication components
• Pregnancy

Precautions:
Use caution in patients with:
• History of pancreatitis
• Gallbladder disease
• Severe gastrointestinal disease
• Insulin-treated diabetes (may require medication adjustments)
Gradual dose escalation is recommended to improve tolerability.`;

const medications = [
  // ─── Titration option (Weeks 1–16 escalation) ───
  {
    strength:
      'Week 1–4: Inject 1 mg subcutaneously once weekly. • ' +
      'Week 5–8: Increase to 2 mg once weekly. • ' +
      'Week 9–12: Increase to 4 mg once weekly. • ' +
      'Week 13–16: Increase to 6 mg once weekly if clinically indicated.',
    dose: '',
    frequency: 'Once weekly',
    dosageInstruction:
      'Week 1–4: Inject 1 mg subcutaneously once weekly.\n' +
      'Week 5–8: Increase to 2 mg once weekly.\n' +
      'Week 9–12: Increase to 4 mg once weekly.\n' +
      'Week 13–16: Increase to 6 mg once weekly if clinically indicated.',
  },
  // ─── Maintenance options ───
  {
    strength: '8 mg',
    dose: '8 mg',
    frequency: 'Once weekly',
    dosageInstruction: 'Inject 8 mg subcutaneously once weekly on the same day each week.',
  },
  {
    strength: '10 mg',
    dose: '10 mg',
    frequency: 'Once weekly',
    dosageInstruction: 'Inject 10 mg subcutaneously once weekly on the same day each week.',
  },
  {
    strength: '12 mg',
    dose: '12 mg',
    frequency: 'Once weekly',
    dosageInstruction: 'Inject 12 mg subcutaneously once weekly on the same day each week.',
  },
].map(v => ({
  name: 'Retatrutide',
  categoryName: 'Weight Loss & Obesity Medicine',
  therapyCategory: 'Weight Loss & Obesity Medicine',
  route: 'Subcutaneous Injection',
  directions:
    'Inject once weekly on the same day each week. May be administered with or without food. Rotate injection sites (abdomen, upper thigh, upper outer arm). Use 29–31 gauge insulin syringe.',
  prescription: PRESCRIPTION_TEXT,
  standardPrice: '1200.00',
  membershipPrice: '800.00',
  price: '1200.00',
  discountedPrice: '800.00',
  isActive: true,
  ...v,
}));

async function addRetatrutide() {
  console.log('Adding Retatrutide variations...\n');

  // Remove the old titration entry that used the short strength label
  try {
    const deleted = await prisma.medication.deleteMany({
      where: {
        name: 'Retatrutide',
        dose: '',
        OR: [
          { strength: 'Titration (1→2→4→6 mg)' },
          { strength: { contains: 'Week 1' } },
        ],
      },
    });
    if (deleted.count > 0) {
      console.log(`✓ Removed old titration entry (${deleted.count} record)`);
    }
  } catch (e) {
    console.log('No old titration entry to remove, continuing...');
  }


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

addRetatrutide();
