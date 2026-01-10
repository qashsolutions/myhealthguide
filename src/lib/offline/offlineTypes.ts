/**
 * Offline Caching Types
 *
 * TypeScript interfaces for the Care Community offline caching system.
 * Uses IndexedDB for structured data storage.
 */

import type { CaregiverNoteCategory, NoteSourceCitation } from '@/types';

// ============= IndexedDB Schema =============

export const OFFLINE_DB_NAME = 'myhealthguide_offline';
export const OFFLINE_DB_VERSION = 1;

// Object store names
export const STORES = {
  COMMUNITY_TIPS: 'communityTips',
  SYNC_METADATA: 'syncMetadata',
  CACHED_IMAGES: 'cachedImages',
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
