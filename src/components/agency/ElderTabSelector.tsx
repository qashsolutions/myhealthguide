'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Elder } from '@/types';

interface ElderTabSelectorProps {
  elders: Elder[];
  selectedElderId: string | null;
  onSelect: (elder: Elder) => void;
  taskCounts?: Record<string, { due: number; overdue: number }>;
}

export function ElderTabSelector({ elders, selectedElderId, onSelect, taskCounts }: ElderTabSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll selected tab into view
  useEffect(() => {
    if (!scrollRef.current || !selectedElderId) return;
    const selectedTab = scrollRef.current.querySelector(`[data-elder-id="${selectedElderId}"]`);
    if (selectedTab) {
      selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedElderId]);

  if (elders.length <= 1) return null;

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
      role="tablist"
      aria-label="Select loved one"
    >
      {elders.map((elder) => {
        const isSelected = elder.id === selectedElderId;
        const counts = taskCounts?.[elder.id];
        const hasDue = counts && (counts.due > 0 || counts.overdue > 0);
        const hasOverdue = counts && counts.overdue > 0;

        return (
          <button
            key={elder.id}
            data-elder-id={elder.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(elder)}
            className={cn(
              'flex flex-col items-center px-4 py-2 rounded-xl whitespace-nowrap transition-colors min-w-[80px] shrink-0',
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <span
              className={cn(
                'text-sm font-medium truncate max-w-[100px]',
                isSelected
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {elder.preferredName || elder.name}
            </span>
            {hasDue && (
              <span
                className={cn(
                  'text-[10px] mt-0.5 font-medium',
                  hasOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {hasOverdue ? `${counts.overdue} overdue` : `${counts.due} due`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
