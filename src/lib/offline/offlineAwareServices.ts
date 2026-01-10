/**
 * Offline-Aware Service Wrappers
 *
 * Wraps Firebase write operations with offline queueing support.
 * When offline, operations are queued and synced when back online.
 */

'use client';

import { MedicationService } from '@/lib/firebase/medications';
import { SupplementService } from '@/lib/firebase/supplements';
import { DietService } from '@/lib/firebase/diet';
import type { MedicationLog, SupplementLog, DietEntry } from '@/types';
import type { UserRole } from '@/lib/medical/phiAuditLog';
import {
  queueOperation,
  registerOperationHandler,
  isOnlineNow,
  initializeOfflineSync,
} from './offlineSyncService';

// ============= Types =============

export interface OfflineOperationResult<T> {
  success: boolean;
  data?: T;
  queued: boolean;
  queueId?: string;
  error?: string;
}

// ============= Initialization =============

let handlersRegistered = false;

/**
 * Initialize offline-aware services.
 * Registers sync handlers for each operation type.
 */
export async function initializeOfflineAwareServices(): Promise<void> {
  if (handlersRegistered) return;

  await initializeOfflineSync();

  // Register medication log handler
  registerOperationHandler('medication_log', async (payload) => {
    try {
      const { log, userId, userRole } = payload as {
        log: Omit<MedicationLog, 'id'>;
        userId: string;
        userRole: UserRole;
      };

      // Convert date strings back to Date objects
      const logWithDates = {
        ...log,
        scheduledTime: new Date(log.scheduledTime as unknown as string),
        actualTime: log.actualTime ? new Date(log.actualTime as unknown as string) : undefined,
        createdAt: new Date(log.createdAt as unknown as string),
      };

      await MedicationService.logDose(logWithDates, userId, userRole);
      return true;
    } catch (error) {
      console.error('[OfflineAware] Error syncing medication log:', error);
      throw error;
    }
  });

  // Register supplement log handler
  registerOperationHandler('supplement_log', async (payload) => {
    try {
      const { log, userId, userRole } = payload as {
        log: Omit<SupplementLog, 'id'>;
        userId: string;
        userRole: UserRole;
      };

      // Convert date strings back to Date objects
      const logWithDates = {
        ...log,
        scheduledTime: new Date(log.scheduledTime as unknown as string),
        actualTime: log.actualTime ? new Date(log.actualTime as unknown as string) : undefined,
        createdAt: new Date(log.createdAt as unknown as string),
      };

      await SupplementService.logIntake(logWithDates, userId, userRole);
      return true;
    } catch (error) {
      console.error('[OfflineAware] Error syncing supplement log:', error);
      throw error;
    }
  });

  // Register diet log handler
  registerOperationHandler('diet_log', async (payload) => {
    try {
      const { entry, userId, userRole } = payload as {
        entry: Omit<DietEntry, 'id'>;
        userId: string;
        userRole: UserRole;
      };

      // Convert date strings back to Date objects
      const entryWithDates = {
        ...entry,
        timestamp: new Date(entry.timestamp as unknown as string),
        createdAt: new Date(entry.createdAt as unknown as string),
      };

      await DietService.createEntry(entryWithDates, userId, userRole);
      return true;
    } catch (error) {
      console.error('[OfflineAware] Error syncing diet entry:', error);
      throw error;
    }
  });

  handlersRegistered = true;
  console.log('[OfflineAware] Services initialized with sync handlers');
}

// ============= Helper Functions =============

/**
 * Check if an error is a network/offline error.
 */
function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const networkErrorPatterns = [
    'network',
    'offline',
    'failed to fetch',
    'networkerror',
    'net::err',
    'timeout',
    'unavailable',
  ];

  return networkErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern)
  );
}

/**
 * Convert Date objects to ISO strings for storage.
 */
function serializeDates(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = serializeDates(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ============= Offline-Aware Service Methods =============

/**
 * Log a medication dose with offline support.
 * If offline, the operation is queued and synced later.
 */
export async function logMedicationDoseOfflineAware(
  log: Omit<MedicationLog, 'id'>,
  userId: string,
  userRole: UserRole
): Promise<OfflineOperationResult<MedicationLog>> {
  // Ensure handlers are registered
  await initializeOfflineAwareServices();

  // If online, try to sync directly
  if (isOnlineNow()) {
    try {
      const result = await MedicationService.logDose(log, userId, userRole);
      return { success: true, data: result, queued: false };
    } catch (error) {
      // If it's a network error, queue it
      if (isNetworkError(error)) {
        console.log('[OfflineAware] Network error, queueing medication log');
      } else {
        // Non-network error, don't queue
        return {
          success: false,
          queued: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  // Queue the operation for later sync
  const payload = serializeDates({
    log,
    userId,
    userRole,
  });

  const queuedItem = await queueOperation(
    'medication_log',
    payload,
    userId,
    log.groupId,
    log.elderId
  );

  if (queuedItem) {
    // Return a temporary result with a fake ID
    const tempResult: MedicationLog = {
      ...log,
      id: `pending_${queuedItem.id}`,
    };
    return {
      success: true,
      data: tempResult,
      queued: true,
      queueId: queuedItem.id,
    };
  }

  return {
    success: false,
    queued: false,
    error: 'Failed to queue operation',
  };
}

/**
 * Log a supplement intake with offline support.
 */
export async function logSupplementIntakeOfflineAware(
  log: Omit<SupplementLog, 'id'>,
  userId: string,
  userRole: UserRole
): Promise<OfflineOperationResult<SupplementLog>> {
  await initializeOfflineAwareServices();

  if (isOnlineNow()) {
    try {
      const result = await SupplementService.logIntake(log, userId, userRole);
      return { success: true, data: result, queued: false };
    } catch (error) {
      if (!isNetworkError(error)) {
        return {
          success: false,
          queued: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  const payload = serializeDates({
    log,
    userId,
    userRole,
  });

  const queuedItem = await queueOperation(
    'supplement_log',
    payload,
    userId,
    log.groupId,
    log.elderId
  );

  if (queuedItem) {
    const tempResult: SupplementLog = {
      ...log,
      id: `pending_${queuedItem.id}`,
    };
    return {
      success: true,
      data: tempResult,
      queued: true,
      queueId: queuedItem.id,
    };
  }

  return {
    success: false,
    queued: false,
    error: 'Failed to queue operation',
  };
}

/**
 * Create a diet entry with offline support.
 */
export async function createDietEntryOfflineAware(
  entry: Omit<DietEntry, 'id'>,
  userId: string,
  userRole: UserRole
): Promise<OfflineOperationResult<DietEntry>> {
  await initializeOfflineAwareServices();

  if (isOnlineNow()) {
    try {
      const result = await DietService.createEntry(entry, userId, userRole);
      return { success: true, data: result, queued: false };
    } catch (error) {
      if (!isNetworkError(error)) {
        return {
          success: false,
          queued: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  const payload = serializeDates({
    entry,
    userId,
    userRole,
  });

  const queuedItem = await queueOperation(
    'diet_log',
    payload,
    userId,
    entry.groupId,
    entry.elderId
  );

  if (queuedItem) {
    const tempResult: DietEntry = {
      ...entry,
      id: `pending_${queuedItem.id}`,
    };
    return {
      success: true,
      data: tempResult,
      queued: true,
      queueId: queuedItem.id,
    };
  }

  return {
    success: false,
    queued: false,
    error: 'Failed to queue operation',
  };
}
