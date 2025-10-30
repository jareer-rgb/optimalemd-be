/**
 * Test timezone conversion utilities
 * Run with: node test-timezone-conversion.js
 */

// Simple implementation for testing
function localTimeToUTC(timeString, sourceTimezone) {
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a date in UTC
  const date = new Date(Date.UTC(2024, 6, 15, hours, minutes, 0));
  
  // Get the same time in the source timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: sourceTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Format the UTC date in the target timezone
  const formatted = formatter.format(date);
  console.log(`  UTC ${hours}:${minutes} appears as ${formatted} in ${sourceTimezone}`);
  
  // Now we need to find what UTC time gives us the desired local time
  // We'll do this by trying different UTC offsets
  const targetLocalHours = hours;
  const targetLocalMinutes = minutes;
  
  // Try each hour
  for (let utcHour = 0; utcHour < 24; utcHour++) {
    const testDate = new Date(Date.UTC(2024, 6, 15, utcHour, minutes, 0));
    const testFormatted = formatter.format(testDate);
    const [datePart, timePart] = testFormatted.split(', ');
    const [localHour, localMinute] = timePart.split(':').map(Number);
    
    if (localHour === targetLocalHours && localMinute === targetLocalMinutes) {
      return `${String(utcHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
  
  return timeString;
}

function utcToLocalTime(timeString, targetTimezone) {
  const [hours, minutes] = timeString.split(':').map(Number);
  
  const utcDate = new Date(Date.UTC(2024, 6, 15, hours, minutes, 0));
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  return formatter.format(utcDate);
}

// Test cases
console.log('=== Testing Timezone Conversions ===\n');

console.log('Test 1: Pakistan (UTC+5) 9:00 AM → UTC');
const pakistanToUTC = localTimeToUTC('09:00', 'Asia/Karachi');
console.log(`Result: ${pakistanToUTC}`);
console.log(`Expected: 04:00 (9:00 - 5 hours)\n`);

console.log('Test 2: Turkey (UTC+3) 9:00 AM → UTC');
const turkeyToUTC = localTimeToUTC('09:00', 'Europe/Istanbul');
console.log(`Result: ${turkeyToUTC}`);
console.log(`Expected: 06:00 (9:00 - 3 hours)\n`);

console.log('Test 3: UTC 04:00 → Pakistan');
const utcToPakistan = utcToLocalTime('04:00', 'Asia/Karachi');
console.log(`Result: ${utcToPakistan}`);
console.log(`Expected: 09:00 (4:00 + 5 hours)\n`);

console.log('Test 4: UTC 04:00 → Turkey');
const utcToTurkey = utcToLocalTime('04:00', 'Europe/Istanbul');
console.log(`Result: ${utcToTurkey}`);
console.log(`Expected: 07:00 (4:00 + 3 hours)\n`);

console.log('=== Full Flow Test ===');
console.log('Doctor in Pakistan sets: 9:00 AM - 5:00 PM');
const start_utc = localTimeToUTC('09:00', 'Asia/Karachi');
const end_utc = localTimeToUTC('17:00', 'Asia/Karachi');
console.log(`Stored in DB (UTC): ${start_utc} - ${end_utc}`);

console.log('\nPatient in Turkey sees:');
const start_turkey = utcToLocalTime(start_utc, 'Europe/Istanbul');
const end_turkey = utcToLocalTime(end_utc, 'Europe/Istanbul');
console.log(`${start_turkey} - ${end_turkey}`);
console.log(`Expected: 07:00 - 15:00 (2 hours behind Pakistan)`);

