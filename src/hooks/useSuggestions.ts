'use client';

import { useState, useCallback, useRef } from 'react';
import { useTaskPriority } from '@/hooks/useTaskPriority';
import { getSuggestions, Suggestion, TriggerAction } from '@/lib/suggestions/suggestionEngine';

const AUTO_DISMISS_MS = 10_000;

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [visible, setVisible] = useState(false);
  const { tasks } = useTaskPriority();
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const triggerSuggestion = useCallback((afterAction: TriggerAction) => {
    clearTimer();

    const newSuggestions = getSuggestions(afterAction, {
      tasks,
      currentTime: new Date(),
    });

    if (newSuggestions.length === 0) {
      setVisible(false);
      return;
    }

    setSuggestions(newSuggestions);
    setVisible(true);

    // Auto-dismiss after 10 seconds
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, AUTO_DISMISS_MS);
  }, [tasks, clearTimer]);

  const dismissSuggestions = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  return {
    suggestions,
    visible,
    triggerSuggestion,
    dismissSuggestions,
  };
}
