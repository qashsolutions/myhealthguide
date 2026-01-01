/**
 * Shared Date Conversion Utilities
 *
 * Handles Firestore Timestamp conversion to JavaScript Date objects.
 * Works with both Client SDK (Timestamp with `seconds`) and Admin SDK (Timestamp with `_seconds`).
 *
 * @see CLAUDE.md section "Firestore Timestamp Conversion" for context on why this is critical.
 */

/**
 * Safely converts any Firestore timestamp-like value to a JavaScript Date.
 *
 * Handles:
 * - Firestore Client SDK Timestamp: { seconds: number, nanoseconds: number }
 * - Firestore Admin SDK Timestamp: { _seconds: number, _nanoseconds: number }
 * - Firestore Timestamp with toDate() method
 * - JavaScript Date objects
 * - ISO date strings
 * - Unix timestamps (numbers)
 * - null/undefined (returns current date or fallback)
 *
 * @param timestamp - The timestamp value to convert
 * @param fallback - Optional fallback date if conversion fails (defaults to new Date())
 * @returns A JavaScript Date object
 *
 * @example
 * // Firestore document data
 * const createdAt = toSafeDate(data.createdAt);
 *
 * @example
 * // With custom fallback
 * const date = toSafeDate(data.optionalDate, null);
 */
export function toSafeDate(timestamp: any, fallback: Date | null = new Date()): Date {
  // Handle null/undefined
  if (!timestamp) {
    return fallback ?? new Date();
  }

  // Handle Admin SDK Timestamp format: { _seconds, _nanoseconds }
  if (typeof timestamp === 'object' && '_seconds' in timestamp) {
    return new Date(timestamp._seconds * 1000);
  }

  // Handle Client SDK Timestamp format: { seconds, nanoseconds }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }

  // Handle native Date objects
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Handle Firestore Timestamp with toDate() method
  if (typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch {
      return fallback ?? new Date();
    }
  }

  // Handle string or number timestamps
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
    return fallback ?? new Date();
  }

  // Fallback for unknown formats
  return fallback ?? new Date();
}

/**
 * Converts a date to a Firestore-compatible format for writing.
 * Returns the date as-is (Firestore SDK handles Date objects natively).
 *
 * @param date - Date to convert
 * @returns The date, or current date if invalid
 */
export function toFirestoreDate(date: Date | null | undefined): Date {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

/**
 * Checks if a value looks like a Firestore Timestamp
 */
export function isFirestoreTimestamp(value: any): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (
    'seconds' in value ||
    '_seconds' in value ||
    typeof value.toDate === 'function'
  );
}
