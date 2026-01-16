#!/bin/bash

# Sample medications curl requests
# Replace YOUR_JWT_TOKEN with actual JWT token
# Replace BASE_URL with your API base URL (e.g., http://localhost:3000/api)
#
# This script includes comprehensive variations for testing:
# 1. Finasteride pill - Multiple variations:
#    - Different strengths: 1mg, 50mg, 60mg
#    - Different frequencies: Once daily, Once weekly
#    - Different doses: 1 tablet, 2 tablets
#
# 2. Testosterone Injections - Multiple variations:
#    - Different strengths: 100mg/ml, 200mg/ml, 250mg/ml
#    - Different frequencies: Daily, Every other day, Once weekly, Twice weekly
#    - Different doses: 0.2ml, 0.25ml, 0.3ml, 0.4ml, 0.5ml, 0.6ml
#
# 3. Tadalafil (oral tablets) - Multiple variations:
#    - Different strengths: 5mg, 10mg, 20mg
#    - Different frequencies: Once daily, Every other day, As needed
#    - Different doses: 1 tablet, 2 tablets

BASE_URL="http://localhost:3000/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3M2EzYzI1Mi0zOGNmLTQ1MmUtOWFmZC0wNzQ3MWI1ZWFiMDIiLCJlbWFpbCI6ImRyc2FtQG9wdGltYWxlbWQuaGVhbHRoIiwidXNlclR5cGUiOiJkb2N0b3IiLCJpYXQiOjE3NjU4NDQwOTIsImV4cCI6MTc2NjQ0ODg5Mn0.aig97qRZ9gq6n4PSoNwh9s-_ra_cw78y8ySsrkFkj_s"

# Hair Loss Treatments
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Oral Minoxidil",
    "categoryName": "Hair Loss",
    "strength": "2.5mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (2.5 mg) by mouth once daily. For female patients, start at 1.25 mg (½ tablet) daily.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "45.00",
    "membershipPrice": "35.00",
    "pricingNotes": "30 tablets per month",
    "prescription": "Hair Restoration Therapy Treatment:\nPatient educated on off-label use of low-dose oral minoxidil for androgenic alopecia. Discussed mechanism of action as a vasodilator that prolongs the anagen phase of hair growth. Patient to monitor for lightheadedness, fluid retention, tachycardia, or unwanted body hair.\nOral Minoxidil 2.5 mg tablet: Take 1 tablet (2.5 mg) by mouth once daily. Dispense 30 tablets with 3 refills. For female patients, start at 1.25 mg (½ tablet) daily. May titrate up or down per tolerance and response.\nFollow-Up:\nTelemedicine or in-office visit in 3 months, with periodic blood pressure and heart rate monitoring. If blood pressure <90/60 mmHg, patient experiences palpitations, swelling of the lower extremities, or dizziness, discontinue use and contact OptimaleMD provider.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Oral Minoxidil",
    "categoryName": "Hair Loss",
    "strength": "5mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (5 mg) by mouth once daily. Higher strength for advanced cases.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "55.00",
    "membershipPrice": "42.00",
    "pricingNotes": "30 tablets per month - Higher strength",
    "prescription": "Hair Restoration Therapy Treatment - Higher Strength:\nOral Minoxidil 5 mg tablet: Take 1 tablet (5 mg) by mouth once daily. Dispense 30 tablets with 3 refills. Higher strength for patients who have tolerated 2.5mg and need increased dosage.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Finasteride pill",
    "categoryName": "Hair Loss",
    "strength": "1mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (1 mg) by mouth once daily.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "40.00",
    "membershipPrice": "30.00",
    "pricingNotes": "30 tablets per month",
    "prescription": "Hair Loss Treatment:\nDiscussed mechanism of finasteride as a 5-alpha-reductase inhibitor reducing scalp DHT levels.\nFinasteride 1 mg tablet: Take 1 tablet (1 mg) by mouth once daily. Dispense 30 tablets with 3 refills.",
    "isActive": true
  }'

# Finasteride variations - Different strengths
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Finasteride pill",
    "categoryName": "Hair Loss",
    "strength": "50mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (50 mg) by mouth once daily.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "55.00",
    "membershipPrice": "42.00",
    "pricingNotes": "30 tablets per month - Higher strength (50mg)",
    "prescription": "Hair Loss Treatment - Higher Strength:\nFinasteride 50 mg tablet: Take 1 tablet (50 mg) by mouth once daily. Higher strength for patients requiring increased DHT inhibition. Dispense 30 tablets with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Finasteride pill",
    "categoryName": "Hair Loss",
    "strength": "60mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (60 mg) by mouth once daily.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "60.00",
    "membershipPrice": "45.00",
    "pricingNotes": "30 tablets per month - Highest strength (60mg)",
    "prescription": "Hair Loss Treatment - Highest Strength:\nFinasteride 60 mg tablet: Take 1 tablet (60 mg) by mouth once daily. Maximum strength for severe cases. Dispense 30 tablets with 3 refills.",
    "isActive": true
  }'

# Finasteride variations - Different frequencies
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Finasteride pill",
    "categoryName": "Hair Loss",
    "strength": "1mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once weekly",
    "directions": "Take 1 tablet (1 mg) by mouth once weekly.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "35.00",
    "membershipPrice": "28.00",
    "pricingNotes": "4 tablets per month - Weekly dosing",
    "prescription": "Hair Loss Treatment - Weekly Dosing:\nFinasteride 1 mg tablet: Take 1 tablet (1 mg) by mouth once weekly. Reduced frequency for patients who prefer less frequent dosing. Dispense 4 tablets with 3 refills.",
    "isActive": true
  }'

# Finasteride variations - Different doses (2 tablets)
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Finasteride pill",
    "categoryName": "Hair Loss",
    "strength": "1mg",
    "dose": "2 tablets",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 2 tablets (2 mg total) by mouth once daily.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "50.00",
    "membershipPrice": "38.00",
    "pricingNotes": "60 tablets per month - Double dose",
    "prescription": "Hair Loss Treatment - Double Dose:\nFinasteride 1 mg tablet: Take 2 tablets (2 mg total) by mouth once daily. Double dose for patients requiring higher DHT inhibition. Dispense 60 tablets with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Finasteride pill",
    "categoryName": "Hair Loss",
    "strength": "50mg",
    "dose": "2 tablets",
    "route": "Oral",
    "frequency": "Once weekly",
    "directions": "Take 2 tablets (100 mg total) by mouth once weekly.",
    "therapyCategory": "Hair Loss Treatments",
    "standardPrice": "70.00",
    "membershipPrice": "55.00",
    "pricingNotes": "8 tablets per month - Higher strength, weekly, double dose",
    "prescription": "Hair Loss Treatment - High Strength Weekly:\nFinasteride 50 mg tablet: Take 2 tablets (100 mg total) by mouth once weekly. High strength with weekly dosing for convenience. Dispense 8 tablets with 3 refills.",
    "isActive": true
  }'

