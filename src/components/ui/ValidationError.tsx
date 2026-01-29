'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationErrorProps {
  error?: string;
  suggestion?: string;
  onApplySuggestion?: () => void;
  className?: string;
}

/**
 * Inline validation error display with optional suggestion
 * Used for name validation in medication, supplement, and food forms
 */
export function ValidationError({
  error,
  suggestion,
  onApplySuggestion,
  className,
}: ValidationErrorProps) {
  if (!error) return null;

  return (
    <div className={cn('mt-1.5 flex flex-col gap-1', className)}>
      <div className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
      {suggestion && onApplySuggestion && (
        <button
          type="button"
          onClick={onApplySuggestion}
          className="ml-5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 text-left transition-colors"
        >
          Did you mean &quot;{suggestion}&quot;?
        </button>
      )}
    </div>
  );
}
