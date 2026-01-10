/**
 * Offline Module Exports
 *
 * Central export point for all offline caching functionality.
 */

// Types
export * from './offlineTypes';

// IndexedDB operations
export {
  initializeDB,
  getDB,
  closeDB,
  tipsStore,
  imagesStore,
  syncMetadataStore,
  syncQueueStore,
} from './indexedDB';

// Cache management
export {
  cacheTips,
  getCachedTips,
  getCachedTipsByCategory,
  getCachedTip,
  clearCachedTips,
  cacheImage,
  getCachedImage,
  getCachedImageAsDataUrl,
  clearCachedImages,
  getCacheSize,
  wouldExceedCacheLimit,
  purgeOldestContent,
  enforceCacheLimits,
  getSyncMetadata,
  getLastSyncTime,
  isCacheStale,
  clearAllCache,
  getCacheStats,
  cachedTipToPublishedTip,
} from './cacheManager';

// Sync management
export {
  initializeSyncManager,
  cleanupSyncManager,
  onSyncEvent,
  isOnline,
  syncCommunityContent,
  forceFreshSync,
  syncIfStale,
  getTips,
  getOfflineStatus,
  isSyncManagerReady,
  isCurrentlySyncing,
  formatCacheSize,
  formatLastSync,
} from './syncManager';

// Legacy offline utils (for backwards compatibility)
export {
  isOnline as isOnlineSimple,
  isOfflineError,
  getOfflineErrorMessage,
  executeIfOnline,
  offlineSafeFetch,
} from './offlineUtils';

// Offline sync service (for write operations queue)
export {
  initializeOfflineSync,
  cleanupOfflineSync,
  queueOperation,
  getPendingOperations,
  getQueueStatus,
  processQueue,
  registerOperationHandler,
  onQueueStatusChange,
  hasPendingOperations,
  clearFailedOperations,
  retryFailedOperations,
  isOnlineNow,
  formatPendingMessage,
} from './offlineSyncService';

// Offline-aware service wrappers
export {
  initializeOfflineAwareServices,
  logMedicationDoseOfflineAware,
  logSupplementIntakeOfflineAware,
  createDietEntryOfflineAware,
  type OfflineOperationResult,
} from './offlineAwareServices';
