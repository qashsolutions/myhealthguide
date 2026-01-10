/**
 * Offline Sync Service
 *
 * Handles queueing write operations when offline and syncing them when back online.
 * Prevents data loss for critical health-related logging operations.
 */

'use client';

import { syncQueueStore, initializeDB } from './indexedDB';
import {
  type QueuedOperation,
  type QueuedOperationType,
  type QueuePriority,
  type SyncQueueStatus,
  SYNC_QUEUE_CONFIG,
  PRIORITY_ORDER,
  getOperationPriority,
} from './offlineTypes';

// ============= State =============

let isInitialized = false;
let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;
let lastSyncAt: Date | null = null;

// Event listeners
type SyncEventListener = (status: SyncQueueStatus) => void;
const listeners: Set<SyncEventListener> = new Set();

// ============= Initialization =============

/**
 * Initialize the offline sync service.
 * Sets up online/offline event listeners and starts sync interval.
 */
export async function initializeOfflineSync(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  // Initialize IndexedDB
  await initializeDB();

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Start sync interval if online
  if (navigator.onLine) {
    startSyncInterval();
  }

  isInitialized = true;
  console.log('[OfflineSync] Initialized');

  // Process any pending items if online
  if (navigator.onLine) {
    setTimeout(() => processQueue(), SYNC_QUEUE_CONFIG.SYNC_DELAY_MS);
  }
}

/**
 * Cleanup the offline sync service.
 */
export function cleanupOfflineSync(): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  stopSyncInterval();
  isInitialized = false;
}

// ============= Event Handlers =============

function handleOnline(): void {
  console.log('[OfflineSync] Back online, starting sync...');
  startSyncInterval();
  // Delay sync to let connection stabilize
  setTimeout(() => processQueue(), SYNC_QUEUE_CONFIG.SYNC_DELAY_MS);
}

function handleOffline(): void {
  console.log('[OfflineSync] Gone offline, stopping sync interval');
  stopSyncInterval();
  notifyListeners();
}

function startSyncInterval(): void {
  if (syncInterval) return;
  syncInterval = setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      processQueue();
    }
  }, SYNC_QUEUE_CONFIG.SYNC_CHECK_INTERVAL_MS);
}

function stopSyncInterval(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// ============= Queue Operations =============

/**
 * Generate a unique ID for queue items.
 */
function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Queue an operation for later sync.
 * Called when a write operation fails due to being offline.
 */
export async function queueOperation(
  operationType: QueuedOperationType,
  payload: Record<string, unknown>,
  userId: string,
  groupId: string,
  elderId: string
): Promise<QueuedOperation | null> {
  try {
    // Check queue size limit
    const countResult = await syncQueueStore.count();
    if (countResult.success && countResult.data && countResult.data >= SYNC_QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      console.warn('[OfflineSync] Queue is full, cannot add more items');
      return null;
    }

    const queuedItem: QueuedOperation = {
      id: generateQueueId(),
      operationType,
      payload,
      priority: getOperationPriority(operationType),
      status: 'pending',
      queuedAt: new Date().toISOString(),
      attemptCount: 0,
      userId,
      groupId,
      elderId,
    };

    const result = await syncQueueStore.put(queuedItem);
    if (result.success) {
      console.log(`[OfflineSync] Queued ${operationType} operation:`, queuedItem.id);
      notifyListeners();
      return queuedItem;
    }

    return null;
  } catch (error) {
    console.error('[OfflineSync] Error queueing operation:', error);
    return null;
  }
}

/**
 * Get all pending operations from the queue.
 */
export async function getPendingOperations(): Promise<QueuedOperation[]> {
  const result = await syncQueueStore.getByStatus('pending');
  if (!result.success || !result.data) {
    return [];
  }

  // Sort by priority and then by queued time
  return result.data.sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
  });
}

/**
 * Get the current queue status for UI display.
 */
export async function getQueueStatus(): Promise<SyncQueueStatus> {
  const allResult = await syncQueueStore.getAll();
  const items = allResult.success && allResult.data ? allResult.data : [];

  const pendingItems = items.filter(i => i.status === 'pending');
  const failedItems = items.filter(i => i.status === 'failed');

  const pendingByType: Record<QueuedOperationType, number> = {
    medication_log: 0,
    supplement_log: 0,
    diet_log: 0,
    note_create: 0,
    activity_log: 0,
  };

  pendingItems.forEach(item => {
    pendingByType[item.operationType]++;
  });

  const oldestPending = pendingItems.length > 0
    ? new Date(Math.min(...pendingItems.map(i => new Date(i.queuedAt).getTime())))
    : null;

  return {
    pendingCount: pendingItems.length,
    failedCount: failedItems.length,
    isSyncing,
    oldestPendingAt: oldestPending,
    lastSyncAt,
    pendingByType,
  };
}

// ============= Sync Processing =============

/**
 * Operation handlers - these call the actual Firebase services.
 * Each handler receives the payload and should return true on success.
 */
type OperationHandler = (payload: Record<string, unknown>) => Promise<boolean>;

const operationHandlers: Record<QueuedOperationType, OperationHandler | null> = {
  medication_log: null, // Will be set by the medication service
  supplement_log: null,
  diet_log: null,
  note_create: null,
  activity_log: null,
};

/**
 * Register a handler for an operation type.
 * Called by services to register their sync handlers.
 */
