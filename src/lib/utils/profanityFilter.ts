/**
 * Profanity Filter Utility
 *
 * Prevents profanity and inappropriate language across the application.
 * Used for validating all user-generated text content.
 */

import { Filter } from 'bad-words';

// Initialize the profanity filter
const filter = new Filter();

// Add additional healthcare-specific inappropriate terms if needed
const additionalWords: string[] = [
  // Add any domain-specific words to block
];

if (additionalWords.length > 0) {
  filter.addWords(...additionalWords);
}

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return filter.isProfane(text);
}

/**
 * Clean profanity from text (replace with asterisks)
 */
export function cleanProfanity(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return filter.clean(text);
}

/**
 * Validate text for profanity and return error if found
 */
export function validateNoProfanity(text: string, fieldName: string = 'Text'): {
  isValid: boolean;
  error?: string;
} {
  if (!text || typeof text !== 'string') {
    return { isValid: true };
  }

  if (containsProfanity(text)) {
    return {
      isValid: false,
      error: `${fieldName} contains inappropriate language. Please use professional and respectful language.`
    };
  }

  return { isValid: true };
}

/**
 * Validate an object's text fields for profanity
 */
export function validateObjectNoProfanity(
  obj: Record<string, any>,
  fieldsToCheck: string[]
): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (const field of fieldsToCheck) {
    const value = obj[field];

    if (value && typeof value === 'string') {
      const result = validateNoProfanity(value, field);
      if (!result.isValid && result.error) {
        errors[field] = result.error;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Get list of profane words found in text (for logging/reporting)
 */
export function getProfaneWords(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const words = text.toLowerCase().split(/\s+/);
  const profaneWords: string[] = [];

  for (const word of words) {
    if (filter.isProfane(word)) {
      profaneWords.push(word);
    }
  }

  return profaneWords;
}

const profanityFilter = {
  containsProfanity,
  cleanProfanity,
  validateNoProfanity,
  validateObjectNoProfanity,
  getProfaneWords
};

export default profanityFilter;
