'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * AccessiblePageWrapper - Layout wrapper that enforces page-level accessibility
 *
 * Features:
 * - Skip-to-content link for keyboard users
 * - Focus management on route change
 * - Semantic main landmark
 * - Consistent page structure
 * - Announces page title on navigation
 *
 * Usage:
 *   <AccessiblePageWrapper title="Dashboard">
 *     <YourPageContent />
 *   </AccessiblePageWrapper>
 */

export interface AccessiblePageWrapperProps {
  /** Page children */
  children: React.ReactNode;
  /** Page title for announcements */
  title?: string;
  /** Main content ID (for skip link target) */
  mainId?: string;
  /** Additional className for main content */
  className?: string;
  /** Skip the automatic focus management */
  skipFocusManagement?: boolean;
  /** Custom skip link text */
  skipLinkText?: string;
  /** Render skip link (useful if parent already provides one) */
  showSkipLink?: boolean;
  /** ARIA role for the main element */
  role?: 'main' | 'region';
  /** ARIA label for the main element */
  'aria-label'?: string;
}

export function AccessiblePageWrapper({
  children,
  title,
  mainId = 'main-content',
  className,
  skipFocusManagement = false,
  skipLinkText = 'Skip to main content',
  showSkipLink = true,
  role = 'main',
  'aria-label': ariaLabel,
}: AccessiblePageWrapperProps) {
  const pathname = usePathname();
  const mainRef = React.useRef<HTMLElement>(null);
  const [announced, setAnnounced] = React.useState(false);

  // Focus management on route change
  React.useEffect(() => {
    if (skipFocusManagement) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Find the first heading or focus the main content
      const heading = mainRef.current?.querySelector('h1, h2');
      if (heading instanceof HTMLElement) {
        // Make it focusable temporarily
        const hadTabIndex = heading.hasAttribute('tabindex');
        const originalTabIndex = heading.getAttribute('tabindex');
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });

        // Restore original tabindex after blur
        const restoreTabIndex = () => {
          if (hadTabIndex && originalTabIndex !== null) {
            heading.setAttribute('tabindex', originalTabIndex);
          } else {
            heading.removeAttribute('tabindex');
          }
          heading.removeEventListener('blur', restoreTabIndex);
        };
        heading.addEventListener('blur', restoreTabIndex);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, skipFocusManagement]);

  // Announce page title changes to screen readers
  React.useEffect(() => {
    if (!title) return;

    // Set document title
    document.title = `${title} | MyHealthGuide`;

    // Announce to screen readers
    setAnnounced(true);
    const timer = setTimeout(() => setAnnounced(false), 1000);

    return () => clearTimeout(timer);
  }, [title, pathname]);

  return (
    <>
      {/* Skip link - appears on focus */}
      {showSkipLink && (
        <a
          href={`#${mainId}`}
          className={cn(
            // Hidden off-screen by default using sr-only pattern
            'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
            '[clip:rect(0,0,0,0)]',
            // Show on focus - override sr-only
            'focus:static focus:w-auto focus:h-auto focus:p-0 focus:m-4',
            'focus:overflow-visible focus:whitespace-normal focus:[clip:auto]',
            'focus:z-[9999]',
            'focus:px-6 focus:py-3',
            'focus:bg-blue-600 focus:text-white',
            'focus:text-base focus:font-semibold',
            'focus:rounded-lg focus:shadow-lg',
            'focus:outline-none focus:ring-[3px] focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600'
          )}
        >
          {skipLinkText}
        </a>
      )}

      {/* Screen reader announcement for page changes */}
      {announced && title && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Navigated to {title}
        </div>
      )}

      {/* Main content landmark */}
      <main
        ref={mainRef}
        id={mainId}
        role={role}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          // Reset focus outline when focused programmatically
          'outline-none',
          // Base text styling for accessibility
          'text-base leading-relaxed',
          className
        )}
      >
        {children}
      </main>
    </>
  );
}

AccessiblePageWrapper.displayName = 'AccessiblePageWrapper';

export default AccessiblePageWrapper;