# Hormone Optimization / TRT
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "200mg/ml",
    "dose": "0.3ml (60mg)",
    "route": "Subcutaneous Injection",
    "frequency": "Twice weekly",
    "directions": "Inject 0.3mL (60mg) by subcutaneous route twice weekly on same days each week. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "125.00",
    "membershipPrice": "99.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies",
    "prescription": "Men'\''s Hormone Replacement Therapy\nHormone Replacement Therapy Treatment:\nPatient to monitor and record weekly blood pressure and heart rate for review at follow up. If blood pressure is consistently >150/90 or there are any notable side effects or concerns such as lumps/tenderness in the testicles, severe acne, oily skin, difficulty urinating, thinning hair, worsening fatigue, breast enlargement or tenderness, increased moodiness, etc., patient is to discontinue use of testosterone therapy and follow up with his HONE-affiliated physician for further evaluation and treatment.\nTestosterone Cypionate (200mg/mL): Inject 0.3mL (60mg) by subcutaneous route twice weekly on same days each week - dispense one month supply with 3 refills and include injection supplies.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "200mg/ml",
    "dose": "0.5ml (100mg)",
    "route": "Intramuscular Injection",
    "frequency": "Twice weekly",
    "directions": "Inject 0.5mL (100mg) by intramuscular route twice weekly on same days each week. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "135.00",
    "membershipPrice": "105.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies - Higher dose",
    "prescription": "Men'\''s Hormone Replacement Therapy - Higher Dose\nTestosterone Cypionate (200mg/mL): Inject 0.5mL (100mg) by intramuscular route twice weekly on same days each week - dispense one month supply with 3 refills and include injection supplies. Higher dose for patients requiring increased testosterone levels.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "200mg/ml",
    "dose": "0.25ml (50mg)",
    "route": "Subcutaneous Injection",
    "frequency": "Every other day",
    "directions": "Inject 0.25mL (50mg) by subcutaneous route every other day. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "140.00",
    "membershipPrice": "110.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies - More frequent dosing",
    "prescription": "Men'\''s Hormone Replacement Therapy - Frequent Dosing\nTestosterone Cypionate (200mg/mL): Inject 0.25mL (50mg) by subcutaneous route every other day - dispense one month supply with 3 refills and include injection supplies. More frequent dosing for stable levels.",
    "isActive": true
  }'

# Testosterone Injections variations - Different strengths
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "250mg/ml",
    "dose": "0.3ml (75mg)",
    "route": "Intramuscular Injection",
    "frequency": "Twice weekly",
    "directions": "Inject 0.3mL (75mg) by intramuscular route twice weekly on same days each week. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "130.00",
    "membershipPrice": "102.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies - Higher concentration (250mg/ml)",
    "prescription": "Men'\''s Hormone Replacement Therapy - Higher Concentration\nTestosterone Cypionate (250mg/mL): Inject 0.3mL (75mg) by intramuscular route twice weekly on same days each week - dispense one month supply with 3 refills and include injection supplies. Higher concentration formulation.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "100mg/ml",
    "dose": "0.6ml (60mg)",
    "route": "Subcutaneous Injection",
    "frequency": "Twice weekly",
    "directions": "Inject 0.6mL (60mg) by subcutaneous route twice weekly on same days each week. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "120.00",
    "membershipPrice": "95.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies - Lower concentration (100mg/ml)",
    "prescription": "Men'\''s Hormone Replacement Therapy - Lower Concentration\nTestosterone Cypionate (100mg/mL): Inject 0.6mL (60mg) by subcutaneous route twice weekly on same days each week - dispense one month supply with 3 refills and include injection supplies. Lower concentration for patients preferring larger injection volume.",
    "isActive": true
  }'

