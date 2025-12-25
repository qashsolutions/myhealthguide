'use client';

import { cn } from '@/lib/utils';

export type TimePeriod = 'today' | 'week' | 'month';

interface TimeToggleProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
  className?: string;
}

export function TimeToggle({ value, onChange, className }: TimeToggleProps) {
  const options: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  return (
    <div className={cn(
      "inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1",
      className
    )}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            value === option.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
