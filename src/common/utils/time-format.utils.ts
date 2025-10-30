/**
 * Time formatting utilities for emails and notifications
 */

/**
 * Format appointment time with timezone note
 * @param time - Time in HH:MM format (UTC)
 * @param date - Date string (YYYY-MM-DD)
 * @returns Formatted string with timezone information
 */
export function formatAppointmentTimeForEmail(time: string, date?: string): string {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  
  return `${displayHour}:${minutes} ${ampm} UTC`;
}

/**
 * Get timezone reminder text for emails
 */
export function getTimezoneReminderText(): string {
  return `Note: The time shown is in UTC. Please check your local time zone for the correct appointment time. Your calendar invitation will show the correct time in your timezone.`;
}

/**
 * Format date for display in emails
 */
export function formatDateForEmail(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  } catch (e) {
    return dateString;
  }
}


