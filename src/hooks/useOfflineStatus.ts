/**
 * useOfflineStatus Hook
 *
 * React hook for tracking online/offline status and sync state.
 * Provides real-time updates when connectivity changes.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OfflineStatus, SyncEvent } from '@/lib/offline/offlineTypes';
import {
  initializeSyncManager,
  cleanupSyncManager,
  onSyncEvent,
  getOfflineStatus,
  isOnline as checkIsOnline,
  syncCommunityContent,
  forceFreshSync,
} from '@/lib/offline/syncManager';

export interface UseOfflineStatusReturn {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether the sync manager has been initialized */
  isInitialized: boolean;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** The last time content was synced */
  lastSyncTime: Date | null;
  /** Number of tips currently cached */
  cachedTipsCount: number;
  /** Total cache size in bytes */
  cacheSize: number;
  /** Any error message */
  error: string | null;
  /** Trigger a manual sync */
  sync: () => Promise<void>;
  /** Force a fresh sync (clears cache first) */
  forceSync: () => Promise<void>;
  /** Refresh the status */
  refreshStatus: () => Promise<void>;
}

/**
 * Hook to track offline status and manage sync
 */
export function useOfflineStatus(): UseOfflineStatusReturn {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isInitialized: false,
    lastSyncTime: null,
    cachedTipsCount: 0,
    cacheSize: 0,
    isSyncing: false,
    error: null,
  });

  // Refresh status from sync manager
  const refreshStatus = useCallback(async () => {
    try {
      const newStatus = await getOfflineStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Error refreshing offline status:', error);
    }
  }, []);

  // Manual sync trigger
  const sync = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const result = await syncCommunityContent();
      if (!result.success && result.error) {
        setStatus((prev) => ({ ...prev, error: result.error || null }));
      }
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      await refreshStatus();
    }
  }, [refreshStatus]);

  // Force fresh sync
  const forceSync = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const result = await forceFreshSync();
      if (!result.success && result.error) {
        setStatus((prev) => ({ ...prev, error: result.error || null }));
      }
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      await refreshStatus();
    }
  }, [refreshStatus]);

  // Initialize sync manager and set up event listeners
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await initializeSyncManager();
      if (mounted) {
        await refreshStatus();
      }
    };

    init();

    // Listen for sync events
    const unsubscribe = onSyncEvent((event: SyncEvent) => {
      if (!mounted) return;

      switch (event.type) {
        case 'online':
          setStatus((prev) => ({ ...prev, isOnline: true }));
          break;
        case 'offline':
          setStatus((prev) => ({ ...prev, isOnline: false }));
          break;
        case 'sync_started':
          setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
          break;
        case 'sync_completed':
          refreshStatus();
          break;
        case 'sync_failed':
          setStatus((prev) => ({
            ...prev,
            isSyncing: false,
            error: event.details?.error as string || 'Sync failed',
          }));
          break;
        case 'cache_updated':
        case 'cache_cleared':
          refreshStatus();
          break;
      }
    });

    // Listen for native online/offline events
    const handleOnline = () => {
      if (mounted) {
        setStatus((prev) => ({ ...prev, isOnline: true }));
      }
    };

    const handleOffline = () => {
      if (mounted) {
        setStatus((prev) => ({ ...prev, isOnline: false }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshStatus]);

  return {
    isOnline: status.isOnline,
    isInitialized: status.isInitialized,
    isSyncing: status.isSyncing,
    lastSyncTime: status.lastSyncTime,
    cachedTipsCount: status.cachedTipsCount,
    cacheSize: status.cacheSize,
    error: status.error,
    sync,
    forceSync,
    refreshStatus,
  };
}

/**
 * Simple hook that just returns online/offline status
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
