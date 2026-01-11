'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * AccessibleNavItem - Enforced accessibility standards for 55+ users
 *
 * Features:
 * - Icon + text (never icon alone)
 * - Minimum 44px touch target
 * - Clear active state indication
 * - High contrast colors
 * - Visible focus states
 *
 * Usage:
 *   <AccessibleNavItem href="/dashboard" icon={<Home />} label="Dashboard" />
 *   <AccessibleNavItem href="/settings" icon={<Settings />} label="Settings" active />
 */

export interface AccessibleNavItemProps {
  /** Navigation destination */
  href: string;
  /** Icon element (required - ensures visual identification) */
  icon: React.ReactNode;
  /** Label text (required - ensures accessibility) */
  label: string;
  /** Is this item currently active? */
  active?: boolean;
  /** Badge content (e.g., notification count) */
  badge?: React.ReactNode;
  /** Badge variant */
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Tooltip text (shown on hover) */
  tooltip?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
}

const AccessibleNavItem = React.forwardRef<HTMLAnchorElement, AccessibleNavItemProps>(
  (
    {
      href,
      icon,
      label,
      active = false,
      badge,
      badgeVariant = 'default',
      tooltip,
      disabled = false,
      className,
      onClick,
    },
    ref
  ) => {
    // Badge variant classes
    const badgeVariantClasses = {
      default: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      danger: 'bg-red-500 text-white',
    };

    return (
      <Link
        ref={ref}
        href={disabled ? '#' : href}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
        title={tooltip}
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled}
        className={cn(
          // Base styles - enforced 44px min height
          'relative flex items-center gap-3',
          'min-h-[44px] px-4 py-3',
          'rounded-lg',
          'text-base font-medium',
          'transition-all duration-150',
          // Focus state - highly visible
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          // States
          active
            ? [
                'text-blue-700 dark:text-blue-400',
                'bg-blue-50 dark:bg-blue-900/20',
              ]
            : [
                'text-gray-600 dark:text-gray-400',
                'hover:text-gray-900 dark:hover:text-gray-100',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
              ],
          // Disabled
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {/* Active indicator bar */}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 dark:bg-blue-400 rounded-full"
            aria-hidden="true"
          />
        )}

        {/* Icon - always visible */}
        <span
          className={cn(
            'flex-shrink-0 w-5 h-5',
            '[&>svg]:w-5 [&>svg]:h-5',
            active && 'text-blue-600 dark:text-blue-400'
          )}
          aria-hidden="true"
        >
          {icon}
        </span>

        {/* Label - always visible (never icon-only) */}
        <span className="flex-1 truncate">{label}</span>

        {/* Badge */}
        {badge !== undefined && (
          <span
            className={cn(
              'flex-shrink-0 text-sm px-2 py-0.5 rounded-full font-semibold',
              badgeVariantClasses[badgeVariant]
            )}
            aria-label={typeof badge === 'number' ? `${badge} notifications` : undefined}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  }
);

AccessibleNavItem.displayName = 'AccessibleNavItem';

export { AccessibleNavItem };
