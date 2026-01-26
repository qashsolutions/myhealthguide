'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, isSameDay, eachDayOfInterval, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

interface WeekStripProps {
  weekStart: Date; // Sunday of current week
  shifts: ScheduledShift[];
  expectedShiftsPerDay: Map<string, number>; // date string → expected count
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (direction: 'prev' | 'next') => void;
}

type DayCoverageStatus = 'all_covered' | 'partial' | 'none' | 'no_shifts';

interface DayData {
  date: Date;
  filledCount: number;
  totalExpected: number;
  coveragePercent: number;
  status: DayCoverageStatus;
  hasGaps: boolean;
}

export function WeekStrip({
  weekStart,
  shifts,
  expectedShiftsPerDay,
  selectedDate,
  onDateSelect,
  onWeekChange,
}: WeekStripProps) {
  // Compute day data for each day of the week
  const weekDays: DayData[] = useMemo(() => {
    const days = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });

    return days.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');

      // Filter shifts for this day (non-cancelled)
      const dayShifts = shifts.filter(
        (s) =>
          s.date &&
          isSameDay(s.date, date) &&
          !['cancelled', 'declined'].includes(s.status)
      );

      // Count filled shifts (has caregiver assigned and not unfilled status)
      const filledCount = dayShifts.filter(
        (s) => s.caregiverId && s.status !== 'unfilled' && s.status !== 'offered'
      ).length;

      const totalExpected = expectedShiftsPerDay.get(dateKey) || dayShifts.length;
      const coveragePercent =
        totalExpected > 0 ? (filledCount / totalExpected) * 100 : 100;

      let status: DayCoverageStatus;
      if (totalExpected === 0 && dayShifts.length === 0) {
        status = 'no_shifts';
      } else if (coveragePercent >= 100) {
        status = 'all_covered';
      } else if (coveragePercent > 0) {
        status = 'partial';
      } else {
        status = 'none';
      }

      const hasGaps = totalExpected > filledCount;

      return {
        date,
        filledCount,
        totalExpected,
        coveragePercent: Math.min(coveragePercent, 100),
        status,
        hasGaps,
      };
    });
  }, [weekStart, shifts, expectedShiftsPerDay]);

  // Get coverage bar color based on status
  const getCoverageColor = (status: DayCoverageStatus) => {
    switch (status) {
      case 'all_covered':
        return 'bg-green-500 dark:bg-green-400';
      case 'partial':
        return 'bg-amber-500 dark:bg-amber-400';
      case 'none':
        return 'bg-red-500 dark:bg-red-400';
      default:
        return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  const getCoverageTextColor = (status: DayCoverageStatus) => {
    switch (status) {
      case 'all_covered':
        return 'text-green-700 dark:text-green-400';
      case 'partial':
        return 'text-amber-700 dark:text-amber-400';
      case 'none':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onWeekChange('prev')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </p>

        <button
          onClick={() => onWeekChange('next')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Week Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day.date, selectedDate);
          const today = isToday(day.date);

          return (
            <button
              key={day.date.toISOString()}
              onClick={() => onDateSelect(day.date)}
              className={cn(
                'flex flex-col items-center py-2 px-1 rounded-lg transition-all active:scale-[0.95]',
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 dark:ring-blue-400'
                  : today
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              {/* Day name */}
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-wide',
                  today
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {format(day.date, 'EEE')}
              </span>

              {/* Date number */}
              <span
                className={cn(
                  'text-lg font-bold leading-tight',
                  today
                    ? 'text-blue-600 dark:text-blue-400'
                    : isSelected
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                )}
              >
                {format(day.date, 'd')}
              </span>

              {/* TODAY label */}
              {today && (
                <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 -mt-0.5">
                  TODAY
                </span>
              )}

              {/* Coverage bar */}
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getCoverageColor(day.status))}
                  style={{ width: `${day.coveragePercent}%` }}
                />
              </div>

              {/* Coverage count */}
              <div className="flex items-center gap-0.5 mt-1">
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    getCoverageTextColor(day.status)
                  )}
                >
                  {day.status === 'no_shifts'
                    ? 'off'
                    : `${day.filledCount}/${day.totalExpected}`}
                </span>
                {day.status === 'all_covered' && day.totalExpected > 0 && (
                  <span className="text-green-600 dark:text-green-400 text-[10px]">
                    ✓
                  </span>
                )}
                {day.hasGaps && day.totalExpected > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                    ⚠
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