# Testosterone Injections variations - Different frequencies
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "200mg/ml",
    "dose": "0.4ml (80mg)",
    "route": "Intramuscular Injection",
    "frequency": "Once weekly",
    "directions": "Inject 0.4mL (80mg) by intramuscular route once weekly. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "125.00",
    "membershipPrice": "99.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies - Weekly dosing",
    "prescription": "Men'\''s Hormone Replacement Therapy - Weekly Dosing\nTestosterone Cypionate (200mg/mL): Inject 0.4mL (80mg) by intramuscular route once weekly - dispense one month supply with 3 refills and include injection supplies. Weekly dosing for convenience.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Injections",
    "categoryName": "Hormone Therapy",
    "strength": "200mg/ml",
    "dose": "0.2ml (40mg)",
    "route": "Subcutaneous Injection",
    "frequency": "Daily",
    "directions": "Inject 0.2mL (40mg) by subcutaneous route daily. Rotate injection sites.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "150.00",
    "membershipPrice": "120.00",
    "pricingNotes": "One month supply with 3 refills, includes injection supplies - Daily micro-dosing",
    "prescription": "Men'\''s Hormone Replacement Therapy - Daily Micro-Dosing\nTestosterone Cypionate (200mg/mL): Inject 0.2mL (40mg) by subcutaneous route daily - dispense one month supply with 3 refills and include injection supplies. Daily micro-dosing for most stable levels.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Testosterone Cream",
    "categoryName": "Hormone Therapy",
    "strength": "112mg/ml",
    "dose": "1ml",
    "route": "Topical",
    "frequency": "Once daily",
    "directions": "Apply 1mL (112mg) topically daily as directed. Application Instructions: apply directly to testicles, inner thighs or over the shoulders and cover with clothing; wash hands thoroughly after application or wear gloves.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "120.00",
    "membershipPrice": "95.00",
    "pricingNotes": "One month supply with 3 refills",
    "prescription": "Men'\''s Hormone Replacement Therapy\nTestosterone Cream: Apply 1mL (112mg) topically daily as directed by your physician - dispense one month supply with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Enclomiphene",
    "categoryName": "Hormone Therapy",
    "strength": "12.5mg",
    "dose": "1 capsule",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 capsule (12.5 mg) by mouth once daily. May increase to 25 mg daily based on lab and symptom response.",
    "therapyCategory": "Hormone Optimization / TRT",
    "standardPrice": "90.00",
    "membershipPrice": "70.00",
    "pricingNotes": "30 capsules per month",
    "prescription": "Hormone Restoration Therapy Treatment:\nPatient educated that enclomiphene stimulates endogenous testosterone via hypothalamic-pituitary axis activation.\nEnclomiphene 12.5 mg capsule: Take 1 capsule (12.5 mg) by mouth once daily. May increase to 25 mg daily based on lab and symptom response. Dispense 30 capsules with 3 refills.",
    "isActive": true
  }'

# Weight Loss & Obesity Medicine
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Semaglutide (injectable)",
    "categoryName": "Weight Loss",
    "strength": "2.4mg/ml",
    "dose": "0.25mg",
    "route": "Subcutaneous Injection",
    "frequency": "Once weekly",
    "directions": "Inject 0.25 mg SQ weekly x 4 weeks, then increase per protocol to 0.5 mg, 1 mg, 1.7 mg, and up to 2.4 mg weekly as tolerated.",
    "therapyCategory": "Weight Loss & Obesity Medicine",
    "standardPrice": "350.00",
    "membershipPrice": "280.00",
    "pricingNotes": "1 vial with 2 refills - Starting dose",
    "prescription": "Metabolic and Weight Management Treatment:\nPatient instructed on GLP-1 mechanism, titration schedule, and injection technique.\nSemaglutide 2.4 mg/mL vial: Inject 0.25 mg SQ weekly x 4 weeks, then increase per protocol to 0.5 mg, 1 mg, 1.7 mg, and up to 2.4 mg weekly as tolerated. Dispense 1 vial with 2 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Semaglutide (injectable)",
    "categoryName": "Weight Loss",
    "strength": "2.4mg/ml",
    "dose": "2.4mg",
    "route": "Subcutaneous Injection",
    "frequency": "Once weekly",
    "directions": "Inject 2.4 mg SQ weekly. Maintenance dose after titration period.",
    "therapyCategory": "Weight Loss & Obesity Medicine",
    "standardPrice": "380.00",
    "membershipPrice": "300.00",
    "pricingNotes": "1 vial with 2 refills - Maintenance dose",
    "prescription": "Metabolic and Weight Management Treatment - Maintenance Dose:\nSemaglutide 2.4 mg/mL vial: Inject 2.4 mg SQ weekly. Maintenance dose after successful titration. Dispense 1 vial with 2 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tirzepatide (injectable)",
    "categoryName": "Weight Loss",
    "strength": "5mg",
    "dose": "5mg",
    "route": "Subcutaneous Injection",
    "frequency": "Once weekly",
    "directions": "Inject 5mg once weekly. Maintenance dose.",
    "therapyCategory": "Weight Loss & Obesity Medicine",
    "standardPrice": "400.00",
    "membershipPrice": "320.00",
    "pricingNotes": "28 days supply with three refills",
    "prescription": "Weight Loss Therapy-Tirzepatide:\nWeight Loss Patient Instructions and Education:\nTirzepatide: *Maintenance* Inject 5mg once weekly – Dispense a 28 days supply with three refills.",
    "isActive": true
  }'

