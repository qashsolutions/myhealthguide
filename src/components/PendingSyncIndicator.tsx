/**
 * PendingSyncIndicator Component
 *
 * Shows pending offline operations and sync status.
 * Displays in the header when there are queued operations.
 */

'use client';

import { useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Pill,
  Leaf,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSyncQueue } from '@/hooks/useSyncQueue';

export interface PendingSyncIndicatorProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Indicator showing pending sync operations.
 */
export function PendingSyncIndicator({ className = '' }: PendingSyncIndicatorProps) {
  const {
    status,
    isInitialized,
    isOnline,
    pendingMessage,
    syncNow,
    clearFailed,
    retryFailed,
  } = useSyncQueue();

  const [isOpen, setIsOpen] = useState(false);

  // Don't render if not initialized or nothing to show
  if (!isInitialized) {
    return null;
  }

  const hasPending = status.pendingCount > 0;
  const hasFailed = status.failedCount > 0;
  const showIndicator = hasPending || hasFailed || !isOnline;

  if (!showIndicator) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={`cursor-pointer ${className}`}>
          {/* Offline badge */}
          {!isOnline && (
            <Badge
              variant="outline"
              className="bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <CloudOff className="w-3 h-3 mr-1.5" />
              Offline
              {hasPending && ` (${status.pendingCount} pending)`}
            </Badge>
          )}

          {/* Syncing badge */}
          {isOnline && status.isSyncing && (
            <Badge
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
            >
              <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              Syncing...
            </Badge>
          )}

          {/* Pending badge (online, not syncing) */}
          {isOnline && !status.isSyncing && hasPending && (
            <Badge
              variant="outline"
              className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
            >
              <Cloud className="w-3 h-3 mr-1.5" />
              {status.pendingCount} pending
            </Badge>
          )}

          {/* Failed badge */}
          {isOnline && !status.isSyncing && !hasPending && hasFailed && (
            <Badge
              variant="outline"
              className="bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 mr-1.5" />
              {status.failedCount} failed
            </Badge>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              {isOnline ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Online
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Offline
                </>
              )}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Status message */}
          {!isOnline && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Your changes are saved locally and will sync when you reconnect.
            </p>
          )}

          {/* Pending operations breakdown */}
          {hasPending && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pending Operations
              </div>

              {status.pendingByType.medication_log > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Pill className="w-3 h-3 text-blue-500" />
                    Medication logs
                  </span>
                  <span className="font-medium">{status.pendingByType.medication_log}</span>
                </div>
              )}

              {status.pendingByType.supplement_log > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Leaf className="w-3 h-3 text-green-500" />
                    Supplement logs
                  </span>
                  <span className="font-medium">{status.pendingByType.supplement_log}</span>
                </div>
              )}

              {status.pendingByType.diet_log > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3 h-3 text-orange-500" />
                    Diet entries
                  </span>
                  <span className="font-medium">{status.pendingByType.diet_log}</span>
                </div>
              )}

              {status.oldestPendingAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  Oldest: {formatTimeAgo(status.oldestPendingAt)}
                </div>
              )}
            </div>
          )}

          {/* Failed operations */}
          {hasFailed && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span>{status.failedCount} operation(s) failed to sync</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1"
                  onClick={retryFailed}
                >
                  Retry All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={clearFailed}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {isOnline && hasPending && !status.isSyncing && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={syncNow}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Sync Now
            </Button>
          )}

          {/* Success state */}
          {isOnline && !hasPending && !hasFailed && status.lastSyncAt && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              All synced! Last sync: {formatTimeAgo(status.lastSyncAt)}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Format a date as a relative time string.
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
