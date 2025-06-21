import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Button component with eldercare-optimized styling
 * Meets WCAG 2.1 AA standards with large touch targets
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps): JSX.Element {
  // Size classes with eldercare-optimized touch targets
  const sizeClasses = {
    small: 'px-4 py-2 text-elder-sm min-h-[44px]',
    medium: 'px-6 py-3 text-elder-base min-h-[48px]',
    large: 'px-8 py-4 text-elder-lg min-h-[56px]',
  };

  // Variant classes with high contrast colors
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
    secondary: 'bg-elder-background-alt text-elder-text border-2 border-elder-border hover:bg-gray-100 focus-visible:ring-gray-500',
    danger: 'bg-health-danger text-white hover:bg-health-danger-light focus-visible:ring-health-danger',
  };

  const buttonClasses = clsx(
    // Base classes
    'inline-flex items-center justify-center font-semibold',
    'rounded-elder transition-all duration-200 cursor-pointer',
    'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Size and variant
    sizeClasses[size],
    variantClasses[variant],
    
    // Full width option
    fullWidth && 'w-full',
    
    // Loading state
    loading && 'relative cursor-wait',
    
    // Custom classes
    className
  );

  const isDisabled = disabled || loading;

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading...</span>
        </span>
      )}
      
      <span className={clsx('flex items-center gap-3', loading && 'invisible')}>
        {icon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </span>
    </button>
  );
}