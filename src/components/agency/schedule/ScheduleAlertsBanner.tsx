'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleAlertsBannerProps {
  gapsCount: number;
  unconfirmedCount: number;
  onGapsClick: () => void;
  onUnconfirmedClick: () => void;
}

export function ScheduleAlertsBanner({
  gapsCount,
  unconfirmedCount,
  onGapsClick,
  onUnconfirmedClick,
}: ScheduleAlertsBannerProps) {
  if (gapsCount === 0 && unconfirmedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
      {gapsCount > 0 && (
        <button
          onClick={onGapsClick}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
            'hover:bg-red-200 dark:hover:bg-red-900/50 active:scale-[0.98]'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{gapsCount} shift{gapsCount !== 1 ? 's' : ''} need coverage</span>
        </button>
      )}

      {unconfirmedCount > 0 && (
        <button
          onClick={onUnconfirmedClick}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
            'hover:bg-amber-200 dark:hover:bg-amber-900/50 active:scale-[0.98]'
          )}
        >
          <Clock className="w-4 h-4" />
          <span>{unconfirmedCount} awaiting confirmation</span>
        </button>
      )}
    </div>
  );
}
