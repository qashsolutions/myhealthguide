'use client';

import { useCompletionProgress } from '@/hooks/useTaskPriority';
import { cn } from '@/lib/utils';

export function DayProgress() {
  const { completedCount, totalCount, completionPercentage } = useCompletionProgress();

  if (totalCount === 0) return null;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            completionPercentage === 100
              ? 'bg-green-500 dark:bg-green-400'
              : completionPercentage >= 50
                ? 'bg-blue-500 dark:bg-blue-400'
                : 'bg-blue-400 dark:bg-blue-500'
          )}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      {/* Label */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
        {completedCount} of {totalCount} done
      </p>
    </div>
  );
}
