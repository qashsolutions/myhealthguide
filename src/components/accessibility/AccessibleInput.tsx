'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

/**
 * AccessibleInput - Enforced accessibility standards for 55+ users
 *
 * Features:
 * - Minimum 44px height (WCAG AAA touch target)
 * - 16px+ font size for readability
 * - Visible labels (required, not just placeholder)
 * - Clear error states with icons
 * - Success states with feedback
 * - Password toggle with announcement
 * - High contrast borders and focus states
 *
 * Usage:
 *   <AccessibleInput label="Email" type="email" required />
 *   <AccessibleInput label="Password" type="password" showPasswordToggle />
 *   <AccessibleInput label="Name" error="Name is required" />
 */

export interface AccessibleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visible label text (required for accessibility) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Helper text below input */
  helperText?: string;
  /** Show password toggle button for password inputs */
  showPasswordToggle?: boolean;
  /** Size variant */
  size?: 'default' | 'lg';
  /** Full width input */
  fullWidth?: boolean;
  /** Left icon/addon */
  iconLeft?: React.ReactNode;
  /** Right icon/addon */
  iconRight?: React.ReactNode;
  /** Hide the label visually (still accessible to screen readers) */
  hideLabel?: boolean;
  /** Container className */
  containerClassName?: string;
}

const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      success,
      helperText,
      showPasswordToggle = false,
      size = 'default',
      fullWidth = true,
      iconLeft,
      iconRight,
      hideLabel = false,
      type = 'text',
      id,
      required,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const successId = `${inputId}-success`;

    // Determine actual input type (for password toggle)
    const actualType = type === 'password' && showPassword ? 'text' : type;

    // Build aria-describedby
    const describedBy = [
      ariaDescribedBy,
      error ? errorId : null,
      success ? successId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    // Size classes
    const sizeClasses = {
      default: 'h-11 min-h-[44px] text-base px-4 py-2.5',
      lg: 'h-12 min-h-[48px] text-lg px-5 py-3',
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', containerClassName)}>
        {/* Label */}
        <label
          htmlFor={inputId}
          className={cn(
            'text-base font-medium text-gray-900 dark:text-gray-100',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {iconLeft && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
              {iconLeft}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              // Base styles
              'w-full rounded-lg border bg-white text-gray-900',
              'transition-all duration-150',
              // Dark mode
              'dark:bg-gray-900 dark:text-gray-100',
              // Size
              sizeClasses[size],
              // Padding adjustments for icons
              iconLeft && 'pl-12',
              (iconRight || showPasswordToggle || error || success) && 'pr-12',
              // Border states
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : success
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20',
              // Focus states - highly visible
              'focus:outline-none focus:ring-[3px]',
              // Disabled state
              disabled && 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800',
              // Placeholder
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              className
            )}
            {...props}
          />

          {/* Right side: error/success icon, password toggle, or custom icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Password toggle */}
            {type === 'password' && showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'p-1 rounded text-gray-500 hover:text-gray-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'dark:text-gray-400 dark:hover:text-gray-200'
                )}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Error icon */}
            {error && !showPasswordToggle && (
              <AlertCircle
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            )}

            {/* Success icon */}
            {success && !error && !showPasswordToggle && (
              <CheckCircle
                className="h-5 w-5 text-green-500"
                aria-hidden="true"
              />
            )}

            {/* Custom right icon */}
            {iconRight && !error && !success && !showPasswordToggle && (
              <span className="text-gray-500 dark:text-gray-400">{iconRight}</span>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p
            id={successId}
            className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400"
          >
            <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {success}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && !success && (
          <p
            id={helperId}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

export { AccessibleInput };
