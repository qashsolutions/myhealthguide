'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AccessibleCard - Enforced accessibility standards for 55+ users
 *
 * Features:
 * - Proper heading hierarchy (h2/h3/h4)
 * - High contrast borders
 * - Visible focus states for interactive cards
 * - Semantic structure
 * - Adequate padding for readability
 *
 * Usage:
 *   <AccessibleCard title="Card Title">Content here</AccessibleCard>
 *   <AccessibleCard title="Clickable" onClick={() => {}}>Interactive card</AccessibleCard>
 */

export interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title (uses proper heading element) */
  title?: string;
  /** Heading level for the title (h2, h3, or h4) */
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** Subtitle or description below title */
  subtitle?: string;
  /** Footer content */
  footer?: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  /** Padding size */
  padding?: 'none' | 'sm' | 'default' | 'lg';
  /** Is this card interactive/clickable? */
  interactive?: boolean;
  /** Icon to display in header */
  headerIcon?: React.ReactNode;
  /** Actions to display in header (e.g., menu button) */
  headerActions?: React.ReactNode;
  /** ARIA role override */
  role?: string;
}

const AccessibleCard = React.forwardRef<HTMLDivElement, AccessibleCardProps>(
  (
    {
      className,
      children,
      title,
      headingLevel = 'h3',
      subtitle,
      footer,
      variant = 'default',
      padding = 'default',
      interactive = false,
      headerIcon,
      headerActions,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      ...props
    },
    ref
  ) => {
    // If onClick is provided, make interactive
    const isInteractive = interactive || !!onClick;

    // Heading component
    const HeadingTag = headingLevel;

    // Variant classes
    const variantClasses = {
      default: [
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'shadow-sm',
      ].join(' '),
      outlined: [
        'bg-transparent',
        'border-2 border-gray-300 dark:border-gray-600',
      ].join(' '),
      elevated: [
        'bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        'shadow-md',
      ].join(' '),
      filled: [
        'bg-gray-50 dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-700',
      ].join(' '),
    };

    // Padding classes
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      default: 'p-6',
      lg: 'p-8',
    };

    // Handle keyboard interaction for clickable cards
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        role={role || (isInteractive ? 'button' : undefined)}
        tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles
          'rounded-xl',
          // Variant
          variantClasses[variant],
          // Padding
          paddingClasses[padding],
          // Interactive states
          isInteractive && [
            'cursor-pointer',
            'transition-all duration-150',
            'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-500',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'active:scale-[0.99]',
          ],
          className
        )}
        {...props}
      >
        {/* Header */}
        {(title || headerIcon || headerActions) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {headerIcon && (
                <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                  {headerIcon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <HeadingTag className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {title}
                  </HeadingTag>
                )}
                {subtitle && (
                  <p className="mt-1 text-base text-gray-600 dark:text-gray-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {headerActions && (
              <div className="flex-shrink-0">{headerActions}</div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="text-base text-gray-700 dark:text-gray-300">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

AccessibleCard.displayName = 'AccessibleCard';

export { AccessibleCard };
