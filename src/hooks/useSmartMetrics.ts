/**
 * Smart Metrics Tracking Hook
 *
 * React hook for tracking smart response quality metrics.
 * Tracks follow-ups, actions, and session continuation.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import {
  recordSmartResponse,
  recordUserFollowUp,
  recordActionTaken,
  recordSessionEnd,
  isFollowUpQuestion,
} from '@/lib/engagement/smartMetricsTracker';

interface UseSmartMetricsOptions {
  feature: 'health_chat' | 'smart_assistant' | 'weekly_summary' | 'smart_insight' | 'symptom_checker';
}

interface UseSmartMetricsReturn {
  /**
   * Track a smart response for quality metrics
   */
  trackResponse: (responseId: string, responseText: string) => Promise<void>;

  /**
   * Track user's follow-up message
   */
  trackUserMessage: (message: string) => Promise<void>;

  /**
   * Track when user takes action on a suggestion
   */
  trackAction: (responseId: string, actionType: string) => Promise<void>;
}

/**
 * Hook for tracking smart interaction quality metrics
 *
 * @example
 * ```tsx
 * function HealthChatPage() {
 *   const { trackResponse, trackUserMessage, trackAction } = useSmartMetrics({
 *     feature: 'health_chat',
 *   });
 *
 *   const handleSmartResponse = async (response) => {
 *     await trackResponse(response.id, response.text);
 *   };
 *
 *   const handleUserMessage = async (message) => {
 *     await trackUserMessage(message);
 *     // Send message to smart assistant...
 *   };
 *
 *   const handleActionClick = async (responseId, action) => {
 *     await trackAction(responseId, action);
 *     // Execute action...
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSmartMetrics(options: UseSmartMetricsOptions): UseSmartMetricsReturn {
  const { feature } = options;
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const userId = user?.id;
  const groupId = selectedElder?.groupId;

  // Track session end on unmount
  const hasTrackedSession = useRef(false);

  useEffect(() => {
    return () => {
      if (userId && hasTrackedSession.current) {
        recordSessionEnd(userId);
      }
    };
  }, [userId]);

  const trackResponse = useCallback(
    async (responseId: string, responseText: string): Promise<void> => {
      if (!userId || !groupId) return;

      await recordSmartResponse({
        userId,
        groupId,
        responseId,
        responseText,
        feature,
      });

      hasTrackedSession.current = true;
    },
    [userId, groupId, feature]
  );

  const trackUserMessage = useCallback(
    async (message: string): Promise<void> => {
      if (!userId) return;

      const isQuestion = isFollowUpQuestion(message);
      await recordUserFollowUp(userId, isQuestion);
    },
    [userId]
  );

  const trackAction = useCallback(
    async (responseId: string, actionType: string): Promise<void> => {
      if (!userId) return;

      await recordActionTaken(userId, responseId, actionType);
    },
    [userId]
  );

  return {
    trackResponse,
    trackUserMessage,
    trackAction,
  };
}
