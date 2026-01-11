/**
 * Accessibility Components for 55+ Users
 *
 * This module exports React components that enforce accessibility standards
 * for users aged 55 and older. All components meet or exceed WCAG 2.1 AA guidelines.
 *
 * Key Features:
 * - Minimum 44px touch targets
 * - 16px+ font sizes
 * - High contrast colors
 * - Visible focus states
 * - Proper ARIA attributes
 * - Screen reader support
 *
 * Usage:
 *   import { AccessibleButton, AccessibleInput } from '@/components/accessibility';
 */

// Button - Enforced touch target and contrast
export { AccessibleButton, accessibleButtonVariants } from './AccessibleButton';
export type { AccessibleButtonProps } from './AccessibleButton';

// Input - Visible labels, error states, password toggle
export { AccessibleInput } from './AccessibleInput';
export type { AccessibleInputProps } from './AccessibleInput';

// Link - Underlines, external indicators, focus states
export { AccessibleLink } from './AccessibleLink';
export type { AccessibleLinkProps } from './AccessibleLink';

// Card - Proper heading hierarchy, semantic structure
export { AccessibleCard } from './AccessibleCard';
export type { AccessibleCardProps } from './AccessibleCard';

// Icon - Requires label or decorative marker
export { AccessibleIcon } from './AccessibleIcon';
export type { AccessibleIconProps } from './AccessibleIcon';

// NavItem - Icon + text, never icon alone
export { AccessibleNavItem } from './AccessibleNavItem';
export type { AccessibleNavItemProps } from './AccessibleNavItem';

// PageWrapper - Skip links, focus management, announcements
export { AccessiblePageWrapper } from './AccessiblePageWrapper';
export type { AccessiblePageWrapperProps } from './AccessiblePageWrapper';
