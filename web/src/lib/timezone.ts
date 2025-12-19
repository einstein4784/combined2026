/**
 * Timezone utilities for UTC-4 (La Paz/Caracas timezone, no DST)
 * This ensures all timestamps are stored and displayed in the correct timezone.
 */

const TIMEZONE_OFFSET_MS = -4 * 60 * 60 * 1000; // UTC-4 in milliseconds

/**
 * Get the current date and time in UTC-4 timezone
 * This creates a Date object that represents the current time in UTC-4
 * The Date object will be stored in UTC by MongoDB, but represents UTC-4 time
 */
export function getCurrentTimeInUTC4(): Date {
  const now = new Date();
  // Get the current UTC time
  const utcTime = now.getTime();
  // Add 4 hours to represent UTC-4 time as UTC (so 2:34 PM UTC-4 becomes 6:34 PM UTC)
  // This way when displayed, we subtract 4 hours to show the correct UTC-4 time
  return new Date(utcTime - TIMEZONE_OFFSET_MS);
}

/**
 * Format a date in UTC-4 timezone with long format (e.g., "Friday, December 19, 2025 at 2:34 PM")
 * @param date - Date object or ISO string (stored in UTC, represents UTC-4 time)
 * @param options - Optional formatting options
 */
export function formatDateInUTC4(
  date: Date | string | null | undefined,
  options?: {
    includeTime?: boolean;
    includeSeconds?: boolean;
  }
): string {
  if (!date) return "—";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "—";

    // The date is stored in UTC but represents UTC-4 time
    // To display it correctly, we need to subtract 4 hours
    // Get UTC time in milliseconds
    const utcTime = dateObj.getTime();
    // Subtract 4 hours to get the UTC-4 representation
    const utc4Time = new Date(utcTime + TIMEZONE_OFFSET_MS);

    if (options?.includeTime) {
      // Format using the adjusted date
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      
      if (options.includeSeconds) {
        dateOptions.second = "2-digit";
      }

      return utc4Time.toLocaleString("en-US", dateOptions);
    } else {
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      return utc4Time.toLocaleDateString("en-US", dateOptions);
    }
  } catch {
    return "—";
  }
}

/**
 * Format a date and time in UTC-4 timezone (e.g., "Friday, December 19, 2025 at 2:34 PM")
 * This is the default format for receipts and documents
 */
export function formatDateTimeInUTC4(date: Date | string | null | undefined): string {
  return formatDateInUTC4(date, { includeTime: true, includeSeconds: false });
}

/**
 * Format a date only in UTC-4 timezone (e.g., "Friday, December 19, 2025")
 */
export function formatDateOnlyInUTC4(date: Date | string | null | undefined): string {
  return formatDateInUTC4(date, { includeTime: false });
}

/**
 * Convert a date string or Date object to UTC-4 Date object
 * Useful for storing dates in the database
 * The returned Date will be stored in UTC but represents UTC-4 time
 */
export function toUTC4Date(date: Date | string | null | undefined): Date {
  if (!date) return getCurrentTimeInUTC4();
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return getCurrentTimeInUTC4();
  
  // If the date is a date-only string (YYYY-MM-DD), parse it as UTC-4 midnight
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    // Create date at midnight UTC-4, which is 4:00 AM UTC
    const utc4Midnight = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
    return utc4Midnight;
  }
  
  // For other dates, assume they represent UTC-4 time and adjust accordingly
  // Add 4 hours so that when displayed (subtracted), it shows the correct time
  const utcTime = dateObj.getTime();
  return new Date(utcTime - TIMEZONE_OFFSET_MS);
}

/**
 * Get start of day in UTC-4 timezone
 */
export function startOfDayUTC4(date: Date | null): Date | null {
  if (!date) return null;
  const utc4Date = toUTC4Date(date);
  utc4Date.setHours(0, 0, 0, 0);
  return utc4Date;
}

/**
 * Get end of day in UTC-4 timezone
 */
export function endOfDayUTC4(date: Date | null): Date | null {
  if (!date) return null;
  const utc4Date = toUTC4Date(date);
  utc4Date.setHours(23, 59, 59, 999);
  return utc4Date;
}

