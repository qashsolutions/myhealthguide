'use client';

import { useCallback } from 'react';
import { useOnlineStatusContext } from '@/contexts/OnlineStatusContext';

interface UseOfflineActionOptions {
  offlineMessage?: string;
  onOffline?: (message: string) => void;
}

/**
 * Hook to wrap actions that require network connectivity
 * Returns a wrapped function that checks online status before executing
 */
export function useOfflineAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: UseOfflineActionOptions = {}
): {
  execute: T;
  isOnline: boolean;
  canExecute: boolean;
} {
  const { isOnline } = useOnlineStatusContext();
  const {
    offlineMessage = "You're offline. This action requires an internet connection.",
    onOffline,
  } = options;

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (!isOnline) {
        onOffline?.(offlineMessage);
        return undefined;
      }

      try {
        return await action(...args);
      } catch (error) {
        // Check if it's an offline error that happened during the request
        if (
          error instanceof TypeError &&
          (error.message.includes('fetch') || error.message.includes('network'))
        ) {
          onOffline?.("Connection lost. Please check your internet and try again.");
          return undefined;
        }
        throw error;
      }
    },
    [action, isOnline, offlineMessage, onOffline]
  ) as T;

  return {
    execute,
    isOnline,
    canExecute: isOnline,
  };
}

/**
 * Simple hook to get disabled state for buttons/forms when offline
 */
export function useOfflineDisabled(): {
  isDisabled: boolean;
  disabledReason: string | null;
} {
  const { isOnline } = useOnlineStatusContext();

  return {
    isDisabled: !isOnline,
    disabledReason: isOnline ? null : "You're offline",
  };
}
