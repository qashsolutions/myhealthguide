'use client';

import { SVGProps } from 'react';

interface UniversalAccessibilityIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Universal Accessibility Icon - Person with arms outstretched in a circle
 * This is the modern, inclusive accessibility symbol (not the wheelchair symbol)
 */
export function UniversalAccessibilityIcon({
  size = 24,
  className,
  ...props
}: UniversalAccessibilityIconProps) {
  return (
    <svg
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
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" />
      {/* Head */}
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      {/* Body */}
      <line x1="12" y1="8.5" x2="12" y2="14" />
      {/* Arms outstretched upward */}
      <line x1="12" y1="10" x2="8" y2="7" />
      <line x1="12" y1="10" x2="16" y2="7" />
      {/* Legs spread apart */}
      <line x1="12" y1="14" x2="8.5" y2="19" />
      <line x1="12" y1="14" x2="15.5" y2="19" />
    </svg>
  );
}
