'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

/**
 * AccessibleLink - Enforced accessibility standards for 55+ users
 *
 * Features:
 * - Visible underline (not just color change)
 * - External link indicator with announcement
 * - High contrast colors
 * - Visible focus states
 * - Minimum touch target for mobile
 *
 * Usage:
 *   <AccessibleLink href="/about">About Us</AccessibleLink>
 *   <AccessibleLink href="https://example.com" external>Visit Example</AccessibleLink>
 */

export interface AccessibleLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Link destination (required) */
  href: string;
  /** Is this an external link? Auto-detected if href starts with http */
  external?: boolean;
  /** Visual style variant */
  variant?: 'default' | 'subtle' | 'nav' | 'button';
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Icon to display before text */
  iconLeft?: React.ReactNode;
  /** Icon to display after text */
  iconRight?: React.ReactNode;
  /** Disable the link */
  disabled?: boolean;
}

const AccessibleLink = React.forwardRef<HTMLAnchorElement, AccessibleLinkProps>(
  (
    {
      className,
      href,
      external,
      variant = 'default',
      size = 'default',
      iconLeft,
      iconRight,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    // Auto-detect external links
    const isExternal = external ?? href.startsWith('http');

    // Size classes
    const sizeClasses = {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-lg',
    };

    // Variant classes
    const variantClasses = {
      default: [
        'text-blue-600 dark:text-blue-400',
        'underline underline-offset-4 decoration-1',
        'hover:text-blue-800 dark:hover:text-blue-300',
        'hover:decoration-2',
      ].join(' '),
      subtle: [
        'text-gray-700 dark:text-gray-300',
        'hover:text-blue-600 dark:hover:text-blue-400',
        'hover:underline underline-offset-4',
      ].join(' '),
      nav: [
        'text-gray-700 dark:text-gray-300',
        'font-medium',
        'hover:text-blue-600 dark:hover:text-blue-400',
        'no-underline',
      ].join(' '),
      button: [
        'inline-flex items-center justify-center gap-2',
        'bg-blue-600 text-white',
        'px-5 py-2.5 rounded-lg',
        'no-underline',
        'hover:bg-blue-700',
        'min-h-[44px]',
      ].join(' '),
    };

    // Common classes
    const commonClasses = cn(
      // Base
      'inline-flex items-center gap-1.5',
      'transition-all duration-150',
      // Focus - highly visible
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      'rounded',
      // Disabled state
      disabled && 'pointer-events-none opacity-60',
      // Size
      sizeClasses[size],
      // Variant
      variantClasses[variant],
      className
    );

    // External link props
    const externalProps = isExternal
      ? {
          target: '_blank',
          rel: 'noopener noreferrer',
        }
      : {};

    // Content with icons
    const content = (
      <>
        {iconLeft && (
          <span className="flex-shrink-0" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        {children}
        {isExternal && !iconRight && (
          <>
            <ExternalLink
              className="h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span className="sr-only"> (opens in new tab)</span>
          </>
        )}
        {iconRight && !isExternal && (
          <span className="flex-shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </>
    );

    // Use Next.js Link for internal links
    if (!isExternal) {
      return (
        <Link
          ref={ref}
          href={href}
          className={commonClasses}
          aria-disabled={disabled}
          {...props}
        >
          {content}
        </Link>
      );
    }

    // Use regular anchor for external links
    return (
      <a
        ref={ref}
        href={href}
        className={commonClasses}
        aria-disabled={disabled}
        {...externalProps}
        {...props}
      >
        {content}
      </a>
    );
  }
);

AccessibleLink.displayName = 'AccessibleLink';

export { AccessibleLink };
