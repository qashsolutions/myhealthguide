/**
 * useCachedCommunity Hook
 *
 * React hook for accessing cached community tips with automatic
 * fallback to cache when offline.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PublishedTip } from '@/types';
import {
  initializeSyncManager,
  getTips,
  syncCommunityContent,
  isOnline,
} from '@/lib/offline/syncManager';
import { getCachedTips, getLastSyncTime } from '@/lib/offline/cacheManager';

export interface UseCachedCommunityReturn {
  /** The tips data (from server or cache) */
  tips: PublishedTip[];
  /** Whether data is being loaded */
  loading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Whether data is from cache (offline mode) */
  isFromCache: boolean;
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Last time content was synced */
  lastSyncTime: Date | null;
  /** Refresh tips (fetches from server if online, otherwise returns cache) */
  refresh: () => Promise<void>;
  /** Force sync from server (only works if online) */
  forceSync: () => Promise<void>;
}

export interface UseCachedCommunityOptions {
  /** Category to filter tips (optional) */
  category?: string;
  /** Maximum number of tips to return */
  limit?: number;
  /** Whether to auto-load on mount (default: true) */
  autoLoad?: boolean;
}

/**
 * Hook to access community tips with offline support
 */
export function useCachedCommunity(
  options: UseCachedCommunityOptions = {}
): UseCachedCommunityReturn {
  const { category, limit, autoLoad = true } = options;

  const [tips, setTips] = useState<PublishedTip[]>([]);
  const [loading, setLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [online, setOnline] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load tips
  const loadTips = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize sync manager if needed
      await initializeSyncManager();

      // Get tips (from server if online, cache if offline)
      const result = await getTips();

      setTips(result.tips);
      setIsFromCache(result.fromCache);
      setOnline(isOnline());

      if (result.error && result.fromCache) {
        // We got cached data but there was an error fetching fresh data
        setError(`Using cached data: ${result.error}`);
      }

      // Update last sync time
      const syncTime = await getLastSyncTime();
      setLastSyncTime(syncTime);
    } catch (err) {
      console.error('Error loading tips:', err);
      setError(err instanceof Error ? err.message : String(err));

      // Try to load from cache as fallback
      try {
        const cachedTips = await getCachedTips();
        if (cachedTips.length > 0) {
          setTips(cachedTips);
          setIsFromCache(true);
        }
      } catch (cacheErr) {
        console.error('Error loading from cache:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Force sync from server
  const forceSync = useCallback(async () => {
    if (!isOnline()) {
      setError('Cannot sync while offline');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await syncCommunityContent();
      await loadTips();
    } catch (err) {
      console.error('Error syncing:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loadTips]);

  // Filter and limit tips
  const filteredTips = useMemo(() => {
    let result = [...tips];

    // Filter by category if specified
    if (category) {
      result = result.filter((tip) => tip.category === category);
    }

    // Limit results if specified
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }, [tips, category, limit]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadTips();
    }
  }, [autoLoad, loadTips]);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Refresh when coming back online
      loadTips();
    };

    const handleOffline = () => {
      setOnline(false);
      setIsFromCache(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadTips]);

  return {
    tips: filteredTips,
    loading,
    error,
    isFromCache,
    isOnline: online,
    lastSyncTime,
    refresh: loadTips,
    forceSync,
  };
}

/**
 * Hook to get a single tip with offline support
 */
export function useCachedTip(tipId: string | null): {
  tip: PublishedTip | null;
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
} {
  const [tip, setTip] = useState<PublishedTip | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tipId);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);

  useEffect(() => {
    if (!tipId) {
      setTip(null);
      setLoading(false);
      return;
    }

    const loadTip = async () => {
      setLoading(true);
      setError(null);

      try {
        await initializeSyncManager();

        // Try to get all tips and find the one we need
        const result = await getTips();
        const foundTip = result.tips.find((t) => t.id === tipId);

        if (foundTip) {
          setTip(foundTip);
          setIsFromCache(result.fromCache);
        } else {
          setError('Tip not found');
          setTip(null);
        }
      } catch (err) {
        console.error('Error loading tip:', err);
        setError(err instanceof Error ? err.message : String(err));

        // Try cache as fallback
        try {
          const cachedTips = await getCachedTips();
          const cachedTip = cachedTips.find((t) => t.id === tipId);
          if (cachedTip) {
            setTip(cachedTip);
            setIsFromCache(true);
          }
        } catch (cacheErr) {
          console.error('Error loading tip from cache:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTip();
  }, [tipId]);

  return { tip, loading, error, isFromCache };
}
