# PDF Report Generation

## Overview

The PDF report generation feature allows doctors to generate comprehensive patient reports for each appointment. The reports include:

1. **Patient Medical Form** - Complete medical history, goals, lifestyle habits, symptoms, and assessments
2. **Medications Section** - All prescribed medications organized by medical service
3. **Internal Notes** - Doctor's private notes for the appointment

## Features

- Beautiful, professional PDF formatting
- Stored securely on the backend server
- Accessible only to the doctor who owns the appointment
- Download and view options
- Support for regenerating reports if needed

## Backend Implementation

### Database Schema

Added `reportPdfPath` field to the `Appointment` model:

```prisma
model Appointment {
  // ... other fields
  reportPdfPath     String?  // Path to generated PDF report for this appointment
}
```

### API Endpoints

#### Generate Report
```
POST /api/reports/generate/:appointmentId
```
Generates a new PDF report for the specified appointment. Requires JWT authentication and doctor authorization.

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Report generated successfully",
  "data": {
    "fileName": "report_<appointmentId>_<timestamp>.pdf"
  }
}
```

#### Download Report
```
GET /api/reports/download/:appointmentId
```
Downloads the generated PDF report. Requires JWT authentication and doctor authorization.

#### View Report
```
GET /api/reports/view/:appointmentId
```
Opens the PDF report in browser. Requires JWT authentication and doctor authorization.

### File Storage

Reports are stored in the `/reports` directory at the project root. The directory is automatically created if it doesn't exist. Generated files are excluded from version control via `.gitignore`.

## Frontend Implementation

### Patient History Page

The patient history page (`PatientHistory.tsx`) includes:

1. **Generate Report Button** - Appears in the page header when viewing a patient's appointment
2. **View/Download Buttons** - Appear after a report is generated
3. **Visits Tab** - Shows download buttons for each past appointment with a generated report

### Usage Flow

1. Doctor navigates to patient history from the patients list
2. Doctor clicks "Generate Report" button
3. Backend creates a comprehensive PDF with all appointment data
4. Report is saved to the server and path is stored in database
5. Doctor can then view or download the report
6. Reports appear in the visits list for easy access

## PDF Content Structure

### 1. Header
- Report title
- Generation timestamp

### 2. Patient Information
- Full name
- Date of birth
- Email
- Phone number

### 3. Appointment Details
- Date and time
- Service type
- Doctor name
- Status

### 4. Medical Form
- **Physical Measurements**: Height, weight, waist
- **Patient Goals**: All selected goals
- **Medical Background**: Chronic conditions, surgeries, current medications, allergies
- **Lifestyle & Habits**: Sleep, exercise, diet, substance use, stress level
- **Symptoms**: All reported symptoms
- **Assessment & Plan**: Diagnosis, treatment plan, investigations

### 5. Prescribed Medications
- Organized by medical service category
- All medications listed

### 6. Internal Notes
- Doctor's private notes for the appointment

### 7. Footer
- Page numbers

## Security

- Reports can only be generated and accessed by the doctor assigned to the appointment
- JWT authentication required for all endpoints
- File paths are not directly exposed to the frontend
- Reports are served through authenticated API endpoints

## Future Enhancements

Potential improvements:
- Email reports directly to patients
- Custom report templates
- Include lab results and uploaded files
- Digital signatures
- Watermarks for confidentiality
- Batch report generation
- Report scheduling and auto-generation

