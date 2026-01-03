/**
 * Firestore Helper Utilities
 *
 * Common utilities for working with Firestore data.
 */

export interface CleanForFirestoreOptions {
  /**
   * Whether to remove null values in addition to undefined.
   * @default false (null values are preserved)
   */
  removeNull?: boolean;
}

/**
 * Clean object for Firestore - removes undefined values (and optionally null).
 * Firestore throws errors if you try to save undefined values.
 *
 * @param obj - The object to clean
 * @param options - Optional configuration
 * @returns Cleaned object without undefined (and optionally null) values
 *
 * @example
 * ```typescript
 * // Basic usage - removes undefined, keeps null
 * cleanForFirestore({ name: 'Test', notes: undefined, value: null })
 * // Result: { name: 'Test', value: null }
 *
 * // Remove both undefined and null
 * cleanForFirestore({ name: 'Test', notes: undefined, value: null }, { removeNull: true })
 * // Result: { name: 'Test' }
 * ```
 */
export function cleanForFirestore<T extends Record<string, any>>(
  obj: T,
  options: CleanForFirestoreOptions = {}
): Partial<T> {
  const { removeNull = false } = options;
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values (Firestore doesn't accept undefined)
    if (value === undefined) {
      continue;
    }

    // Optionally skip null values
    if (removeNull && value === null) {
      continue;
    }

    // Recursively clean nested objects (but not arrays, dates, or null)
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      cleaned[key] = cleanForFirestore(value, options);
    }
    // Clean arrays - filter out undefined/null and clean nested objects
    else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter(item => {
          if (item === undefined) return false;
          if (removeNull && item === null) return false;
          return true;
        })
        .map(item =>
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? cleanForFirestore(item, options)
            : item
        );
    }
    // Keep other values as-is (primitives, null, Date, etc.)
    else {
      cleaned[key] = value;
    }
  }

  return cleaned as Partial<T>;
}
