/**
 * IndexedDB Wrapper Utilities
 *
 * Generic IndexedDB wrapper for offline data storage.
 * Provides type-safe CRUD operations with error handling.
 */

import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  STORES,
  type CachedTip,
  type CachedImage,
  type SyncMetadata,
  type DBOperationResult,
  type QueuedOperation,
} from './offlineTypes';

// ============= Database Instance =============

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

// ============= Database Initialization =============

/**
 * Initialize the IndexedDB database
 */
export async function initializeDB(): Promise<DBOperationResult<IDBDatabase>> {
  // Return existing instance if available
  if (dbInstance) {
    return { success: true, data: dbInstance };
  }

  // Return existing promise if initialization is in progress
  if (dbInitPromise) {
    try {
      const db = await dbInitPromise;
      return { success: true, data: db };
    } catch (error) {
      dbInitPromise = null;
      return { success: false, error: String(error) };
    }
  }

  // Check if IndexedDB is available
  if (typeof window === 'undefined' || !window.indexedDB) {
    return { success: false, error: 'IndexedDB is not available' };
  }

  dbInitPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle database connection errors
      dbInstance.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };

      // Handle version change (e.g., another tab upgraded the DB)
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbInitPromise = null;
        console.warn('IndexedDB version changed, connection closed');
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create communityTips store
      if (!db.objectStoreNames.contains(STORES.COMMUNITY_TIPS)) {
        const tipsStore = db.createObjectStore(STORES.COMMUNITY_TIPS, { keyPath: 'tipId' });
        tipsStore.createIndex('category', 'category', { unique: false });
        tipsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        tipsStore.createIndex('rankingScore', 'rankingScore', { unique: false });
      }

      // Create syncMetadata store
      if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
        db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'dataType' });
      }

      // Create cachedImages store
      if (!db.objectStoreNames.contains(STORES.CACHED_IMAGES)) {
        const imagesStore = db.createObjectStore(STORES.CACHED_IMAGES, { keyPath: 'imageUrl' });
        imagesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Create syncQueue store (for offline write operations)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('priority', 'priority', { unique: false });
        queueStore.createIndex('queuedAt', 'queuedAt', { unique: false });
        queueStore.createIndex('operationType', 'operationType', { unique: false });
      }
    };
  });

  try {
    const db = await dbInitPromise;
    return { success: true, data: db };
  } catch (error) {
    dbInitPromise = null;
    return { success: false, error: String(error) };
  }
}

/**
 * Get the database instance (initializes if needed)
 */
export async function getDB(): Promise<IDBDatabase | null> {
  const result = await initializeDB();
  return result.success ? result.data! : null;
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbInitPromise = null;
  }
}

// ============= Generic CRUD Operations =============

/**
 * Add or update an item in a store
 */
export async function putItem<T>(
  storeName: string,
  item: T
): Promise<DBOperationResult> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('IndexedDB put error:', request.error);
        resolve({ success: false, error: String(request.error) });
      };

      transaction.onerror = () => {
        console.error('IndexedDB transaction error:', transaction.error);
        resolve({ success: false, error: String(transaction.error) });
      };
    } catch (error) {
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Add or update multiple items in a store
 */
export async function putItems<T>(
  storeName: string,
  items: T[]
): Promise<DBOperationResult<number>> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      let successCount = 0;

      items.forEach((item) => {
        const request = store.put(item);
        request.onsuccess = () => {
          successCount++;
        };
      });

      transaction.oncomplete = () => {
        resolve({ success: true, data: successCount });
      };

      transaction.onerror = () => {
        console.error('IndexedDB batch put error:', transaction.error);
        resolve({ success: false, error: String(transaction.error), data: successCount });
      };
    } catch (error) {
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Get an item by key
 */
export async function getItem<T>(
  storeName: string,
  key: string
): Promise<DBOperationResult<T | undefined>> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve({ success: true, data: request.result });
      };

      request.onerror = () => {
        console.error('IndexedDB get error:', request.error);
        resolve({ success: false, error: String(request.error) });
      };
    } catch (error) {
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Get all items from a store
 */
export async function getAllItems<T>(
  storeName: string
): Promise<DBOperationResult<T[]>> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve({ success: true, data: request.result || [] });
      };

      request.onerror = () => {
        console.error('IndexedDB getAll error:', request.error);
        resolve({ success: false, error: String(request.error), data: [] });
      };
    } catch (error) {
      resolve({ success: false, error: String(error), data: [] });
    }
  });
}

/**
 * Get items by index
 */
export async function getItemsByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<DBOperationResult<T[]>> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        resolve({ success: true, data: request.result || [] });
      };

      request.onerror = () => {
        console.error('IndexedDB getByIndex error:', request.error);
        resolve({ success: false, error: String(request.error), data: [] });
      };
    } catch (error) {
      resolve({ success: false, error: String(error), data: [] });
    }
  });
}

/**
 * Delete an item by key
 */
