/**
 * useSyncQueue Hook
 *
 * React hook for accessing the offline sync queue status.
 * Provides real-time updates on pending operations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type SyncQueueStatus,
  initializeOfflineSync,
  onQueueStatusChange,
  getQueueStatus,
  processQueue,
  clearFailedOperations,
  retryFailedOperations,
  isOnlineNow,
  formatPendingMessage,
} from '@/lib/offline';

export interface UseSyncQueueReturn {
  /** Current queue status */
  status: SyncQueueStatus;
  /** Whether the sync system is initialized */
  isInitialized: boolean;
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Formatted message about pending operations */
  pendingMessage: string;
  /** Force process the queue now */
  syncNow: () => Promise<void>;
  /** Clear all failed operations */
  clearFailed: () => Promise<void>;
  /** Retry all failed operations */
  retryFailed: () => Promise<void>;
}

const DEFAULT_STATUS: SyncQueueStatus = {
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  oldestPendingAt: null,
  lastSyncAt: null,
  pendingByType: {
    medication_log: 0,
    supplement_log: 0,
    diet_log: 0,
    note_create: 0,
    activity_log: 0,
  },
};

/**
 * Hook to access sync queue status and actions.
 */
export function useSyncQueue(): UseSyncQueueReturn {
  const [status, setStatus] = useState<SyncQueueStatus>(DEFAULT_STATUS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Initialize and subscribe to updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initialize = async () => {
      try {
        await initializeOfflineSync();
        setIsInitialized(true);

        // Get initial status
        const initialStatus = await getQueueStatus();
        setStatus(initialStatus);

        // Subscribe to updates
        unsubscribe = onQueueStatusChange((newStatus) => {
          setStatus(newStatus);
        });
      } catch (error) {
        console.error('[useSyncQueue] Error initializing:', error);
      }
    };

    initialize();

    // Track online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      unsubscribe?.();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (isOnlineNow()) {
      await processQueue();
    }
  }, []);

  const clearFailed = useCallback(async () => {
    await clearFailedOperations();
  }, []);

  const retryFailed = useCallback(async () => {
    await retryFailedOperations();
  }, []);

  const pendingMessage = formatPendingMessage(status);

  return {
    status,
    isInitialized,
    isOnline,
    pendingMessage,
    syncNow,
    clearFailed,
    retryFailed,
  };
}