# Sexual Health
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tadalafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "5mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (5mg) daily, may increase to 4 total on day of intimacy.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "85.00",
    "membershipPrice": "65.00",
    "pricingNotes": "54 tablets per month with 3 refills",
    "prescription": "Tadalafil combination therapy:\nSexual Health\nTadalafil (generic Cialis®): Take 1 tablet (5mg) daily, may increase to 4 total on day of intimacy. - dispense one month supply (qty #54) with 3 refills.",
    "isActive": true
  }'

# Tadalafil variations - Different strengths
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tadalafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "10mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 tablet (10mg) daily, may increase to 2 total on day of intimacy.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "90.00",
    "membershipPrice": "70.00",
    "pricingNotes": "30 tablets per month with 3 refills - Medium strength daily",
    "prescription": "Tadalafil daily therapy - Medium Strength:\nTadalafil (generic Cialis®): Take 1 tablet (10mg) daily, may increase to 2 total on day of intimacy. Dispense 30 tablets with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tadalafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "20mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "As needed",
    "directions": "Take 1 tablet (20mg) 30-60 minutes before intimacy, as needed. Maximum once daily.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "75.00",
    "membershipPrice": "58.00",
    "pricingNotes": "8 tablets per month with 3 refills - As needed dosing",
    "prescription": "Tadalafil as needed therapy:\nTadalafil (generic Cialis®): Take 1 tablet (20mg) 30-60 minutes before intimacy, as needed. Maximum once daily. Dispense 8 tablets with 3 refills.",
    "isActive": true
  }'

# Tadalafil variations - Different doses (2 tablets)
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tadalafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "5mg",
    "dose": "2 tablets",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 2 tablets (10mg total) daily.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "95.00",
    "membershipPrice": "75.00",
    "pricingNotes": "60 tablets per month with 3 refills - Double dose daily",
    "prescription": "Tadalafil daily therapy - Double Dose:\nTadalafil (generic Cialis®): Take 2 tablets (10mg total) daily. Double dose for patients requiring higher daily levels. Dispense 60 tablets with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tadalafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "20mg",
    "dose": "2 tablets",
    "route": "Oral",
    "frequency": "As needed",
    "directions": "Take 2 tablets (40mg total) 30-60 minutes before intimacy, as needed. Maximum once daily.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "95.00",
    "membershipPrice": "75.00",
    "pricingNotes": "16 tablets per month with 3 refills - Maximum dose as needed",
    "prescription": "Tadalafil as needed therapy - Maximum Dose:\nTadalafil (generic Cialis®): Take 2 tablets (40mg total) 30-60 minutes before intimacy, as needed. Maximum dose for patients requiring higher potency. Maximum once daily. Dispense 16 tablets with 3 refills.",
    "isActive": true
  }'

# Tadalafil variations - Different frequencies
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Tadalafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "5mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "Every other day",
    "directions": "Take 1 tablet (5mg) every other day.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "80.00",
    "membershipPrice": "62.00",
    "pricingNotes": "15 tablets per month with 3 refills - Every other day dosing",
    "prescription": "Tadalafil therapy - Every Other Day:\nTadalafil (generic Cialis®): Take 1 tablet (5mg) every other day. Alternative dosing schedule for patients who prefer less frequent daily dosing. Dispense 15 tablets with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Sildenafil (oral tablets)",
    "categoryName": "Sexual Health",
    "strength": "50mg",
    "dose": "1 tablet",
    "route": "Oral",
    "frequency": "As needed",
    "directions": "Take 1 tab (50mg) 60 min prior to intimacy on an empty stomach.",
    "therapyCategory": "Sexual Health",
    "standardPrice": "70.00",
    "membershipPrice": "55.00",
    "pricingNotes": "8 tablets per month with 3 refills",
    "prescription": "Sildenafil Therapy:\nSexual Health\nSildenafil (generic Viagra®): Take 1 tab (50mg) 60 min prior to intimacy on an empty stomach - dispense one month supply with 3 refills.",
    "isActive": true
  }'

