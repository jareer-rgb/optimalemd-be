/**
 * Timezone utility functions for consistent date/time handling
 * All dates are stored in UTC in the database
 * Times are stored as strings in HH:MM format (local time to backend, treated as UTC)
 */

/**
 * Convert a date string to UTC Date object
 * Input: "2024-12-25" (from frontend, in user's local timezone)
 * Output: Date object set to UTC midnight of that date
 */
export function dateStringToUTC(dateString: string): Date {
  if (!dateString) {
    throw new Error('Date string is required');
  }
  
  // Parse the date string assuming it's in YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create a UTC date at midnight
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  return utcDate;
}

/**
 * Convert a date and time to UTC Date object
 * Input: date="2024-12-25", time="14:30" (from frontend, in user's local timezone)
 * Output: Date object in UTC
 */
export function dateTimeToUTC(dateString: string, timeString: string): Date {
  if (!dateString || !timeString) {
    throw new Error('Date and time strings are required');
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a UTC date with the specified time
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  return utcDate;
}

/**
 * Format a UTC date to local date string (YYYY-MM-DD)
 * Used when sending dates to frontend
 */
export function utcDateToLocalString(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Valid date is required');
  }
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get UTC date at midnight (start of day)
 */
export function getUTCMidnight(date: Date = new Date()): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Get UTC date at end of day (23:59:59.999)
 */
export function getUTCEndOfDay(date: Date = new Date()): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(23, 59, 59, 999);
  return utcDate;
}

/**
 * Check if a date is in the past (UTC comparison)
 */
export function isDateInPast(dateString: string): boolean {
  try {
    const date = dateStringToUTC(dateString);
    const now = getUTCMidnight(new Date());
    return date < now;
  } catch {
    return false;
  }
}

/**
 * Check if a date-time is in the past (UTC comparison)
 */
export function isDateTimeInPast(dateString: string, timeString: string): boolean {
  try {
    const dateTime = dateTimeToUTC(dateString, timeString);
    const now = new Date();
    return dateTime < now;
  } catch {
    return false;
  }
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate time range (start < end)
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }
  
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return start < end;
}

/**
 * Add days to a date (returns new Date in UTC)
 */
export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Get day of week for a UTC date (0 = Sunday, 6 = Saturday)
 */
export function getUTCDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) in UTC
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse a date that might be in various formats and return UTC Date
 */
export function parseToUTC(input: string | Date): Date {
  if (input instanceof Date) {
    return input;
  }
  
  // Check if it's an ISO string with time
  if (input.includes('T')) {
    return new Date(input);
  }
  
  // Otherwise treat as date string (YYYY-MM-DD)
  return dateStringToUTC(input);
}

/**
 * Get current UTC date without time
 */
export function getCurrentUTCDate(): Date {
  return getUTCMidnight(new Date());
}

/**
 * Compare two dates (date only, ignoring time) in UTC
 */
export function areDatesEqual(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

