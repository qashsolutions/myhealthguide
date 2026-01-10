/**
 * Sync Manager
 *
 * Handles online/offline detection and background synchronization
 * of Care Community content for offline access.
 */

import type { PublishedTip } from '@/types';
import {
  CACHE_CONFIG,
  type SyncEvent,
  type SyncEventType,
  type OfflineStatus,
} from './offlineTypes';
import {
  cacheTips,
  getCachedTips,
  getCacheStats,
  isCacheStale,
  enforceCacheLimits,
  clearAllCache,
} from './cacheManager';
import { initializeDB } from './indexedDB';

// ============= State =============

let isInitialized = false;
let isSyncing = false;
let syncTimeout: NodeJS.Timeout | null = null;
const eventListeners: Set<(event: SyncEvent) => void> = new Set();

// ============= Event Handling =============

/**
 * Subscribe to sync events
 */
export function onSyncEvent(callback: (event: SyncEvent) => void): () => void {
  eventListeners.add(callback);
  return () => eventListeners.delete(callback);
}

/**
 * Emit a sync event
 */
function emitEvent(type: SyncEventType, details?: Record<string, unknown>): void {
  const event: SyncEvent = {
    type,
    timestamp: new Date(),
    details,
  };

  eventListeners.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error('Error in sync event listener:', error);
    }
  });
}

// ============= Online/Offline Detection =============

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Handle online event
 */
function handleOnline(): void {
  emitEvent('online');

  // Debounce sync to avoid rapid reconnects
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncCommunityContent();
  }, CACHE_CONFIG.SYNC_DEBOUNCE_MS);
}

/**
 * Handle offline event
 */
function handleOffline(): void {
  emitEvent('offline');

  // Cancel any pending sync
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

// ============= Initialization =============

/**
 * Initialize the sync manager
 */
export async function initializeSyncManager(): Promise<boolean> {
  if (isInitialized) return true;
  if (typeof window === 'undefined') return false;

  try {
    // Initialize IndexedDB
    const dbResult = await initializeDB();
    if (!dbResult.success) {
      console.error('Failed to initialize IndexedDB:', dbResult.error);
      return false;
    }

    // Set up online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    isInitialized = true;

    // Initial sync if online
    if (isOnline()) {
      // Don't await - let it run in background
      syncCommunityContent();
    }

    return true;
  } catch (error) {
    console.error('Error initializing sync manager:', error);
    return false;
  }
}

/**
 * Cleanup sync manager
 */
export function cleanupSyncManager(): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  eventListeners.clear();
  isInitialized = false;
}

// ============= Sync Operations =============

/**
 * Fetch tips from API
 */
async function fetchTipsFromAPI(): Promise<PublishedTip[]> {
  const response = await fetch('/api/tips?limit=200&sortBy=date');

  if (!response.ok) {
    throw new Error(`Failed to fetch tips: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch tips');
  }

  return data.tips;
}

/**
 * Sync community content from server
 */
export async function syncCommunityContent(): Promise<{
  success: boolean;
  cachedCount: number;
  error?: string;
}> {
  if (isSyncing) {
    return { success: false, cachedCount: 0, error: 'Sync already in progress' };
  }

  if (!isOnline()) {
    return { success: false, cachedCount: 0, error: 'Offline' };
  }

  isSyncing = true;
  emitEvent('sync_started');

  try {
    // Fetch fresh tips from API
    const tips = await fetchTipsFromAPI();

    // Cache tips
    const result = await cacheTips(tips);

    // Enforce cache limits
    await enforceCacheLimits();

    emitEvent('sync_completed', {
      cachedCount: result.cachedCount,
      totalTips: tips.length,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sync error:', errorMessage);

    emitEvent('sync_failed', { error: errorMessage });

    return {
      success: false,
      cachedCount: 0,
      error: errorMessage,
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Force a fresh sync (clears cache first)
 */
export async function forceFreshSync(): Promise<{
  success: boolean;
  cachedCount: number;
  error?: string;
}> {
  await clearAllCache();
  emitEvent('cache_cleared');
  return syncCommunityContent();
}

/**
 * Sync if cache is stale
 */
export async function syncIfStale(): Promise<boolean> {
  const stale = await isCacheStale();

  if (stale && isOnline()) {
    const result = await syncCommunityContent();
    return result.success;
  }

  return !stale;
}

// ============= Data Access =============

/**
 * Get tips - from cache if offline, from server if online
 */
export async function getTips(): Promise<{
  tips: PublishedTip[];
  fromCache: boolean;
  error?: string;
}> {
  // Initialize if needed
  if (!isInitialized) {
    await initializeSyncManager();
  }

  // If offline, return cached tips
  if (!isOnline()) {
    const cachedTips = await getCachedTips();
    return {
      tips: cachedTips,
      fromCache: true,
    };
  }

  // If online, try to fetch fresh data
  try {
    const tips = await fetchTipsFromAPI();

    // Cache in background (don't await)
    cacheTips(tips).catch(console.error);

    return {
      tips,
      fromCache: false,
    };
  } catch (error) {
    // Fallback to cache on error
    const cachedTips = await getCachedTips();
    return {
      tips: cachedTips,
      fromCache: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============= Status =============

/**
 * Get current offline status
 */
export async function getOfflineStatus(): Promise<OfflineStatus> {
  const stats = await getCacheStats();

  return {
    isOnline: isOnline(),
    isInitialized,
    lastSyncTime: stats.lastSyncTime,
    cachedTipsCount: stats.tipsCount,
    cacheSize: stats.totalSizeBytes,
    isSyncing,
    error: null,
  };
}

/**
 * Check if sync manager is ready
 */
export function isSyncManagerReady(): boolean {
  return isInitialized;
}

/**
 * Check if currently syncing
 */
export function isCurrentlySyncing(): boolean {
  return isSyncing;
}

// ============= Utility =============

/**
 * Format cache size for display
 */
export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format last sync time for display
 */
export function formatLastSync(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}
