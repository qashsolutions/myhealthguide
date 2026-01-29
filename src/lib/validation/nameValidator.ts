/**
 * Name validation for medications, supplements, and food entries
 * Prevents gibberish/accidental long inputs that cause expensive API processing
 */

import { getWordList } from './wordLists';

// Validation constraints
export const MAX_WORD_LENGTH = 15;
export const MAX_WORD_COUNT = 2;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching to find closest known word
 */
function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Detect key-hold gibberish (e.g., "aaaaaaa", "kkkkkkk")
 * Returns true if more than 60% of characters are the same
 */
function isRepeatedCharacters(text: string): boolean {
  if (text.length < 4) return false;

  const charCounts: Record<string, number> = {};
  for (const char of text.toLowerCase()) {
    if (char !== ' ') {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
  }

  const maxCount = Math.max(...Object.values(charCounts));
  const nonSpaceLength = text.replace(/\s/g, '').length;

  return maxCount / nonSpaceLength > 0.6;
}

/**
 * Detect keyboard mash patterns (e.g., "asdfgh", "qwerty")
 */
function isKeyboardMash(text: string): boolean {
  const keyboardPatterns = [
    'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    'poiuyt', 'lkjhgf', 'mnbvcx', // reverse patterns
  ];

  const lowerText = text.toLowerCase().replace(/\s/g, '');
  if (lowerText.length < 5) return false;

  return keyboardPatterns.some(pattern =>
    lowerText.includes(pattern) || pattern.includes(lowerText)
  );
}

/**
 * Find the best fuzzy match from the word list
 * Returns the closest match if distance is reasonable
 */
function findFuzzyMatch(
  word: string,
  category: 'medication' | 'supplement' | 'food'
): string | undefined {
  const wordList = getWordList(category);
  let bestMatch: string | undefined;
  let bestDistance = Infinity;

  // Max distance threshold based on word length
  // Shorter words need closer matches
  const maxDistance = Math.max(2, Math.floor(word.length * 0.4));

  for (const knownWord of wordList) {
    // Check each word in multi-word items (e.g., "Vitamin D3")
    const knownParts = knownWord.split(' ');

    for (const part of knownParts) {
      const distance = levenshteinDistance(word, part);

      if (distance < bestDistance && distance <= maxDistance) {
        bestDistance = distance;
        // Return the full known word, not just the matching part
        bestMatch = knownWord;
      }
    }

    // Also check the full phrase
    const fullDistance = levenshteinDistance(word, knownWord);
    if (fullDistance < bestDistance && fullDistance <= maxDistance) {
      bestDistance = fullDistance;
      bestMatch = knownWord;
    }
  }

  return bestMatch;
}

export interface ValidationOptions {
  /** Skip word count validation (for diet descriptions) */
  skipWordCount?: boolean;
}

/**
 * Main validation function
 * Validates name input for medications, supplements, or foods
 */
export function validateNameInput(
  value: string,
  category: 'medication' | 'supplement' | 'food',
  options?: ValidationOptions
): ValidationResult {
  // Trim and normalize whitespace
  const trimmedValue = value.trim().replace(/\s+/g, ' ');

  // Empty is valid (let required field validation handle it)
  if (!trimmedValue) {
    return { isValid: true };
  }

  // Split into words
  const words = trimmedValue.split(' ').filter(w => w.length > 0);

  // Check word count (max 2) - skip for diet descriptions
  if (!options?.skipWordCount && words.length > MAX_WORD_COUNT) {
    return {
      isValid: false,
      error: `Please use ${MAX_WORD_COUNT} words or fewer. You entered ${words.length} words.`,
    };
  }

  // Check each word
  for (const word of words) {
    // Check word length (max 15)
    if (word.length > MAX_WORD_LENGTH) {
      const suggestion = findFuzzyMatch(word, category);
      return {
        isValid: false,
        error: `"${word}" is too long (max ${MAX_WORD_LENGTH} characters).`,
        suggestion,
      };
    }

    // Check for repeated characters (key-hold gibberish)
    if (isRepeatedCharacters(word)) {
      return {
        isValid: false,
        error: `"${word}" looks like a typo. Please enter a valid name.`,
      };
    }

    // Check for keyboard mash
    if (isKeyboardMash(word)) {
      return {
        isValid: false,
        error: `"${word}" looks like a typo. Please enter a valid name.`,
      };
    }
  }

  // All checks passed
  return { isValid: true };
}

/**
 * Check if input looks like gibberish and suggest a correction
 * Returns suggestion only if a good match is found
 */
export function getSuggestion(
  value: string,
  category: 'medication' | 'supplement' | 'food'
): string | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  // Try to find a fuzzy match for the whole input
  let suggestion = findFuzzyMatch(trimmedValue, category);

  // If no match for full input, try individual words
  if (!suggestion) {
    const words = trimmedValue.split(' ').filter(w => w.length > 0);
    for (const word of words) {
      suggestion = findFuzzyMatch(word, category);
      if (suggestion) break;
    }
  }

  // Only return suggestion if it's different from input
  if (suggestion && suggestion.toLowerCase() !== trimmedValue.toLowerCase()) {
    return suggestion;
  }

  return undefined;
}

/**
 * Get validation result with suggestion
 * Combines validation and suggestion lookup
 */
export function validateWithSuggestion(
  value: string,
  category: 'medication' | 'supplement' | 'food',
  options?: ValidationOptions
): ValidationResult {
  const result = validateNameInput(value, category, options);

  // If invalid but no suggestion yet, try to find one
  if (!result.isValid && !result.suggestion) {
    result.suggestion = getSuggestion(value, category);
  }

  return result;
}
