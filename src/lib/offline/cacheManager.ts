/**
 * Cache Manager
 *
 * Handles caching of Care Community tips and images for offline access.
 * Implements size management with FIFO purging when limits are reached.
 */

import type { PublishedTip } from '@/types';
import {
  CACHE_CONFIG,
  STORES,
  type CachedTip,
  type CachedImage,
  type SyncMetadata,
  calculateCacheScore,
} from './offlineTypes';
import {
  tipsStore,
  imagesStore,
  syncMetadataStore,
  getAllItems,
} from './indexedDB';

// ============= Tip Caching =============

/**
 * Convert a PublishedTip to CachedTip format
 */
function tipToCachedTip(tip: PublishedTip, rankingScore: number): CachedTip {
  return {
    tipId: tip.id!,
    title: tip.title,
    content: tip.content,
    summary: tip.summary,
    category: tip.category,
    keywords: tip.keywords,
    authorFirstName: tip.authorFirstName,
    isAnonymous: tip.isAnonymous,
    source: tip.source,
    viewCount: tip.viewCount,
    likeCount: tip.likeCount,
    publishedAt: new Date(tip.publishedAt).toISOString(),
    cachedAt: new Date().toISOString(),
    rankingScore,
    imageUrl: undefined, // Will be set if tip has an image
    hasImageBlob: false,
  };
}

/**
 * Convert a CachedTip back to PublishedTip format
 */
export function cachedTipToPublishedTip(cachedTip: CachedTip): PublishedTip {
  return {
    id: cachedTip.tipId,
    sourceNoteId: '', // Not stored in cache
    sourceUserId: '', // Not stored in cache
    title: cachedTip.title,
    content: cachedTip.content,
    summary: cachedTip.summary,
    category: cachedTip.category,
    keywords: cachedTip.keywords,
    userTags: [], // Not stored in cache
    authorFirstName: cachedTip.authorFirstName,
    isAnonymous: cachedTip.isAnonymous,
    source: cachedTip.source,
    viewCount: cachedTip.viewCount,
    likeCount: cachedTip.likeCount,
    safetyScore: 1, // Not stored in cache
    publishedAt: new Date(cachedTip.publishedAt),
  };
}

/**
 * Calculate the size of a cached tip in bytes (approximate)
 */
function calculateTipSize(tip: CachedTip): number {
  const json = JSON.stringify(tip);
  return new Blob([json]).size;
}

/**
 * Cache tips to IndexedDB
 * Selects top tips by ranking score, respecting cache limits
 */
export async function cacheTips(tips: PublishedTip[]): Promise<{
  success: boolean;
  cachedCount: number;
  error?: string;
}> {
  try {
    // Calculate ranking scores and sort
    const tipsWithScores = tips.map((tip) => ({
      tip,
      score: calculateCacheScore({
        id: tip.id!,
        category: tip.category,
        publishedAt: tip.publishedAt,
        viewCount: tip.viewCount,
        likeCount: tip.likeCount,
      }),
    }));

    // Sort by score descending
    tipsWithScores.sort((a, b) => b.score - a.score);

    // Take top N tips
    const tipsToCache = tipsWithScores.slice(0, CACHE_CONFIG.MAX_TIPS);

    // Convert to cached format
    const cachedTips: CachedTip[] = tipsToCache.map(({ tip, score }) =>
      tipToCachedTip(tip, score)
    );

    // Store in IndexedDB
    const result = await tipsStore.putMany(cachedTips);

    if (result.success) {
      // Update sync metadata
      const totalSize = cachedTips.reduce((sum, tip) => sum + calculateTipSize(tip), 0);
      await updateSyncMetadata('tips', cachedTips.length, totalSize);
    }

    return {
      success: result.success,
      cachedCount: result.data || 0,
      error: result.error,
    };
  } catch (error) {
    console.error('Error caching tips:', error);
    return {
      success: false,
      cachedCount: 0,
      error: String(error),
    };
  }
}

/**
 * Get all cached tips
 */
export async function getCachedTips(): Promise<PublishedTip[]> {
  const result = await tipsStore.getAll();

  if (!result.success || !result.data) {
    return [];
  }

  // Convert to PublishedTip format and sort by ranking score
  return result.data
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .map(cachedTipToPublishedTip);
}

/**
 * Get cached tips by category
 */
export async function getCachedTipsByCategory(category: string): Promise<PublishedTip[]> {
  const result = await tipsStore.getByCategory(category);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .map(cachedTipToPublishedTip);
}

