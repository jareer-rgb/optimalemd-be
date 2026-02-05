const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const assessmentContent = `## Hypertriglyceridemia

### Assessment (Extended)

Elevated triglycerides increase cardiovascular and (if very high) pancreatitis risk. Management emphasizes carbohydrate reduction, alcohol minimization, weight loss, and omega-3s/fiber.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP/Cardiology follow-up; review secondary causes (alcohol, diabetes, hypothyroid, meds).
- If TG >500 mg/dL, prioritize pancreatitis risk reduction.

#### 2) Lifestyle & Behavioral

- **Exercise**: 150 minutes/week aerobic + resistance training.
- **Weight loss** if overweight.
- **Sleep optimization** and stress reduction.

#### 3) Dietary & Nutrition

- **Reduce**: added sugars, refined carbs, trans fats, alcohol.
- **Emphasize**: omega-3 fish, high-fiber whole foods, legumes, lean proteins.
- **Portion control** and consistent meal structure.

#### 4) Supplements / Adjunctive (Provider-Guided)

- Psyllium 10–20 g/day
- Omega-3 2–4 g/day (EPA/DHA) as indicated
- Berberine 500 mg 2–3x/day
- Garlic extract 600–1200 mg/day
- Replace branded references:
  - OptimaleMD "Calm"

#### 5) Monitoring / Testing

- Repeat fasting lipid panel in 8–12 weeks.
- Check A1c, TSH, CMP; evaluate alcohol intake.

#### 6) Red Flags / Escalation

- Severe abdominal pain, vomiting (pancreatitis concern) especially if TG very high → urgent evaluation.`;

async function addHypertriglyceridemiaAssessment() {
  try {
    console.log('🚀 Starting to add Hypertriglyceridemia assessment...');

    // Check if assessment already exists
    const existing = await prisma.assessment.findUnique({
      where: { name: 'Hypertriglyceridemia' },
    });

    if (existing) {
      console.log('⚠️  Assessment "Hypertriglyceridemia" already exists. Updating...');
      const updated = await prisma.assessment.update({
        where: { id: existing.id },
        data: {
          content: assessmentContent,
        },
      });
      console.log('✅ Assessment updated successfully!');
      console.log(`   ID: ${updated.id}`);
      console.log(`   Name: ${updated.name}`);
      console.log(`   Content length: ${updated.content.length} characters`);
    } else {
      const assessment = await prisma.assessment.create({
        data: {
          name: 'Hypertriglyceridemia',
          content: assessmentContent,
        },
      });
      console.log('✅ Assessment created successfully!');
      console.log(`   ID: ${assessment.id}`);
      console.log(`   Name: ${assessment.name}`);
      console.log(`   Content length: ${assessment.content.length} characters`);
    }
  } catch (error) {
    console.error('❌ Error adding assessment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addHypertriglyceridemiaAssessment()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
