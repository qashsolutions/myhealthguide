'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AccessibleIcon - Enforced accessibility standards for 55+ users
 *
 * Features:
 * - Requires either aria-label OR accompanying visible text
 * - Proper role and aria attributes
 * - Consistent sizing for visibility
 * - Color contrast considerations
 *
 * Usage:
 *   <AccessibleIcon icon={<Heart />} label="Favorites" />
 *   <AccessibleIcon icon={<Bell />} label="Notifications" showLabel />
 *   <AccessibleIcon icon={<X />} label="Close" decorative /> // For decorative icons
 */

export interface AccessibleIconProps {
  /** The icon element to render */
  icon: React.ReactNode;
  /** Accessible label (required unless decorative) */
  label: string;
  /** Show the label visually next to the icon */
  showLabel?: boolean;
  /** Label position relative to icon */
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
  /** Is this purely decorative? (hides from screen readers) */
  decorative?: boolean;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg' | 'xl';
  /** Custom color class */
  colorClass?: string;
  /** Additional className */
  className?: string;
}

const AccessibleIcon = React.forwardRef<HTMLSpanElement, AccessibleIconProps>(
  (
    {
      icon,
      label,
      showLabel = false,
      labelPosition = 'right',
      decorative = false,
      size = 'default',
      colorClass,
      className,
    },
    ref
  ) => {
    // Size classes for the icon container
    const sizeClasses = {
      sm: 'text-sm [&>svg]:h-4 [&>svg]:w-4',
      default: 'text-base [&>svg]:h-5 [&>svg]:w-5',
      lg: 'text-lg [&>svg]:h-6 [&>svg]:w-6',
      xl: 'text-xl [&>svg]:h-7 [&>svg]:w-7',
    };

    // Label size classes
    const labelSizeClasses = {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    };

    // Gap classes based on position
    const gapClasses = {
      left: 'flex-row-reverse gap-2',
      right: 'flex-row gap-2',
      top: 'flex-col-reverse gap-1',
      bottom: 'flex-col gap-1',
    };

    // If decorative, render with aria-hidden
    if (decorative) {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center',
            sizeClasses[size],
            colorClass || 'text-gray-600 dark:text-gray-400',
            className
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      );
    }

    // With visible label
    if (showLabel) {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center',
            gapClasses[labelPosition],
            colorClass || 'text-gray-700 dark:text-gray-300',
            className
          )}
        >
          <span
            className={cn(sizeClasses[size], 'flex-shrink-0')}
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className={labelSizeClasses[size]}>{label}</span>
        </span>
      );
    }

    // Icon only with sr-only label
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center',
          sizeClasses[size],
          colorClass || 'text-gray-600 dark:text-gray-400',
          className
        )}
        role="img"
        aria-label={label}
      >
        {icon}
      </span>
    );
  }
);

AccessibleIcon.displayName = 'AccessibleIcon';

export { AccessibleIcon };
