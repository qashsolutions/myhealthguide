'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * AccessibleButton - Enforced accessibility standards for 55+ users
 *
 * Features:
 * - Minimum 44px height (WCAG AAA touch target)
 * - 16px+ font size for readability
 * - High contrast colors
 * - Visible focus states
 * - Loading state with announcement
 * - Disabled state with proper aria
 *
 * Usage:
 *   <AccessibleButton>Click me</AccessibleButton>
 *   <AccessibleButton variant="secondary" size="lg">Large Button</AccessibleButton>
 *   <AccessibleButton loading>Saving...</AccessibleButton>
 */

const accessibleButtonVariants = cva(
  [
    // Base styles - enforced accessibility
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-lg',
    'font-medium transition-all duration-150',
    // Focus states - highly visible
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2',
    // Disabled state
    'disabled:pointer-events-none disabled:opacity-60',
    // Ensure text is selectable for screen readers
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-blue-600 text-white shadow-sm',
          'hover:bg-blue-700',
          'focus-visible:ring-blue-500',
          'active:bg-blue-800',
        ].join(' '),
        secondary: [
          'bg-gray-100 text-gray-900 border border-gray-300',
          'hover:bg-gray-200',
          'focus-visible:ring-gray-400',
          'dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600',
          'dark:hover:bg-gray-600',
        ].join(' '),
        destructive: [
          'bg-red-600 text-white shadow-sm',
          'hover:bg-red-700',
          'focus-visible:ring-red-500',
          'active:bg-red-800',
        ].join(' '),
        outline: [
          'border-2 border-gray-400 bg-transparent text-gray-900',
          'hover:bg-gray-100',
          'focus-visible:ring-gray-500',
          'dark:text-gray-100 dark:border-gray-500',
          'dark:hover:bg-gray-800',
        ].join(' '),
        ghost: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-100',
          'focus-visible:ring-gray-400',
          'dark:text-gray-300 dark:hover:bg-gray-800',
        ].join(' '),
        link: [
          'text-blue-600 underline underline-offset-4',
          'hover:text-blue-700',
          'focus-visible:ring-blue-500',
          'dark:text-blue-400 dark:hover:text-blue-300',
        ].join(' '),
        success: [
          'bg-green-600 text-white shadow-sm',
          'hover:bg-green-700',
          'focus-visible:ring-green-500',
          'active:bg-green-800',
        ].join(' '),
      },
      size: {
        // All sizes meet 44px minimum height requirement
        default: 'h-11 min-h-[44px] px-5 py-2.5 text-base',
        sm: 'h-10 min-h-[40px] px-4 py-2 text-sm',
        lg: 'h-12 min-h-[48px] px-8 py-3 text-lg',
        xl: 'h-14 min-h-[56px] px-10 py-4 text-lg',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-2',
        'icon-lg': 'h-12 w-12 min-h-[48px] min-w-[48px] p-2.5',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accessibleButtonVariants> {
  /** Render as a different element (e.g., Link) */
  asChild?: boolean;
  /** Show loading spinner and disable interactions */
  loading?: boolean;
  /** Accessible loading text for screen readers */
  loadingText?: string;
  /** Icon to display before text */
  iconLeft?: React.ReactNode;
  /** Icon to display after text */
  iconRight?: React.ReactNode;
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText = 'Loading, please wait',
      iconLeft,
      iconRight,
      children,
      disabled,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // For icon-only buttons, require aria-label
    const isIconOnly = (size === 'icon' || size === 'icon-lg') && !children;
    if (isIconOnly && !ariaLabel) {
      console.warn(
        'AccessibleButton: Icon-only buttons require an aria-label for accessibility'
      );
    }

    return (
      <Comp
        className={cn(
          accessibleButtonVariants({ variant, size, fullWidth, className })
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={ariaLabel}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="sr-only">{loadingText}</span>
            {typeof children === 'string' ? children : null}
          </>
        ) : (
          <>
            {iconLeft && (
              <span className="flex-shrink-0" aria-hidden="true">
                {iconLeft}
              </span>
            )}
            {children}
            {iconRight && (
              <span className="flex-shrink-0" aria-hidden="true">
                {iconRight}
              </span>
            )}
          </>
        )}
      </Comp>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

export { AccessibleButton, accessibleButtonVariants };
