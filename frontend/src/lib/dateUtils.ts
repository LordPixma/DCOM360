/**
 * Safely parse date strings and handle malformed timestamps
 */

export function safeParseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  
  try {
    // Try to create a Date object
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: "${dateString}"`);
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn(`Error parsing date string: "${dateString}"`, error);
    return null;
  }
}

export function safeToISOString(dateString: string | undefined | null): string {
  const date = safeParseDate(dateString);
  if (!date) {
    // Return a fallback ISO string for current time
    return new Date().toISOString();
  }
  
  try {
    return date.toISOString();
  } catch (error) {
    console.warn(`Error converting date to ISO string: "${dateString}"`, error);
    return new Date().toISOString();
  }
}

export function safeToLocaleDateString(dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  const date = safeParseDate(dateString);
  if (!date) {
    return 'Invalid Date';
  }
  
  try {
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn(`Error formatting date: "${dateString}"`, error);
    return 'Invalid Date';
  }
}

export function safeToLocaleTimeString(dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  const date = safeParseDate(dateString);
  if (!date) {
    return 'Invalid Time';
  }
  
  try {
    return date.toLocaleTimeString('en-GB', options);
  } catch (error) {
    console.warn(`Error formatting time: "${dateString}"`, error);
    return 'Invalid Time';
  }
}

/**
 * Clean up malformed timestamp strings
 * Fixes common issues like double colons, missing zeros, etc.
 */
export function cleanTimestamp(timestamp: string): string {
  if (!timestamp) return timestamp;
  
  try {
    // Fix double colons (e.g., "2025-09-27T9::00Z" -> "2025-09-27T09:00Z")
    let cleaned = timestamp.replace(/T(\d)::/g, 'T0$1:');
    
    // Fix single digit hours without padding (e.g., "T9:" -> "T09:")
    cleaned = cleaned.replace(/T(\d):/g, 'T0$1:');
    
    // Fix missing leading zeros in minutes (e.g., ":5:" -> ":05:")
    cleaned = cleaned.replace(/:(\d):/, ':0$1:');
    
    return cleaned;
  } catch (error) {
    console.warn(`Error cleaning timestamp: "${timestamp}"`, error);
    return timestamp;
  }
}