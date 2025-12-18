import { NextResponse } from "next/server";

export function json<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

export function handleRouteError(error: unknown) {
  console.error("[Route Error]", error);
  
  // In production, include error details for debugging
  const errorMessage = error instanceof Error ? error.message : "Internal server error";
  const errorDetails = error instanceof Error ? error.stack : undefined;
  
  // Log full error details
  if (errorDetails) {
    console.error("[Error Stack]", errorDetails);
  }
  
  return json(
    { 
      error: "Internal server error",
      message: errorMessage,
      ...(process.env.NODE_ENV !== "production" && { stack: errorDetails })
    }, 
    { status: 500 }
  );
}

export function assertEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is missing. Please set it in your environment.`);
  }
  return value;
}

/**
 * Format a date string or Date object to a locale date string WITHOUT timezone conversion.
 * This is critical for date-only fields (like coverage dates) that should display
 * the same calendar date regardless of the user's timezone.
 * 
 * @param dateInput - ISO date string or Date object
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted date string in the specified locale
 */
export function formatDateOnly(dateInput: string | Date | null | undefined, locale = 'en-US'): string {
  if (!dateInput) return '—';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) return '—';
    
    // Extract date components in UTC to avoid timezone shifts
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    // Create a new date using UTC components as local date
    const localDate = new Date(year, month, day);
    
    return localDate.toLocaleDateString(locale);
  } catch {
    return '—';
  }
}


