# Working Hours API Documentation

## Overview

The new Working Hours API provides a simplified way for doctors to manage their availability. Instead of manually creating schedules for each day, doctors can now set their working hours for each day of the week, and the system will automatically generate time slots with breaks.

## Key Features

- **Simple Setup**: Doctors set working hours once per day of the week
- **Automatic Slot Generation**: Creates 20-minute slots with 10-minute breaks automatically
- **Google Calendar Integration**: Syncs working hours to Google Calendar
- **Flexible Configuration**: Customizable slot and break durations
- **Bulk Operations**: Set working hours for multiple days at once

## API Endpoints

### 1. Create Working Hours for a Single Day

```http
POST /working-hours
Content-Type: application/json
Authorization: Bearer <token>

{
  "doctorId": "123e4567-e89b-12d3-a456-426614174000",
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "16:00",
  "slotDuration": 20,
  "breakDuration": 10,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Working hours created successfully",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "doctorId": "123e4567-e89b-12d3-a456-426614174000",
    "dayOfWeek": 1,
    "startTime": "08:00",
    "endTime": "16:00",
    "slotDuration": 20,
    "breakDuration": 10,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Create Working Hours for Multiple Days

```http
POST /working-hours/multiple
Content-Type: application/json
Authorization: Bearer <token>

{
  "doctorId": "123e4567-e89b-12d3-a456-426614174000",
  "workingHours": [
    {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "16:00",
      "slotDuration": 20,
      "breakDuration": 10,
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "startTime": "08:00",
      "endTime": "16:00",
      "slotDuration": 20,
      "breakDuration": 10,
      "isActive": true
    },
    {
      "dayOfWeek": 3,
      "startTime": "08:00",
      "endTime": "16:00",
      "slotDuration": 20,
      "breakDuration": 10,
      "isActive": true
    }
  ]
}
```

### 3. Generate Schedules from Working Hours

```http
POST /working-hours/generate-schedules
Content-Type: application/json
Authorization: Bearer <token>

{
  "doctorId": "123e4567-e89b-12d3-a456-426614174000",
  "startDate": "2024-12-25",
  "endDate": "2024-12-31",
  "regenerateExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 5 schedules successfully",
  "data": {
    "doctorId": "123e4567-e89b-12d3-a456-426614174000",
    "startDate": "2024-12-25",
    "endDate": "2024-12-31",
    "generatedSchedules": [...],
    "totalGenerated": 5,
    "calendarSync": {
      "success": true,
      "eventsCreated": 5,
      "errors": []
    }
  }
}
```

### 4. Get Working Hours

```http
GET /working-hours?doctorId=123e4567-e89b-12d3-a456-426614174000&isActive=true
Authorization: Bearer <token>
```

### 5. Update Working Hours

```http
PUT /working-hours/{id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDuration": 30,
  "breakDuration": 15
}
```

### 6. Delete Working Hours

```http
DELETE /working-hours/{id}
Authorization: Bearer <token>
```

## Slot Generation Logic

The system automatically generates time slots based on the working hours configuration:

1. **Slot Duration**: Each appointment slot (default: 20 minutes)
2. **Break Duration**: Break between slots (default: 10 minutes)
3. **Pattern**: Slot → Break → Slot → Break → ...

### Example:
- Working Hours: 08:00 - 16:00
- Slot Duration: 20 minutes
- Break Duration: 10 minutes

**Generated Slots:**
- 08:00 - 08:20 (20 min slot)
- 08:20 - 08:30 (10 min break)
- 08:30 - 08:50 (20 min slot)
- 08:50 - 09:00 (10 min break)
- 09:00 - 09:20 (20 min slot)
- ... and so on

## Google Calendar Integration

When schedules are generated from working hours, they are automatically synced to Google Calendar:

- **Event Title**: "{Doctor Name} - Working Hours"
- **Description**: Includes slot and break duration information
- **Color**: Green (indicating working hours)
- **Reminders**: 24 hours and 30 minutes before

## Day of Week Mapping

- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

## Validation Rules

- **Time Format**: Must be in HH:MM format (24-hour)
- **Time Range**: Start time must be before end time
- **Slot Duration**: 15-60 minutes
- **Break Duration**: 5-30 minutes
- **Day of Week**: 0-6 (Sunday-Saturday)
- **Unique Constraint**: Only one working hours record per doctor per day

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- **400 Bad Request**: Validation errors, invalid time formats
- **404 Not Found**: Doctor or working hours not found
- **409 Conflict**: Working hours already exist for the day
- **500 Internal Server Error**: Server errors

## Migration from Old System

The old schedule system is still available for backward compatibility. The new working hours system works alongside it:

1. **New Schedules**: Use working hours to generate schedules
2. **Existing Schedules**: Continue to work as before
3. **Mixed Approach**: Can use both systems simultaneously

## Best Practices

1. **Set Working Hours Once**: Configure working hours for the week, then generate schedules
2. **Use Bulk Operations**: Set multiple days at once for efficiency
3. **Regular Updates**: Update working hours when availability changes
4. **Google Calendar Sync**: Ensure Google Calendar credentials are configured
5. **Test First**: Use the test endpoints to verify Google Calendar integration

## Example Workflow

1. **Doctor Registration**: Doctor creates account
2. **Set Working Hours**: Configure availability for each day of the week
3. **Generate Schedules**: Create schedules for upcoming weeks/months
4. **Google Calendar Sync**: Working hours appear in Google Calendar
5. **Patient Booking**: Patients can book available slots
6. **Ongoing Management**: Update working hours as needed

This new system significantly simplifies the scheduling process while maintaining all the functionality of the previous system.
