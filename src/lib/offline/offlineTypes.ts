/**
 * Offline Caching Types
 *
 * TypeScript interfaces for the Care Community offline caching system.
 * Uses IndexedDB for structured data storage.
 */

import type { CaregiverNoteCategory, NoteSourceCitation } from '@/types';

// ============= IndexedDB Schema =============

export const OFFLINE_DB_NAME = 'myhealthguide_offline';
export const OFFLINE_DB_VERSION = 2; // Bumped for syncQueue store

// Object store names
export const STORES = {
  COMMUNITY_TIPS: 'communityTips',
  SYNC_METADATA: 'syncMetadata',
  CACHED_IMAGES: 'cachedImages',
  SYNC_QUEUE: 'syncQueue', // For offline write operations queue
} as const;

// ============= Cached Tip Interface =============

export interface CachedTip {
  tipId: string;
  title: string;
  content: string;
  summary: string;
  category: CaregiverNoteCategory;
  keywords: string[];
  authorFirstName?: string;
  isAnonymous: boolean;
  source?: NoteSourceCitation;
  viewCount: number;
  likeCount: number;
  publishedAt: string; // ISO string for IndexedDB compatibility
  // Caching metadata
  cachedAt: string; // ISO string
  rankingScore: number; // Pre-calculated for offline sorting
  imageUrl?: string;
  hasImageBlob: boolean;
}

// ============= Cached Image Interface =============

export interface CachedImage {
  imageUrl: string; // Primary key
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  cachedAt: string; // ISO string
}

// ============= Sync Metadata Interface =============

export interface SyncMetadata {
  dataType: 'tips' | 'images';
  lastSyncTimestamp: string; // ISO string
  itemCount: number;
  totalSizeBytes: number;
  lastSyncStatus: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

// ============= Cache Configuration =============

export const CACHE_CONFIG = {
  MAX_TIPS: 50,
  MAX_CACHE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE_BYTES: 100 * 1024, // 100KB per image
  SYNC_DEBOUNCE_MS: 5000, // Wait 5s after coming online before syncing
  STALE_THRESHOLD_HOURS: 24, // Consider cache stale after 24 hours
} as const;

// ============= Offline Status Interface =============

export interface OfflineStatus {
  isOnline: boolean;
  isInitialized: boolean;
  lastSyncTime: Date | null;
  cachedTipsCount: number;
  cacheSize: number;
  isSyncing: boolean;
  error: string | null;
}

// ============= Sync Event Types =============

export type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'cache_updated'
  | 'cache_cleared'
  | 'online'
  | 'offline';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// ============= IndexedDB Operation Result =============

export interface DBOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============= Tip Ranking for Cache Selection =============

export interface TipForCaching {
  id: string;
  category: CaregiverNoteCategory;
  publishedAt: Date | string;
  viewCount: number;
  likeCount: number;
}

/**
 * Calculate a score for determining which tips to cache.
 * Higher scores = higher priority for caching.
 * Combines: views + likes + recency
 */
export function calculateCacheScore(tip: TipForCaching): number {
  const viewScore = tip.viewCount * 1;
  const likeScore = tip.likeCount * 2; // Likes worth more than views

  // Recency: newer tips get a boost (decays over 30 days)
  const publishedDate = new Date(tip.publishedAt);
  const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 100 - daysSincePublished * 3);

  return viewScore + likeScore + recencyScore;
}

// ============= Offline Sync Queue Types =============

/**
 * Supported operations for offline sync queue.
 * These are the write operations that can be queued when offline.
 */
export type QueuedOperationType =
  | 'medication_log'
  | 'supplement_log'
  | 'diet_log'
  | 'note_create'
  | 'activity_log';

/**
 * Priority levels for queued operations.
 * Higher priority items are synced first.
 */
export type QueuePriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Status of a queued operation.
 */
export type QueueItemStatus = 'pending' | 'syncing' | 'completed' | 'failed';

/**
 * A queued operation waiting to be synced.
 */
export interface QueuedOperation {
  /** Unique ID for this queue item */
  id: string;
  /** Type of operation (medication_log, supplement_log, etc.) */
  operationType: QueuedOperationType;
  /** The data payload to be sent when syncing */
  payload: Record<string, unknown>;
  /** Priority for sync ordering */
  priority: QueuePriority;
  /** Current status */
  status: QueueItemStatus;
  /** When the operation was queued */
  queuedAt: string; // ISO string
  /** Number of sync attempts */
  attemptCount: number;
  /** Last error message if failed */
  lastError?: string;
  /** When last sync was attempted */
  lastAttemptAt?: string; // ISO string
  /** User ID who created this operation */
  userId: string;
  /** Group ID for the operation */
  groupId: string;
  /** Elder ID for the operation */
  elderId: string;
}

/**
 * Configuration for the sync queue.
 */
export const SYNC_QUEUE_CONFIG = {
  /** Maximum number of items in the queue */
  MAX_QUEUE_SIZE: 100,
  /** Maximum retry attempts before giving up */
  MAX_RETRY_ATTEMPTS: 5,
  /** Delay between retries in ms (exponential backoff base) */
  RETRY_DELAY_BASE_MS: 1000,
  /** Delay after coming online before starting sync */
  SYNC_DELAY_MS: 2000,
  /** Interval for checking queue when online */
  SYNC_CHECK_INTERVAL_MS: 30000, // 30 seconds
} as const;

/**
 * Store name for the sync queue in IndexedDB.
 */
export const SYNC_QUEUE_STORE = 'syncQueue';

/**
 * Priority order for syncing (lower index = higher priority).
 */
export const PRIORITY_ORDER: QueuePriority[] = ['critical', 'high', 'medium', 'low'];

/**
 * Get priority for an operation type.
 */
export function getOperationPriority(operationType: QueuedOperationType): QueuePriority {
  switch (operationType) {
    case 'medication_log':
    case 'supplement_log':
      return 'critical'; // Health-related, most important
    case 'diet_log':
    case 'note_create':
      return 'high';
    case 'activity_log':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Sync queue status for UI display.
 */
export interface SyncQueueStatus {
  /** Number of pending items */
  pendingCount: number;
  /** Number of failed items */
  failedCount: number;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Oldest pending item timestamp */
  oldestPendingAt: Date | null;
  /** Last successful sync */
  lastSyncAt: Date | null;
  /** Items by type for display */
  pendingByType: Record<QueuedOperationType, number>;
}
