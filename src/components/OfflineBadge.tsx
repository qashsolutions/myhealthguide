/**
 * OfflineBadge Component
 *
 * Displays a subtle indicator when the app is offline or showing cached content.
 * Positioned in the top-right corner by default.
 */

'use client';

import { useState } from 'react';
import { WifiOff, RefreshCw, Clock, Database, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { formatCacheSize, formatLastSync } from '@/lib/offline/syncManager';

export interface OfflineBadgeProps {
  /** Show even when online (for cache status) */
  showCacheStatus?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Position - defaults to fixed top-right */
  position?: 'fixed' | 'relative' | 'absolute';
}

/**
 * Offline status badge with sync controls
 */
export function OfflineBadge({
  showCacheStatus = false,
  className = '',
  position = 'fixed',
}: OfflineBadgeProps) {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    cachedTipsCount,
    cacheSize,
    sync,
    forceSync,
  } = useOfflineStatus();

  const [isOpen, setIsOpen] = useState(false);

  // Don't show if online and not showing cache status
  if (isOnline && !showCacheStatus) {
    return null;
  }

  const positionClasses = {
    fixed: 'fixed top-4 right-4 z-50',
    relative: '',
    absolute: 'absolute top-4 right-4',
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={`${positionClasses[position]} ${className}`}>
          {!isOnline ? (
            <Badge
              variant="outline"
              className="bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <WifiOff className="w-3 h-3 mr-1.5" />
              Offline Mode
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Database className="w-3 h-3 mr-1.5" />
              {cachedTipsCount} cached
            </Badge>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
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
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isOnline
              ? 'Content is being loaded from the server.'
              : 'Showing cached content. Some features may be limited.'}
          </p>

          {/* Cache stats */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <Database className="w-3 h-3" />
                Cached tips
              </span>
              <span className="font-medium">{cachedTipsCount}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Last updated
              </span>
              <span className="font-medium">{formatLastSync(lastSyncTime)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Cache size</span>
              <span className="font-medium">{formatCacheSize(cacheSize)}</span>
            </div>
          </div>

          {/* Actions */}
          {isOnline && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => sync()}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Offline notice */}
          {!isOnline && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              New content will sync automatically when you reconnect.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Simple inline "Last updated" indicator
 */
export function LastUpdatedIndicator({
  lastSyncTime,
  className = '',
}: {
  lastSyncTime: Date | null;
  className?: string;
}) {
  if (!lastSyncTime) return null;

  return (
    <span className={`text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 ${className}`}>
      <Clock className="w-3 h-3" />
      Last updated: {formatLastSync(lastSyncTime)}
    </span>
  );
}

/**
 * Inline offline indicator (for use within content)
 */
export function InlineOfflineIndicator({ className = '' }: { className?: string }) {
  const { isOnline } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 ${className}`}>
      <WifiOff className="w-3 h-3" />
      <span>Offline - showing cached content</span>
    </div>
  );
}
