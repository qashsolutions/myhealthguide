'use client';

import { cn } from '@/lib/utils';

export type ScheduleTabType = 'summary' | 'caregiver' | 'elder' | 'gaps';

interface ScheduleTabsProps {
  activeTab: ScheduleTabType;
  onTabChange: (tab: ScheduleTabType) => void;
  gapsCount: number;
}

const TABS: { id: ScheduleTabType; label: string }[] = [
  { id: 'summary', label: 'Week Summary' },
  { id: 'caregiver', label: 'By Caregiver' },
  { id: 'elder', label: 'By Elder' },
  { id: 'gaps', label: 'Gaps Only' },
];

export function ScheduleTabs({ activeTab, onTabChange, gapsCount }: ScheduleTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === 'gaps' && gapsCount > 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 min-w-[90px] px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
              isActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {tab.label}
            {showBadge && (
              <span className={cn(
                'ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold rounded-full',
                isActive
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  : 'bg-red-500 text-white'
              )}>
                {gapsCount > 99 ? '99+' : gapsCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
