/**
 * Custom hook for name validation in medication, supplement, and food forms
 * Prevents gibberish/accidental long inputs with fuzzy matching suggestions
 */

import { useState, useCallback } from 'react';
import { validateWithSuggestion, type ValidationResult, type ValidationOptions } from '@/lib/validation/nameValidator';

export interface NameValidationState {
  error?: string;
  suggestion?: string;
  lastValue?: string;
}

export function useNameValidation() {
  const [validationState, setValidationState] = useState<Record<string, NameValidationState>>({});

  /**
   * Validate a field value and update state
   * @returns true if valid, false if invalid
   */
  const validateField = useCallback((
    fieldName: string,
    value: string,
    category: 'medication' | 'supplement' | 'food',
    options?: ValidationOptions
  ): boolean => {
    const result: ValidationResult = validateWithSuggestion(value, category, options);

    if (!result.isValid) {
      setValidationState(prev => ({
        ...prev,
        [fieldName]: {
          error: result.error,
          suggestion: result.suggestion,
          lastValue: value,
        },
      }));
      return false;
    } else {
      // Clear error for this field if valid
      setValidationState(prev => {
        const newState = { ...prev };
        delete newState[fieldName];
        return newState;
      });
      return true;
    }
  }, []);

  /**
   * Apply suggestion to field and clear error
   * @returns the suggestion value or undefined
   */
  const applySuggestion = useCallback((fieldName: string): string | undefined => {
    const state = validationState[fieldName];
    if (!state?.suggestion) return undefined;

    const suggestion = state.suggestion;

    // Clear the error state
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });

    return suggestion;
  }, [validationState]);

  /**
   * Get the error message for a field
   */
  const getError = useCallback((fieldName: string): string | undefined => {
    return validationState[fieldName]?.error;
  }, [validationState]);

  /**
   * Get the suggestion for a field
   */
  const getSuggestion = useCallback((fieldName: string): string | undefined => {
    return validationState[fieldName]?.suggestion;
  }, [validationState]);

  /**
   * Clear error for a specific field
   */
  const clearError = useCallback((fieldName: string) => {
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setValidationState({});
  }, []);

  /**
   * Check if any field has an error
   */
  const hasErrors = useCallback((): boolean => {
    return Object.keys(validationState).length > 0;
  }, [validationState]);

  return {
    validateField,
    applySuggestion,
    getError,
    getSuggestion,
    clearError,
    clearAllErrors,
    hasErrors,
  };
}
