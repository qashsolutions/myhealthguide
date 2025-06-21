import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Input component with eldercare-optimized styling
 * Large fonts and touch targets for elderly users
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helpText, 
    icon, 
    showPasswordToggle = false,
    type = 'text',
    className, 
    id,
    required,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || props.name;
    
    // Toggle password visibility
    const handlePasswordToggle = () => {
      setShowPassword(!showPassword);
    };
    
    // Determine input type
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    const inputClasses = clsx(
      // Base styles
      'w-full px-4 py-3 text-elder-base border-2 rounded-elder',
      'focus:outline-none focus:border-primary-500',
      'focus-visible:ring-4 focus-visible:ring-primary-500/20',
      'placeholder:text-elder-text-secondary',
      'min-h-[48px]', // Eldercare touch target
      
      // Icon padding
      icon && 'pl-12',
      showPasswordToggle && type === 'password' && 'pr-12',
      
      // Error state
      error ? 'border-health-danger' : 'border-elder-border',
      
      // Disabled state
      'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
      
      // Custom classes
      className
    );
    
    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-elder-base font-medium text-elder-text"
          >
            {label}
            {required && (
              <span className="text-health-danger ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          {/* Icon */}
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-elder-text-secondary">
              {icon}
            </div>
          )}
          
          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={
              clsx(
                error && `${inputId}-error`,
                helpText && `${inputId}-help`
              ) || undefined
            }
            {...props}
          />
          
          {/* Password toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-elder-text-secondary hover:text-elder-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        
        {/* Help text */}
        {helpText && !error && (
          <p 
            id={`${inputId}-help`}
            className="text-elder-sm text-elder-text-secondary"
          >
            {helpText}
          </p>
        )}
        
        {/* Error message */}
        {error && (
          <p 
            id={`${inputId}-error`}
            className="flex items-center gap-2 text-elder-sm text-health-danger"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';