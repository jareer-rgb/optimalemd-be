/**
 * Timezone conversion utilities for OptimaleMD
 * 
 * IMPORTANT: ALL TIMES IN DATABASE ARE STORED IN UTC
 * 
 * Example Flow:
 * 1. Doctor in Pakistan (UTC+5) sets 9:00 AM - 5:00 PM availability
 * 2. Frontend sends: { startTime: "09:00", endTime: "17:00", timezone: "Asia/Karachi" }
 * 3. Backend converts: 09:00 PKT → 04:00 UTC, 17:00 PKT → 12:00 UTC
 * 4. Stores in DB: startTime = "04:00", endTime = "12:00" (both UTC)
 * 5. Patient in Turkey requests schedule
 * 6. Backend converts: 04:00 UTC → 07:00 Turkey time
 * 7. Patient sees: 7:00 AM - 3:00 PM availability
 */

/**
 * Convert local time to UTC
 * 
 * @param timeString - Time in HH:MM format (e.g., "09:00") in local timezone
 * @param sourceTimezone - IANA timezone (e.g., "Asia/Karachi", "Europe/Istanbul")
 * @returns Time in HH:MM format in UTC
 * 
 * @example
 * localTimeToUTC("09:00", "Asia/Karachi") // Returns "04:00" (Pakistan is UTC+5)
 * localTimeToUTC("09:00", "Europe/Istanbul") // Returns "06:00" (Turkey is UTC+3)
 */
export function localTimeToUTC(timeString: string, sourceTimezone: string): string {
  if (!timeString || !sourceTimezone) {
    throw new Error('Time string and timezone are required');
  }

  // Validate time format
  if (!/^\d{1,2}:\d{2}$/.test(timeString)) {
    throw new Error('Invalid time format. Expected HH:MM');
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time values');
  }

  // Use a fixed reference date (middle of year to avoid DST complications)
  const year = 2024;
  const month = 6; // July (0-indexed, so 6 = July)
  const day = 15;

  // Create a date string representing the local time
  // We need to create a date that represents "08:00 in Istanbul" and find its UTC equivalent
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  // Parse this string as if it's in the source timezone
  // We'll use toLocaleString to get the date representation in different timezones
  
  // Step 1: Create a date object (will be interpreted in local system time)
  const tempDate = new Date(dateString);
  
  // Step 2: Get what this time is in UTC
  const utcString = tempDate.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Step 3: Get what this same moment is in the source timezone
  const sourceString = tempDate.toLocaleString('en-US', {
    timeZone: sourceTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Step 4: Calculate the offset
  const parseTime = (str: string) => {
    const [datePart, timePart] = str.split(', ');
    const [m, d, y] = datePart.split('/').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    return { year: y, month: m - 1, day: d, hours: h, minutes: min };
  };
  
  const utcParsed = parseTime(utcString);
  const sourceParsed = parseTime(sourceString);
  
  const utcMs = Date.UTC(utcParsed.year, utcParsed.month, utcParsed.day, utcParsed.hours, utcParsed.minutes);
  const sourceMs = Date.UTC(sourceParsed.year, sourceParsed.month, sourceParsed.day, sourceParsed.hours, sourceParsed.minutes);
  
  const offsetMs = sourceMs - utcMs;
  
  // Step 5: Apply reverse offset to get UTC time from local time
  // If we want "08:00 Istanbul", we need to subtract the offset
  const targetUtcMs = Date.UTC(year, month, day, hours, minutes) - offsetMs;
  const targetUtcDate = new Date(targetUtcMs);
  
  const utcHours = String(targetUtcDate.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(targetUtcDate.getUTCMinutes()).padStart(2, '0');

  return `${utcHours}:${utcMinutes}`;
}

/**
 * Convert UTC time to local time
 * 
 * @param timeString - Time in HH:MM format (e.g., "04:00") in UTC
 * @param targetTimezone - IANA timezone (e.g., "Europe/Istanbul")
 * @returns Time in HH:MM format in local timezone
 * 
 * @example
 * utcToLocalTime("04:00", "Asia/Karachi") // Returns "09:00" (Pakistan is UTC+5)
 * utcToLocalTime("04:00", "Europe/Istanbul") // Returns "07:00" (Turkey is UTC+3)
 */
export function utcToLocalTime(timeString: string, targetTimezone: string): string {
  if (!timeString || !targetTimezone) {
    throw new Error('Time string and timezone are required');
  }

  // Validate time format
  if (!/^\d{1,2}:\d{2}$/.test(timeString)) {
    throw new Error('Invalid time format. Expected HH:MM');
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time values');
  }

  // Create UTC date
  const year = 2024;
  const month = 6; // July
  const day = 15;
  
  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, 0));

  // Format in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const localTime = formatter.format(utcDate);
  
  // The formatter returns time in HH:MM format
  return localTime;
}

/**
 * Validate IANA timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone) return false;
  
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get timezone abbreviation (e.g., "PKT", "TRT", "EST")
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart ? tzPart.value : timezone;
  } catch (e) {
    return timezone;
  }
}

/**
 * Get timezone offset in hours from UTC
 * @returns Offset in hours (e.g., +5 for Pakistan, +3 for Turkey)
 */
export function getTimezoneOffsetHours(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Format timezone offset for display
 * @returns String like "+05:00" or "-05:00"
 */
export function formatTimezoneOffset(timezone: string): string {
  const offsetHours = getTimezoneOffsetHours(timezone);
  const sign = offsetHours >= 0 ? '+' : '-';
  const absHours = Math.abs(Math.floor(offsetHours));
  const minutes = Math.abs(Math.round((offsetHours % 1) * 60));
  return `${sign}${String(absHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