export function registerOperationHandler(
  operationType: QueuedOperationType,
  handler: OperationHandler
): void {
  operationHandlers[operationType] = handler;
  console.log(`[OfflineSync] Registered handler for ${operationType}`);
}

/**
 * Process the queue, syncing all pending operations.
 */
export async function processQueue(): Promise<void> {
  if (!navigator.onLine || isSyncing) {
    return;
  }

  isSyncing = true;
  notifyListeners();

  try {
    const pendingItems = await getPendingOperations();

    if (pendingItems.length === 0) {
      isSyncing = false;
      notifyListeners();
      return;
    }

    console.log(`[OfflineSync] Processing ${pendingItems.length} pending items`);

    for (const item of pendingItems) {
      // Check if we're still online
      if (!navigator.onLine) {
        console.log('[OfflineSync] Gone offline during sync, stopping');
        break;
      }

      await processItem(item);
    }

    lastSyncAt = new Date();
  } catch (error) {
    console.error('[OfflineSync] Error processing queue:', error);
  } finally {
    isSyncing = false;
    notifyListeners();
  }
}

/**
 * Process a single queue item.
 */
async function processItem(item: QueuedOperation): Promise<void> {
  const handler = operationHandlers[item.operationType];

  if (!handler) {
    console.warn(`[OfflineSync] No handler registered for ${item.operationType}`);
    // Mark as failed if no handler
    await updateItemStatus(item.id, 'failed', 'No handler registered');
    return;
  }

  // Update status to syncing
  await updateItemStatus(item.id, 'syncing');

  try {
    const success = await handler(item.payload);

    if (success) {
      // Remove from queue on success
      await syncQueueStore.delete(item.id);
      console.log(`[OfflineSync] Successfully synced ${item.operationType}:`, item.id);
    } else {
      throw new Error('Handler returned false');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newAttemptCount = item.attemptCount + 1;

    if (newAttemptCount >= SYNC_QUEUE_CONFIG.MAX_RETRY_ATTEMPTS) {
      // Max retries reached, mark as failed
      await updateItemStatus(item.id, 'failed', errorMessage, newAttemptCount);
      console.error(`[OfflineSync] Max retries reached for ${item.operationType}:`, item.id);
    } else {
      // Will retry later
      await updateItemStatus(item.id, 'pending', errorMessage, newAttemptCount);
      console.warn(`[OfflineSync] Retry ${newAttemptCount} for ${item.operationType}:`, item.id);
    }
  }
}

/**
 * Update the status of a queue item.
 */
async function updateItemStatus(
  id: string,
  status: QueuedOperation['status'],
  error?: string,
  attemptCount?: number
): Promise<void> {
  const result = await syncQueueStore.get(id);
  if (!result.success || !result.data) return;

  const updated: QueuedOperation = {
    ...result.data,
    status,
    lastAttemptAt: new Date().toISOString(),
    ...(error && { lastError: error }),
    ...(attemptCount !== undefined && { attemptCount }),
  };

  await syncQueueStore.put(updated);
}

// ============= Event Listeners =============

/**
 * Subscribe to queue status updates.
 */
export function onQueueStatusChange(listener: SyncEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of queue status change.
 */
async function notifyListeners(): Promise<void> {
  const status = await getQueueStatus();
  listeners.forEach(listener => listener(status));
}

// ============= Utility Functions =============

/**
 * Check if there are pending operations.
 */
export async function hasPendingOperations(): Promise<boolean> {
  const result = await syncQueueStore.getByStatus('pending');
  return result.success && result.data ? result.data.length > 0 : false;
}

/**
 * Clear all failed operations from the queue.
 */
export async function clearFailedOperations(): Promise<void> {
  const result = await syncQueueStore.getByStatus('failed');
  if (result.success && result.data) {
    const ids = result.data.map(item => item.id);
    await syncQueueStore.deleteMany(ids);
    notifyListeners();
  }
}

/**
 * Retry all failed operations.
 */
export async function retryFailedOperations(): Promise<void> {
  const result = await syncQueueStore.getByStatus('failed');
  if (result.success && result.data) {
    for (const item of result.data) {
      await updateItemStatus(item.id, 'pending', undefined, 0);
    }
    notifyListeners();
    // Trigger processing
    if (navigator.onLine) {
      processQueue();
    }
  }
}

/**
 * Check if currently online.
 */
export function isOnlineNow(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Format pending operations for display.
 */
export function formatPendingMessage(status: SyncQueueStatus): string {
  if (status.pendingCount === 0) return '';

  const parts: string[] = [];
  if (status.pendingByType.medication_log > 0) {
    parts.push(`${status.pendingByType.medication_log} medication log${status.pendingByType.medication_log > 1 ? 's' : ''}`);
  }
  if (status.pendingByType.supplement_log > 0) {
    parts.push(`${status.pendingByType.supplement_log} supplement log${status.pendingByType.supplement_log > 1 ? 's' : ''}`);
  }
  if (status.pendingByType.diet_log > 0) {
    parts.push(`${status.pendingByType.diet_log} diet log${status.pendingByType.diet_log > 1 ? 's' : ''}`);
  }
  if (status.pendingByType.note_create > 0) {
    parts.push(`${status.pendingByType.note_create} note${status.pendingByType.note_create > 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}