# Peptides & Longevity
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "CJC/Ipamorelin (injectable)",
    "categoryName": "Peptides",
    "strength": "5mg/5mg",
    "dose": "300mcg/300mcg",
    "route": "Subcutaneous Injection",
    "frequency": "Nightly",
    "directions": "Reconstitute with 3 mL bacteriostatic water. Inject 300 mcg/300 mcg SQ nightly (or 5 nights per week) 60–90 minutes after last meal.",
    "therapyCategory": "Peptides & Longevity",
    "standardPrice": "180.00",
    "membershipPrice": "145.00",
    "pricingNotes": "1 vial with 2 refills",
    "prescription": "Peptide Optimization Therapy Treatment:\nPatient instructed on mechanism as a synergistic growth hormone secretagogue combination for recovery, body composition, and sleep quality.\nCJC-1295/Ipamorelin 5 mg/5 mg vial: Reconstitute with 3 mL bacteriostatic water. Inject 300 mcg/300 mcg SQ nightly (or 5 nights per week) 60–90 minutes after last meal. Dispense 1 vial with 2 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "CJC/Ipamorelin (injectable)",
    "categoryName": "Peptides",
    "strength": "5mg/5mg",
    "dose": "200mcg/200mcg",
    "route": "Subcutaneous Injection",
    "frequency": "5 nights per week",
    "directions": "Reconstitute with 3 mL bacteriostatic water. Inject 200 mcg/200 mcg SQ 5 nights per week 60–90 minutes after last meal.",
    "therapyCategory": "Peptides & Longevity",
    "standardPrice": "170.00",
    "membershipPrice": "135.00",
    "pricingNotes": "1 vial with 2 refills - Lower dose, 5 nights/week",
    "prescription": "Peptide Optimization Therapy Treatment - Lower Dose:\nCJC-1295/Ipamorelin 5 mg/5 mg vial: Reconstitute with 3 mL bacteriostatic water. Inject 200 mcg/200 mcg SQ 5 nights per week 60–90 minutes after last meal. Lower dose for patients starting therapy. Dispense 1 vial with 2 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Sermorelin (injectable)",
    "categoryName": "Peptides",
    "strength": "200mcg",
    "dose": "200mcg",
    "route": "Subcutaneous Injection",
    "frequency": "Once nightly",
    "directions": "Inject 200mcg once nightly.",
    "therapyCategory": "Peptides & Longevity",
    "standardPrice": "160.00",
    "membershipPrice": "130.00",
    "pricingNotes": "One month supply with 11 refills",
    "prescription": "Sermorelin therapy:\nWeight Loss Patient Instructions and Education:\nSermorelin: 200mcg once nightly - dispense one month supply with 11 refills.",
    "isActive": true
  }'

# Supplements
curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Prescription Grade Multivitamin",
    "categoryName": "Supplements",
    "strength": "Multi",
    "dose": "1 capsule",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 capsule by mouth once daily with food.",
    "therapyCategory": "Supplements",
    "standardPrice": "45.00",
    "membershipPrice": "35.00",
    "pricingNotes": "30 capsules per month",
    "prescription": "Prescription Grade Multivitamin: Take 1 capsule by mouth once daily with food. Dispense 30 capsules with 3 refills.",
    "isActive": true
  }'

curl -X POST "${BASE_URL}/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Vitamin D3",
    "categoryName": "Supplements",
    "strength": "5000 IU",
    "dose": "1 capsule",
    "route": "Oral",
    "frequency": "Once daily",
    "directions": "Take 1 capsule (5000 IU) by mouth once daily with food.",
    "therapyCategory": "Supplements",
    "standardPrice": "25.00",
    "membershipPrice": "20.00",
    "pricingNotes": "30 capsules per month",
    "prescription": "Vitamin D3 Supplement: Take 1 capsule (5000 IU) by mouth once daily with food. Dispense 30 capsules with 3 refills.",
    "isActive": true
  }'

echo "Sample medications added successfully!"

