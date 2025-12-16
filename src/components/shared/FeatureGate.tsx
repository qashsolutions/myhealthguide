'use client';

import { useState, ReactNode } from 'react';
import { useSubscription } from '@/lib/subscription';
import { FeatureName } from '@/lib/subscription';
import { UpgradePrompt, UpgradePromptVariant } from './UpgradePrompt';

interface FeatureGateProps {
  /**
   * The feature to gate access to
   */
  feature: FeatureName;

  /**
   * Content to render if user has access
   */
  children: ReactNode;

  /**
   * Optional custom fallback content. If not provided, shows UpgradePrompt
   */
  fallback?: ReactNode;

  /**
   * Variant of the upgrade prompt to show
   * @default 'card'
   */
  promptVariant?: UpgradePromptVariant;

  /**
   * Whether to show a dialog upgrade prompt instead of replacing content
   * When true, children are rendered but clicking triggers the dialog
   * @default false
   */
  showDialog?: boolean;

  /**
   * Custom class name for the upgrade prompt
   */
  promptClassName?: string;

  /**
   * Callback when upgrade is clicked
   */
  onUpgrade?: () => void;
}

/**
 * Declarative feature gating component
 *
 * Usage:
 * ```tsx
 * <FeatureGate feature="calendar">
 *   <CalendarComponent />
 * </FeatureGate>
 * ```
 *
 * With dialog mode (content visible but upgrade dialog on interaction):
 * ```tsx
 * <FeatureGate feature="calendar" showDialog>
 *   <CalendarComponent />
 * </FeatureGate>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <FeatureGate feature="calendar" fallback={<CustomMessage />}>
 *   <CalendarComponent />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  promptVariant = 'card',
  showDialog = false,
  promptClassName,
  onUpgrade,
}: FeatureGateProps) {
  const { hasFeature, tier } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasAccess = hasFeature(feature);

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Dialog mode: render children but show upgrade dialog
  if (showDialog) {
    return (
      <>
        <div onClick={() => setDialogOpen(true)} className="cursor-pointer">
          {children}
        </div>
        <UpgradePrompt
          feature={feature}
          currentTier={tier}
          variant="dialog"
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpgrade={onUpgrade}
        />
      </>
    );
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: show upgrade prompt
  return (
    <UpgradePrompt
      feature={feature}
      currentTier={tier}
      variant={promptVariant}
      className={promptClassName}
      onUpgrade={onUpgrade}
    />
  );
}

/**
 * Hook version for programmatic feature gating
 *
 * Usage:
 * ```tsx
 * const { hasAccess, showUpgradePrompt, UpgradeDialog } = useFeatureGate('calendar');
 *
 * if (!hasAccess) {
 *   showUpgradePrompt();
 *   return null;
 * }
 * ```
 */
export function useFeatureGate(feature: FeatureName) {
  const { hasFeature, tier } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasAccess = hasFeature(feature);

  const showUpgradePrompt = () => {
    setDialogOpen(true);
  };

  const UpgradeDialog = () => (
    <UpgradePrompt
      feature={feature}
      currentTier={tier}
      variant="dialog"
      isOpen={dialogOpen}
      onOpenChange={setDialogOpen}
    />
  );

  return {
    hasAccess,
    showUpgradePrompt,
    dialogOpen,
    setDialogOpen,
    UpgradeDialog,
    tier,
  };
}

export default FeatureGate;
