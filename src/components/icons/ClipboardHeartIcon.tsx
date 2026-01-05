'use client';

import { forwardRef, SVGProps } from 'react';

interface ClipboardHeartIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Clipboard with heart icon - represents caring health assessment
 * Used for the Symptom Checker feature
 */
export const ClipboardHeartIcon = forwardRef<SVGSVGElement, ClipboardHeartIconProps>(
  ({ size = 24, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {/* Clipboard body */}
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        {/* Clipboard tab */}
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        {/* Heart inside clipboard */}
        <path d="M12 11c-.6-1-1.5-1.5-2.5-1.5-1.5 0-2.5 1.2-2.5 2.7 0 2.3 3 4.3 5 5.8 2-1.5 5-3.5 5-5.8 0-1.5-1-2.7-2.5-2.7-1 0-1.9.5-2.5 1.5z" />
      </svg>
    );
  }
);

ClipboardHeartIcon.displayName = 'ClipboardHeartIcon';

export default ClipboardHeartIcon;