export async function deleteItem(
  storeName: string,
  key: string
): Promise<DBOperationResult> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('IndexedDB delete error:', request.error);
        resolve({ success: false, error: String(request.error) });
      };
    } catch (error) {
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Delete multiple items by keys
 */
export async function deleteItems(
  storeName: string,
  keys: string[]
): Promise<DBOperationResult<number>> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      let successCount = 0;

      keys.forEach((key) => {
        const request = store.delete(key);
        request.onsuccess = () => {
          successCount++;
        };
      });

      transaction.oncomplete = () => {
        resolve({ success: true, data: successCount });
      };

      transaction.onerror = () => {
        console.error('IndexedDB batch delete error:', transaction.error);
        resolve({ success: false, error: String(transaction.error), data: successCount });
      };
    } catch (error) {
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<DBOperationResult> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        console.error('IndexedDB clear error:', request.error);
        resolve({ success: false, error: String(request.error) });
      };
    } catch (error) {
      resolve({ success: false, error: String(error) });
    }
  });
}

/**
 * Count items in a store
 */
export async function countItems(storeName: string): Promise<DBOperationResult<number>> {
  const db = await getDB();
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve({ success: true, data: request.result });
      };

      request.onerror = () => {
        console.error('IndexedDB count error:', request.error);
        resolve({ success: false, error: String(request.error), data: 0 });
      };
    } catch (error) {
      resolve({ success: false, error: String(error), data: 0 });
    }
  });
}

// ============= Typed Store Operations =============

/**
 * Tips store operations
 */
export const tipsStore = {
  put: (tip: CachedTip) => putItem<CachedTip>(STORES.COMMUNITY_TIPS, tip),
  putMany: (tips: CachedTip[]) => putItems<CachedTip>(STORES.COMMUNITY_TIPS, tips),
  get: (tipId: string) => getItem<CachedTip>(STORES.COMMUNITY_TIPS, tipId),
  getAll: () => getAllItems<CachedTip>(STORES.COMMUNITY_TIPS),
  getByCategory: (category: string) =>
    getItemsByIndex<CachedTip>(STORES.COMMUNITY_TIPS, 'category', category),
  delete: (tipId: string) => deleteItem(STORES.COMMUNITY_TIPS, tipId),
  deleteMany: (tipIds: string[]) => deleteItems(STORES.COMMUNITY_TIPS, tipIds),
  clear: () => clearStore(STORES.COMMUNITY_TIPS),
  count: () => countItems(STORES.COMMUNITY_TIPS),
};

/**
 * Images store operations
 */
export const imagesStore = {
  put: (image: CachedImage) => putItem<CachedImage>(STORES.CACHED_IMAGES, image),
  putMany: (images: CachedImage[]) => putItems<CachedImage>(STORES.CACHED_IMAGES, images),
  get: (imageUrl: string) => getItem<CachedImage>(STORES.CACHED_IMAGES, imageUrl),
  getAll: () => getAllItems<CachedImage>(STORES.CACHED_IMAGES),
  delete: (imageUrl: string) => deleteItem(STORES.CACHED_IMAGES, imageUrl),
  deleteMany: (imageUrls: string[]) => deleteItems(STORES.CACHED_IMAGES, imageUrls),
  clear: () => clearStore(STORES.CACHED_IMAGES),
  count: () => countItems(STORES.CACHED_IMAGES),
};

/**
 * Sync metadata store operations
 */
export const syncMetadataStore = {
  put: (metadata: SyncMetadata) => putItem<SyncMetadata>(STORES.SYNC_METADATA, metadata),
  get: (dataType: 'tips' | 'images') => getItem<SyncMetadata>(STORES.SYNC_METADATA, dataType),
  getAll: () => getAllItems<SyncMetadata>(STORES.SYNC_METADATA),
  delete: (dataType: 'tips' | 'images') => deleteItem(STORES.SYNC_METADATA, dataType),
  clear: () => clearStore(STORES.SYNC_METADATA),
};

/**
 * Sync queue store operations (for offline write operations)
 */
export const syncQueueStore = {
  put: (item: QueuedOperation) => putItem<QueuedOperation>(STORES.SYNC_QUEUE, item),
  putMany: (items: QueuedOperation[]) => putItems<QueuedOperation>(STORES.SYNC_QUEUE, items),
  get: (id: string) => getItem<QueuedOperation>(STORES.SYNC_QUEUE, id),
  getAll: () => getAllItems<QueuedOperation>(STORES.SYNC_QUEUE),
  getByStatus: (status: string) =>
    getItemsByIndex<QueuedOperation>(STORES.SYNC_QUEUE, 'status', status),
  getByPriority: (priority: string) =>
    getItemsByIndex<QueuedOperation>(STORES.SYNC_QUEUE, 'priority', priority),
  getByType: (operationType: string) =>
    getItemsByIndex<QueuedOperation>(STORES.SYNC_QUEUE, 'operationType', operationType),
  delete: (id: string) => deleteItem(STORES.SYNC_QUEUE, id),
  deleteMany: (ids: string[]) => deleteItems(STORES.SYNC_QUEUE, ids),
  clear: () => clearStore(STORES.SYNC_QUEUE),
  count: () => countItems(STORES.SYNC_QUEUE),
};
