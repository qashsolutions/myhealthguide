/**
 * Feature Tracking Hook
 *
 * React hook for automatic feature engagement tracking.
 * Tracks page views, time spent, and actions.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  trackFeatureView,
  trackActionStart,
  trackActionComplete,
  trackActionAbandon,
  setupVisibilityTracking,
  setupUnloadTracking,
} from '@/lib/engagement/featureTracker';
import type { TrackableFeature } from '@/types/engagement';

interface UseFeatureTrackingOptions {
  /**
   * Whether to automatically track page view on mount
   * @default true
   */
  autoTrackView?: boolean;
}

interface UseFeatureTrackingReturn {
  /**
   * Track the start of an action (e.g., form open, modal open)
   */
  trackAction: (actionType?: string) => Promise<string | null>;

  /**
   * Track successful completion of an action
   */
  completeAction: (actionType?: string) => Promise<void>;

  /**
   * Manually trigger a page view (useful for tab changes)
   */
  triggerPageView: () => Promise<void>;
}

/**
 * Hook for tracking feature engagement
 *
 * @param feature - The feature being tracked
 * @param options - Tracking options
 *
 * @example
 * ```tsx
 * function MedicationsPage() {
 *   const { trackAction, completeAction } = useFeatureTracking('daily_care_medications');
 *
 *   const handleAddMedication = async () => {
 *     await trackAction('add_medication');
 *     // Show form...
 *   };
 *
 *   const handleSaveMedication = async () => {
 *     // Save logic...
 *     await completeAction('add_medication');
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useFeatureTracking(
  feature: TrackableFeature,
  options: UseFeatureTrackingOptions = {}
): UseFeatureTrackingReturn {
  const { autoTrackView = true } = options;
  const { user } = useAuth();
  const userId = user?.id;

  // Track if we've already tracked the initial page view
  const hasTrackedView = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (!userId || !autoTrackView || hasTrackedView.current) return;

    hasTrackedView.current = true;
    trackFeatureView(userId, feature);

    // Setup visibility and unload tracking
    const cleanupVisibility = setupVisibilityTracking(userId);
    const cleanupUnload = setupUnloadTracking(userId);

    return () => {
      cleanupVisibility();
      cleanupUnload();
    };
  }, [userId, feature, autoTrackView]);

  // Reset tracked state when feature changes
  useEffect(() => {
    hasTrackedView.current = false;
  }, [feature]);

  const trackAction = useCallback(
    async (actionType?: string): Promise<string | null> => {
      if (!userId) return null;
      return trackActionStart(userId, feature, actionType);
    },
    [userId, feature]
  );

  const completeAction = useCallback(
    async (actionType?: string): Promise<void> => {
      if (!userId) return;
      await trackActionComplete(userId, feature, actionType);
    },
    [userId, feature]
  );

  const triggerPageView = useCallback(async (): Promise<void> => {
    if (!userId) return;
    await trackFeatureView(userId, feature);
  }, [userId, feature]);

  return {
    trackAction,
    completeAction,
    triggerPageView,
  };
}

/**
 * Hook for tracking tab changes within a page
 * Useful for pages with multiple tabs (e.g., Daily Care with Medications, Supplements, etc.)
 *
 * @example
 * ```tsx
 * function DailyCarePage() {
 *   const [activeTab, setActiveTab] = useState('medications');
 *
 *   // Track tab changes
 *   useTabTracking('daily_care', activeTab, {
 *     medications: 'daily_care_medications',
 *     supplements: 'daily_care_supplements',
 *     diet: 'daily_care_diet',
 *     activity: 'daily_care_activity',
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useTabTracking(
  baseFeature: TrackableFeature,
  activeTab: string,
  tabToFeatureMap: Record<string, TrackableFeature>
): void {
  const { user } = useAuth();
  const userId = user?.id;
  const previousTab = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Track tab change
    if (previousTab.current !== activeTab) {
      const feature = tabToFeatureMap[activeTab] || baseFeature;
      trackFeatureView(userId, feature);
      previousTab.current = activeTab;
    }
  }, [userId, activeTab, baseFeature, tabToFeatureMap]);
}