/**
 * Get a single cached tip by ID
 */
export async function getCachedTip(tipId: string): Promise<PublishedTip | null> {
  const result = await tipsStore.get(tipId);

  if (!result.success || !result.data) {
    return null;
  }

  return cachedTipToPublishedTip(result.data);
}

/**
 * Clear all cached tips
 */
export async function clearCachedTips(): Promise<boolean> {
  const result = await tipsStore.clear();
  if (result.success) {
    await syncMetadataStore.delete('tips');
  }
  return result.success;
}

// ============= Image Caching =============

/**
 * Compress an image blob to fit within size limits
 */
async function compressImage(
  blob: Blob,
  maxSizeBytes: number = CACHE_CONFIG.MAX_IMAGE_SIZE_BYTES
): Promise<Blob | null> {
  // If already small enough, return as-is
  if (blob.size <= maxSizeBytes) {
    return blob;
  }

  // Create an image element
  const img = new Image();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate scale factor based on size ratio
      const scaleFactor = Math.sqrt(maxSizeBytes / blob.size) * 0.9; // 90% to be safe
      const newWidth = Math.floor(img.width * scaleFactor);
      const newHeight = Math.floor(img.height * scaleFactor);

      // Create canvas and draw scaled image
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to blob with compression
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob && compressedBlob.size <= maxSizeBytes) {
            resolve(compressedBlob);
          } else if (compressedBlob && compressedBlob.size > maxSizeBytes) {
            // Try again with lower quality
            canvas.toBlob(
              (lowerQualityBlob) => {
                resolve(lowerQualityBlob);
              },
              'image/jpeg',
              0.5
            );
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Fetch and cache an image
 */
export async function cacheImage(imageUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch image: ${response.status}` };
    }

    let blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    // Compress if needed
    if (blob.size > CACHE_CONFIG.MAX_IMAGE_SIZE_BYTES) {
      const compressed = await compressImage(blob);
      if (!compressed) {
        return { success: false, error: 'Failed to compress image' };
      }
      blob = compressed;
    }

    // Store in IndexedDB
    const cachedImage: CachedImage = {
      imageUrl,
      blob,
      mimeType,
      sizeBytes: blob.size,
      cachedAt: new Date().toISOString(),
    };

    const result = await imagesStore.put(cachedImage);
    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('Error caching image:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get a cached image blob
 */
export async function getCachedImage(imageUrl: string): Promise<Blob | null> {
  const result = await imagesStore.get(imageUrl);

  if (!result.success || !result.data) {
    return null;
  }

  return result.data.blob;
}

/**
 * Get a cached image as a data URL
 */
export async function getCachedImageAsDataUrl(imageUrl: string): Promise<string | null> {
  const blob = await getCachedImage(imageUrl);

  if (!blob) {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Clear all cached images
 */
export async function clearCachedImages(): Promise<boolean> {
  const result = await imagesStore.clear();
  if (result.success) {
    await syncMetadataStore.delete('images');
  }
  return result.success;
}

// ============= Cache Size Management =============

/**
 * Get the current total cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  let totalSize = 0;

  // Calculate tips size
  const tipsResult = await tipsStore.getAll();
  if (tipsResult.success && tipsResult.data) {
    totalSize += tipsResult.data.reduce((sum, tip) => sum + calculateTipSize(tip), 0);
  }

  // Calculate images size
  const imagesResult = await imagesStore.getAll();
  if (imagesResult.success && imagesResult.data) {
    totalSize += imagesResult.data.reduce((sum, img) => sum + img.sizeBytes, 0);
  }

  return totalSize;
}

/**
 * Check if adding new content would exceed cache limits
 */
export async function wouldExceedCacheLimit(additionalBytes: number): Promise<boolean> {
  const currentSize = await getCacheSize();
  return currentSize + additionalBytes > CACHE_CONFIG.MAX_CACHE_SIZE_BYTES;
}

/**
 * Purge oldest cached content to free up space (FIFO)
 */
export async function purgeOldestContent(bytesToFree: number): Promise<number> {
  let freedBytes = 0;

  // First, try purging old images
  const imagesResult = await imagesStore.getAll();
  if (imagesResult.success && imagesResult.data && imagesResult.data.length > 0) {
    // Sort by cachedAt (oldest first)
    const sortedImages = [...imagesResult.data].sort(
      (a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime()
    );

    const imagesToDelete: string[] = [];
    for (const image of sortedImages) {
      if (freedBytes >= bytesToFree) break;
      imagesToDelete.push(image.imageUrl);
      freedBytes += image.sizeBytes;
    }

    if (imagesToDelete.length > 0) {
      await imagesStore.deleteMany(imagesToDelete);
    }
  }

  // If still need more space, purge old tips
  if (freedBytes < bytesToFree) {
    const tipsResult = await tipsStore.getAll();
    if (tipsResult.success && tipsResult.data && tipsResult.data.length > 0) {
      // Sort by cachedAt (oldest first)
      const sortedTips = [...tipsResult.data].sort(
        (a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime()
      );

      const tipsToDelete: string[] = [];
      for (const tip of sortedTips) {
        if (freedBytes >= bytesToFree) break;
        tipsToDelete.push(tip.tipId);
        freedBytes += calculateTipSize(tip);
      }

      if (tipsToDelete.length > 0) {
        await tipsStore.deleteMany(tipsToDelete);
      }
    }
  }

  return freedBytes;
}

/**
 * Ensure cache is within size limits
 */
export async function enforceCacheLimits(): Promise<void> {
  const currentSize = await getCacheSize();

  if (currentSize > CACHE_CONFIG.MAX_CACHE_SIZE_BYTES) {
    const bytesToFree = currentSize - CACHE_CONFIG.MAX_CACHE_SIZE_BYTES + (100 * 1024); // Free 100KB extra
    await purgeOldestContent(bytesToFree);
  }

  // Also enforce tip count limit
  const tipsResult = await tipsStore.getAll();
  if (tipsResult.success && tipsResult.data && tipsResult.data.length > CACHE_CONFIG.MAX_TIPS) {
    // Sort by ranking score (lowest first) and delete excess
    const sortedTips = [...tipsResult.data].sort((a, b) => a.rankingScore - b.rankingScore);
    const tipsToDelete = sortedTips
      .slice(0, sortedTips.length - CACHE_CONFIG.MAX_TIPS)
      .map((tip) => tip.tipId);

    if (tipsToDelete.length > 0) {
      await tipsStore.deleteMany(tipsToDelete);
    }
  }
}

// ============= Sync Metadata =============

/**
 * Update sync metadata
 */
async function updateSyncMetadata(
  dataType: 'tips' | 'images',
  itemCount: number,
  totalSizeBytes: number
): Promise<void> {
  const metadata: SyncMetadata = {
    dataType,
    lastSyncTimestamp: new Date().toISOString(),
    itemCount,
    totalSizeBytes,
    lastSyncStatus: 'success',
  };

  await syncMetadataStore.put(metadata);
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(dataType: 'tips' | 'images'): Promise<SyncMetadata | null> {
  const result = await syncMetadataStore.get(dataType);
  return result.success ? result.data || null : null;
}

/**
 * Get last sync time for tips
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const metadata = await getSyncMetadata('tips');
  return metadata ? new Date(metadata.lastSyncTimestamp) : null;
}

/**
 * Check if cache is stale (older than threshold)
 */
export async function isCacheStale(): Promise<boolean> {
  const lastSync = await getLastSyncTime();

  if (!lastSync) {
    return true; // No cache = stale
  }

  const hoursAgo = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  return hoursAgo > CACHE_CONFIG.STALE_THRESHOLD_HOURS;
}

// ============= Full Cache Operations =============

/**
 * Clear all offline cache data
 */
export async function clearAllCache(): Promise<boolean> {
  const [tipsCleared, imagesCleared, metadataCleared] = await Promise.all([
    tipsStore.clear(),
    imagesStore.clear(),
    syncMetadataStore.clear(),
  ]);

  return tipsCleared.success && imagesCleared.success && metadataCleared.success;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  tipsCount: number;
  imagesCount: number;
  totalSizeBytes: number;
  lastSyncTime: Date | null;
  isStale: boolean;
}> {
  const [tipsCount, imagesCount, totalSize, lastSync, stale] = await Promise.all([
    tipsStore.count(),
    imagesStore.count(),
    getCacheSize(),
    getLastSyncTime(),
    isCacheStale(),
  ]);

  return {
    tipsCount: tipsCount.data || 0,
    imagesCount: imagesCount.data || 0,
    totalSizeBytes: totalSize,
    lastSyncTime: lastSync,
    isStale: stale,
  };
}
