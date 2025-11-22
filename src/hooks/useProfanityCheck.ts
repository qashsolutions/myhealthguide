/**
 * Custom hook for profanity checking in forms
 */

import { useState, useCallback } from 'react';
import { validateNoProfanity } from '@/lib/utils/profanityFilter';

export function useProfanityCheck() {
  const [profanityErrors, setProfanityErrors] = useState<Record<string, string>>({});

  const checkText = useCallback((text: string, fieldName: string): boolean => {
    const result = validateNoProfanity(text, fieldName);

    if (!result.isValid && result.error) {
      setProfanityErrors(prev => ({
        ...prev,
        [fieldName]: result.error!
      }));
      return false;
    } else {
      setProfanityErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      return true;
    }
  }, []);

  const checkMultipleFields = useCallback((fields: Record<string, string>): boolean => {
    let allValid = true;
    const newErrors: Record<string, string> = {};

    for (const [fieldName, text] of Object.entries(fields)) {
      const result = validateNoProfanity(text, fieldName);
      if (!result.isValid && result.error) {
        newErrors[fieldName] = result.error;
        allValid = false;
      }
    }

    setProfanityErrors(newErrors);
    return allValid;
  }, []);

  const clearErrors = useCallback(() => {
    setProfanityErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setProfanityErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    profanityErrors,
    checkText,
    checkMultipleFields,
    clearErrors,
    clearFieldError
  };
}
