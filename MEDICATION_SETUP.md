# Medication Setup Guide

## Overview
The medication system has been updated to load medications from the backend instead of hardcoded frontend data. Medications are now stored in the database with full details including strength, dose, route, frequency, directions, therapy category, pricing, and prescription information.

## Backend Changes

### New Endpoints

1. **GET `/api/medications/by-category`** - Get all active medications grouped by therapy category
   - Returns medications organized by their `therapyCategory` field
   - Used by frontend to load medications dynamically

2. **GET `/api/medications?therapyCategory=<category>`** - Filter medications by category
   - Optional query parameter to filter by specific therapy category

### Database Schema

The `Medication` table now includes:
- `name` - Medication name (unique)
- `categoryName` - Category name for grouping
- `strength` - e.g., "200mg/ml", "5mg"
- `dose` - e.g., "0.5ml", "1 tablet"
- `route` - e.g., "Oral", "Injection", "Topical"
- `frequency` - e.g., "Once daily", "Twice weekly"
- `directions` - Detailed instructions
- `therapyCategory` - Matches frontend service categories
- `standardPrice` - Regular price
- `membershipPrice` - Discounted price for members
- `pricingNotes` - Additional pricing information
- `prescription` - Full prescription text
- `isActive` - Active status

## Frontend Changes

### NewMedicationModal Updates

- **Removed hardcoded data**: `SERVICE_TO_MEDICINES` and `MEDICATION_PRESCRIPTIONS` are no longer hardcoded
- **Backend loading**: Medications are now loaded from `/api/medications/by-category` endpoint
- **Prescription handling**: Prescriptions are loaded from medication records in the database
- **Fallback support**: Legacy prescription templates are still available as fallback

### Service Categories (Unchanged)

The following categories remain the same:
- "Hair Loss Treatments"
- "Hormone Optimization / TRT"
- "Weight Loss & Obesity Medicine"
- "Sexual Health"
- "Peptides & Longevity"
- "Lab Testing"
- "Supplements"

## Adding Sample Medications

### Using the Script

1. **Get your JWT token** from the application after logging in
2. **Update the script** with your token and base URL:
   ```bash
   BASE_URL="http://localhost:3000/api"  # or your production URL
   TOKEN="your_jwt_token_here"
   ```
3. **Run the script**:
   ```bash
   cd optimalemd-be
   ./add-sample-medications.sh
   ```

### Manual cURL Example

```bash
curl -X POST "http://localhost:3000/api/medications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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
    "prescription": "Full prescription text here...",
    "isActive": true
  }'
```

## Sample Medications Included

The script adds sample medications with different dosages and frequencies:

### Hair Loss Treatments
- Oral Minoxidil (2.5mg, once daily)
- Oral Minoxidil (5mg, once daily) - Higher strength
- Finasteride pill (1mg, once daily)

### Hormone Optimization / TRT
- Testosterone Injections (0.3ml, twice weekly) - SQ
- Testosterone Injections (0.5ml, twice weekly) - IM, higher dose
- Testosterone Injections (0.25ml, every other day) - More frequent
- Testosterone Cream (1ml, once daily)
- Enclomiphene (12.5mg, once daily)

### Weight Loss & Obesity Medicine
- Semaglutide (0.25mg, once weekly) - Starting dose
- Semaglutide (2.4mg, once weekly) - Maintenance dose
- Tirzepatide (5mg, once weekly)

### Sexual Health
- Tadalafil (5mg, once daily)
- Tadalafil (20mg, as needed)
- Sildenafil (50mg, as needed)

### Peptides & Longevity
- CJC/Ipamorelin (300mcg/300mcg, nightly)
- CJC/Ipamorelin (200mcg/200mcg, 5 nights/week) - Lower dose
- Sermorelin (200mcg, once nightly)

### Supplements
- Prescription Grade Multivitamin (once daily)
- Vitamin D3 (5000 IU, once daily)

## Notes

- **Same medication, different dosages**: The same medication name can have multiple entries with different strengths, doses, and frequencies
- **Prescription field**: Contains the full prescription text that will be displayed in the modal
- **Categories match frontend**: The `therapyCategory` field must exactly match the frontend service category names
- **Saving logic unchanged**: When medications are assigned to appointments, the saving logic remains the same - it still saves to the appointment's medications JSON field

## Migration

After updating the schema, run:
```bash
cd optimalemd-be
npx prisma migrate dev
```

This will create a migration for the new medication fields.

