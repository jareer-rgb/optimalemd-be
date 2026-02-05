const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const assessments = [
  {
    name: 'Hypothyroidism',
    content: `## Hypothyroidism

### Assessment (Extended)

Underactive thyroid may cause fatigue, weight gain, constipation, hair/skin changes, depression. Requires adherence to thyroid replacement when indicated and supportive lifestyle measures.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP/Endocrinology follow-up.
- Levothyroxine: empty stomach, 30–60 minutes before food; separate iron/calcium/soy.

#### 2) Lifestyle & Behavioral

- Consistent sleep, daily movement, stress management.
- Avoid extreme dieting; prioritize sustainable nutrition.

#### 3) Dietary & Nutrition

- Whole foods emphasizing protein, fiber, healthy fats.
- Selenium/zinc/iron adequacy via food or supplementation if deficient.
- Avoid excessive raw cruciferous intake (cooked is fine).

#### 4) Supplements / Adjunctive (Provider-Guided)

- Selenium 100–200 mcg/day
- Vitamin D based on labs
- B12/folate if low
- Magnesium 200–400 mg/day

#### 5) Monitoring / Testing

- TSH/free T4 every 6–12 weeks until stable; then q6–12 months.
- Evaluate persistent symptoms for OSA, anemia, depression.

#### 6) Red Flags / Escalation

- Palpitations/anxiety suggesting over-replacement; pregnancy/planning pregnancy; goiter symptoms.`
  },
  {
    name: 'Incontinence',
    content: `## Incontinence

### Assessment (Extended)

Stress/urge/mixed incontinence may be influenced by pelvic floor weakness, bladder irritants, constipation, obesity, or neurologic factors. First-line: pelvic floor training and bladder retraining.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP/GYN/Urology follow-up depending on type/severity.
- Identify pattern: stress vs urge vs mixed.

#### 2) Lifestyle & Behavioral

- Pelvic floor muscle training (Kegels): 10–15 reps, 3x/day for 6–12 weeks.
- Bladder training: timed voiding; gradual interval extension.
- Manage constipation; maintain hydration.

#### 3) Dietary & Nutrition

- Avoid bladder irritants: caffeine, alcohol, carbonated drinks, citrus, spicy foods, artificial sweeteners.
- Increase fiber for bowel regularity.

#### 4) Adjunctive Options (Provider-Guided)

- Pelvic floor PT referral
- Pessary/vaginal supports (women)
- Topical vaginal estrogen (post-menopausal, if appropriate)
- Pumpkin seed extract/magnesium (adjunct only)

#### 5) Monitoring / Testing

- Symptom diary: urgency, leakage, triggers.
- UA if urinary symptoms; evaluate for infection.

#### 6) Red Flags / Escalation

- Hematuria, dysuria/fever, acute onset severe incontinence, neurologic symptoms → urgent evaluation.`
  },
  {
    name: 'Insomnia',
    content: `## Insomnia

### Assessment (Extended)

Insomnia may be primary or secondary to anxiety/depression, sleep apnea, restless legs, medication/substance effects, poor sleep hygiene.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP follow-up if persistent >4 weeks or associated with daytime impairment.
- Consider CBT-I as gold standard.

#### 2) Lifestyle & Behavioral

- Fixed wake time daily; consistent sleep window.
- No screens 60 minutes before bed; dim lighting.
- Exercise earlier in day (avoid within 4–6 hours of bedtime).
- Avoid naps or limit to <20 minutes early afternoon.
- If awake >20 minutes: get up and do calm activity in low light.

#### 3) Dietary & Nutrition

- Avoid: late meals, alcohol near bedtime, caffeine after late morning/early afternoon.
- Light evening meal; consider sleep-supportive foods (oats, tart cherry, chamomile).

#### 4) Supplements / Adjunctive (Provider-Guided)

- OptimaleMD "Sleep"
- OptimaleMD "Calm"
- OptimaleMD "Multiple Vitamin"
- Magnesium glycinate 200–400 mg nightly
- Melatonin 0.5–3 mg nightly (short-term trial)

#### 5) Monitoring / Testing

- Screen for OSA if snoring, witnessed apneas, morning headaches.
- Review meds/substances (THC, alcohol, stimulants).

#### 6) Red Flags / Escalation

- Severe daytime sleepiness impairing safety; suspected OSA; manic symptoms → urgent evaluation.`
  },
  {
    name: 'Iron Deficiency Anemia',
    content: `## Iron Deficiency Anemia

### Assessment (Extended)

Iron deficiency anemia commonly results from blood loss (GI/gynecologic) or inadequate intake/absorption. Requires evaluation of cause plus repletion.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP follow-up for workup and monitoring; GI referral if bleeding suspected.

#### 2) Lifestyle & Behavioral

- Energy conservation during repletion; gentle activity.
- Manage stress and sleep to support recovery.

#### 3) Dietary & Nutrition

- Iron-rich foods: red meat/liver (if appropriate), lentils, spinach, pumpkin seeds, shellfish.
- Pair with vitamin C for absorption.
- Avoid tea/coffee/calcium near iron dosing.

#### 4) Supplements / Adjunctive (Provider-Guided)

- Iron (ferrous sulfate or bisglycinate) 25–65 mg elemental daily or every other day (tolerance dependent)
- Vitamin C 250–500 mg with iron
- B12/folate if deficient

#### 5) Monitoring / Testing

- CBC, ferritin, iron/TIBC; repeat in ~8–12 weeks.
- Identify source: stool testing/colonoscopy or GYN eval as indicated.

#### 6) Red Flags / Escalation

- Syncope, chest pain, SOB, Hb <10 or symptomatic anemia, black/tarry stools → urgent evaluation.`
  },
  {
    name: 'Low Testosterone',
    content: `## Low Testosterone

### Assessment (Extended)

Symptoms suggestive of hypogonadism may be due to obesity/insulin resistance, poor sleep/OSA, stress, medications, alcohol/THC, or primary testicular dysfunction. Confirm with morning labs (repeat if borderline).

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP/Urology follow-up; confirm diagnosis with AM total testosterone (x2), free T, LH/FSH, prolactin as indicated.
- Discuss fertility goals—exogenous testosterone may suppress spermatogenesis.

#### 2) Lifestyle & Behavioral

- Weight loss (10–15% if overweight) improves testosterone.
- Resistance training 3–5x/week with progressive overload.
- Sleep 7–9 hours; evaluate/treat OSA.
- Stress reduction: mindfulness/breathwork; reduce overtraining.

#### 3) Dietary & Nutrition

- High-protein, low-glycemic approach.
- Reduce alcohol and ultra-processed foods.

#### 4) Supplements / Adjunctive (Provider-Guided)

- Vitamin D 2000–5000 IU/day (labs-guided)
- Zinc 15–30 mg/day
- Magnesium 200–400 mg/day
- Omega-3 1000–3000 mg/day
- Ashwagandha 300–600 mg/day
- Consider boron 3–6 mg/day (short-term trials)

#### 5) Monitoring / Testing

- Baseline labs if considering TRT: CBC, CMP, lipids, A1c, PSA (age-appropriate), estradiol, LH/FSH.
- Reassess symptoms and labs 8–12 weeks after interventions.

#### 6) Red Flags / Escalation

- Severe ED, infertility concerns, pituitary symptoms (headache/vision changes) → specialist evaluation.`
  },
  {
    name: 'Obesity',
    content: `## Obesity

### Assessment (Extended)

Chronic metabolic condition driven by energy balance, insulin resistance, sleep, stress, and environment. Focus on sustainable nutrition, movement, behavior, and medical therapy when appropriate.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP follow-up for metabolic risk assessment (A1c, lipids, BP) and medication options if indicated.

#### 2) Lifestyle & Behavioral

- Movement: 150 minutes/week + resistance training 2–3x/week.
- Daily step target individualized; add post-meal walks.
- Sleep: 7–9 hours; evaluate OSA risk.
- Behavioral: food environment control, meal planning, weekly weigh-ins + waist tracking.

#### 3) Dietary & Nutrition

- Prioritize: protein, fiber, vegetables, whole foods.
- Reduce: sugar drinks, refined carbs, ultra-processed foods.
- Mediterranean/DASH/pescatarian patterns acceptable.
- Portion control tools; consistent meal timing.

#### 4) Supplements / Adjunctive

- Replace branded references:
  - OptimaleMD "Biome"
  - OptimaleMD "Calm"
  - OptimaleMD "Vitamin D&K"
  - OptimaleMD "Longevity"
  - OptimaleMD "Slumber"

#### 5) Monitoring / Testing

- Track weight trend, waist circumference, BP.
- Labs: A1c, lipids, CMP; consider TSH/Vit D/B12.

#### 6) Red Flags / Escalation

- Rapid unexplained weight loss, severe sleepiness, new chest pain → urgent evaluation.`
  },
  {
    name: 'Obstructive Sleep Apnea (OSA)',
    content: `## Obstructive Sleep Apnea (OSA)

### Assessment (Extended)

Symptoms and risk factors may suggest OSA, which worsens fatigue, insulin resistance, hypertension, and mood. Confirm via sleep testing.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP follow-up and sleep study (home or lab) if suspected.

#### 2) Lifestyle & Behavioral

- Weight loss (5–10%) can reduce AHI.
- Positional therapy: side sleeping, positional devices.
- Sleep schedule regularity; avoid sedatives/alcohol near bedtime.

#### 3) Mechanical/Supportive Interventions

- Oral appliance (MAD) for mild/moderate OSA or CPAP-intolerant.
- Nasal optimization: saline rinses, nasal steroids if rhinitis, strips.
- Myofunctional therapy exercises.

#### 4) Escalation to CPAP

- CPAP remains gold standard for moderate–severe OSA or significant symptoms.

#### 5) Monitoring / Testing

- Sleep study results, adherence metrics if on CPAP.
- Consider cardiometabolic labs (A1c, lipids).

#### 6) Red Flags / Escalation

- Excessive daytime sleepiness impacting driving, severe snoring with witnessed apneas → expedited testing.`
  },
  {
    name: 'Overweight',
    content: `## Overweight

### Assessment (Extended)

Overweight status increases cardiometabolic risk; interventions mirror obesity plan with smaller targets and emphasis on prevention.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP follow-up to assess metabolic risk and set healthy targets.

#### 2) Lifestyle & Behavioral

- 150 minutes/week exercise + strength training.
- Post-meal walking; consistent sleep schedule.
- Stress reduction and habit building.

#### 3) Dietary & Nutrition

- Mediterranean/DASH approach.
- Protein + fiber focus; reduce refined carbs and sugar drinks.
- Portion control and mindful eating.

#### 4) Supplements / Adjunctive

- Replace branded references:
  - OptimaleMD "Biome"
  - OptimaleMD "Calm"
  - OptimaleMD "Vitamin D&K"
  - OptimaleMD "Longevity"
  - OptimaleMD "Slumber"

#### 5) Monitoring / Testing

- Track weight, waist, BP, A1c/lipids if indicated.

#### 6) Red Flags / Escalation

- Progressive weight gain despite adherence; symptoms of OSA; metabolic abnormalities → escalate management.`
  },
  {
    name: 'Peyronie Disease',
    content: `## Peyronie Disease

### Assessment (Extended)

Fibrotic plaque formation causing penile curvature, pain, and/or erectile dysfunction. Conservative therapy is most effective early in the active phase.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP/Urology follow-up for staging (active vs stable), curvature measurement, and treatment options.

#### 2) Conservative Mechanical Therapy

- Penile traction therapy: 30–90 min/day (RestoreX preferred evidence base; alternatives acceptable).
- Vacuum erection device: 5–10 minutes daily or 5x/week (no constriction ring for Peyronie therapy).

#### 3) Lifestyle & Behavioral

- Avoid tobacco; optimize cardiovascular health.
- Avoid penile trauma; use adequate lubrication; avoid aggressive intercourse during active phase.

#### 4) Supplements / Adjunctive (Provider-Guided)

- CoQ10 300 mg/day
- L-carnitine 1–2 g/day
- Vitamin E 400–800 IU/day (mixed evidence)
- Omega-3 1000–3000 mg/day
- Potaba (GI side effects; specialist-directed)

#### 5) Monitoring / Testing

- Track curvature/pain monthly; erectile function tracking.
- Testosterone evaluation if ED present.

#### 6) Red Flags / Escalation

- Curvature >30–40° interfering with intercourse, stable >12 months, significant ED → consider Xiaflex/intralesional therapy/surgery.`
  },
  {
    name: 'Supraphysiologic Testosterone Levels',
    content: `## Supraphysiologic Testosterone Levels

### Assessment (Extended)

Testosterone above target range can result from dosing errors, exogenous androgen use, lab issues, or rare adrenal/gonadal pathology. Risks include polycythemia, acne, mood changes, aromatization effects, and fertility suppression.

### Plan (Extended)

#### 1) Education & Follow-Up

- PCP/endocrine/urology follow-up depending on context.
- Review all androgen sources: injections, creams, pellets, OTC boosters (DHEA, tongkat, etc.).

#### 2) Dose / Exposure Management

- If prescribed TRT: reduce dose or switch to shorter-acting regimen for titration.
- Confirm injection technique and dosing accuracy.

#### 3) Lifestyle & Behavioral

- Weight management and reduced alcohol/sugar to reduce aromatization.
- Sleep optimization; evaluate for OSA.

#### 4) Aromatization & Symptom Support (Provider-Guided)

- Zinc 15–30 mg/day
- DIM or calcium-D-glucarate for estrogen metabolism support (select patients)
- Avoid unnecessary high-dose "test boosters."

#### 5) Monitoring / Testing

- Recheck total/free testosterone, estradiol, CBC (hematocrit), CMP, lipids; PSA age-appropriate.
- If unexplained: LH/FSH, DHEA-S, consider imaging per specialist.

#### 6) Red Flags / Escalation

- Hematocrit markedly elevated, severe hypertension, virilization in women, testicular/adrenal mass concerns, infertility → expedited specialist evaluation.`
  }
];

async function addAllAssessments() {
  try {
    console.log(`🚀 Starting to add ${assessments.length} assessments...\n`);

    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i];
      console.log(`[${i + 1}/${assessments.length}] Processing: ${assessment.name}`);

      try {
        // Check if assessment already exists
        const existing = await prisma.assessment.findUnique({
          where: { name: assessment.name },
        });

        if (existing) {
          console.log(`  ⚠️  Already exists. Updating...`);
          const updated = await prisma.assessment.update({
            where: { id: existing.id },
            data: {
              content: assessment.content,
            },
          });
          console.log(`  ✅ Updated successfully! (ID: ${updated.id})\n`);
        } else {
          const created = await prisma.assessment.create({
            data: {
              name: assessment.name,
              content: assessment.content,
            },
          });
          console.log(`  ✅ Created successfully! (ID: ${created.id})\n`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing ${assessment.name}:`, error.message);
        console.log(`  Continuing with next assessment...\n`);
      }
    }

    console.log('✨ All assessments processed!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addAllAssessments()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });


