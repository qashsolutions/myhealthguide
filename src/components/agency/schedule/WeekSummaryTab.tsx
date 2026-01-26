'use client';

import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Check, AlertTriangle, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

interface WeekSummaryTabProps {
  weekStart: Date;
  weekDays: Date[];
  shifts: ScheduledShift[];
  caregivers: { id: string; name: string }[];
  elders: { id: string; name: string; groupId: string }[];
  onCellClick: (elderId: string, date: Date) => void;
  onCaregiverClick: (caregiverId: string) => void;
  onElderClick: (elderId: string) => void;
}

export function WeekSummaryTab({
  weekStart,
  weekDays,
  shifts,
  caregivers,
  elders,
  onCellClick,
  onCaregiverClick,
  onElderClick,
}: WeekSummaryTabProps) {
  // Compute caregiver load per day
  const caregiverLoadByDay = useMemo(() => {
    const load: Map<string, Map<string, number>> = new Map();

    caregivers.forEach((cg) => {
      const dayMap = new Map<string, number>();
      weekDays.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const count = shifts.filter(
          (s) =>
            s.caregiverId === cg.id &&
            s.date &&
            isSameDay(s.date, day) &&
            !['cancelled', 'declined'].includes(s.status)
        ).length;
        dayMap.set(dateKey, count);
      });
      load.set(cg.id, dayMap);
    });

    return load;
  }, [caregivers, weekDays, shifts]);

  // Compute elder coverage per day
  const elderCoverageByDay = useMemo(() => {
    const coverage: Map<string, Map<string, 'covered' | 'gap' | 'none'>> = new Map();

    elders.forEach((elder) => {
      const dayMap = new Map<string, 'covered' | 'gap' | 'none'>();
      weekDays.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');

        // Skip Sunday (day off)
        if (day.getDay() === 0) {
          dayMap.set(dateKey, 'none');
          return;
        }

        const elderShifts = shifts.filter(
          (s) =>
            s.elderId === elder.id &&
            s.date &&
            isSameDay(s.date, day) &&
            !['cancelled', 'declined'].includes(s.status)
        );

        if (elderShifts.length === 0) {
          dayMap.set(dateKey, 'gap');
        } else {
          const hasCoverage = elderShifts.some(
            (s) => s.caregiverId && s.status !== 'unfilled'
          );
          dayMap.set(dateKey, hasCoverage ? 'covered' : 'gap');
        }
      });
      coverage.set(elder.id, dayMap);
    });

    return coverage;
  }, [elders, weekDays, shifts]);

  // Compute totals per caregiver
  const caregiverTotals = useMemo(() => {
    const totals: Map<string, number> = new Map();
    caregivers.forEach((cg) => {
      const dayMap = caregiverLoadByDay.get(cg.id);
      if (dayMap) {
        let total = 0;
        dayMap.forEach((count) => {
          total += count;
        });
        totals.set(cg.id, total);
      }
    });
    return totals;
  }, [caregivers, caregiverLoadByDay]);

  // Compute totals per day (all caregivers)
  const dayTotals = useMemo(() => {
    const totals: Map<string, number> = new Map();
    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      let total = 0;
      caregiverLoadByDay.forEach((dayMap) => {
        total += dayMap.get(dateKey) || 0;
      });
      totals.set(dateKey, total);
    });
    return totals;
  }, [weekDays, caregiverLoadByDay]);

  // Compute elder coverage stats
  const elderCoverageStats = useMemo(() => {
    const stats: Map<string, { covered: number; total: number }> = new Map();
    elders.forEach((elder) => {
      const dayMap = elderCoverageByDay.get(elder.id);
      if (dayMap) {
        let covered = 0;
        let total = 0;
        dayMap.forEach((status) => {
          if (status !== 'none') {
            total++;
            if (status === 'covered') covered++;
          }
        });
        stats.set(elder.id, { covered, total });
      }
    });
    return stats;
  }, [elders, elderCoverageByDay]);

  // Grand total
  const grandTotal = useMemo(() => {
    let total = 0;
    dayTotals.forEach((count) => {
      total += count;
    });
    return total;
  }, [dayTotals]);

  // Day headers (Mon, Tue, etc.)
  const dayHeaders = weekDays.map((day) => ({
    key: format(day, 'yyyy-MM-dd'),
    short: format(day, 'EEE'),
    date: format(day, 'd'),
    isSunday: day.getDay() === 0,
  }));

  return (
    <div className="space-y-6">
      {/* Caregiver Load Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Caregiver Load
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            # of elders assigned per day
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">
                  Caregiver
                </th>
                {dayHeaders.map((day) => (
                  <th
                    key={day.key}
                    className={cn(
                      'text-center px-2 py-2 font-medium min-w-[50px]',
                      day.isSunday
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <div className="text-xs">{day.short}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{day.date}</div>
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {caregivers.map((cg) => {
                const dayMap = caregiverLoadByDay.get(cg.id);
                const total = caregiverTotals.get(cg.id) || 0;

                return (
                  <tr
                    key={cg.id}
                    onClick={() => onCaregiverClick(cg.id)}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 z-10">
                      <span className="truncate block max-w-[120px]">{cg.name}</span>
                    </td>
                    {dayHeaders.map((day) => {
                      const count = dayMap?.get(day.key) || 0;
                      return (
                        <td
                          key={day.key}
                          className={cn(
                            'text-center px-2 py-2',
                            day.isSunday
                              ? 'text-gray-300 dark:text-gray-600'
                              : count >= 3
                                ? 'text-green-600 dark:text-green-400 font-semibold'
                                : count > 0
                                  ? 'text-gray-700 dark:text-gray-300'
                                  : 'text-gray-300 dark:text-gray-600'
                          )}
                        >
                          {day.isSunday ? '-' : count}
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2 font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/30">
                      {total}
                    </td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr className="bg-gray-100 dark:bg-gray-700/50 font-semibold">
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-700/50 z-10">
                  Total
                </td>
                {dayHeaders.map((day) => {
                  const total = dayTotals.get(day.key) || 0;
                  return (
                    <td
                      key={day.key}
                      className={cn(
                        'text-center px-2 py-2',
                        day.isSunday
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {day.isSunday ? '-' : total}
                    </td>
                  );
                })}
                <td className="text-center px-3 py-2 text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-600/50">
                  {grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Elder Coverage Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Elder Coverage
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            Click ⚠ to assign
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">
                  Elder
                </th>
                {dayHeaders.map((day) => (
                  <th
                    key={day.key}
                    className={cn(
                      'text-center px-2 py-2 font-medium min-w-[50px]',
                      day.isSunday
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <div className="text-xs">{day.short}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{day.date}</div>
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {elders.map((elder) => {
                const dayMap = elderCoverageByDay.get(elder.id);
                const stats = elderCoverageStats.get(elder.id) || { covered: 0, total: 0 };
                const isFullyCovered = stats.covered === stats.total && stats.total > 0;

                return (
                  <tr
                    key={elder.id}
                    onClick={() => onElderClick(elder.id)}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 z-10">
                      <span className="truncate block max-w-[120px]">{elder.name}</span>
                    </td>
                    {dayHeaders.map((day) => {
                      const status = dayMap?.get(day.key) || 'none';
                      const dayDate = weekDays.find(
                        (d) => format(d, 'yyyy-MM-dd') === day.key
                      );

                      if (status === 'none' || day.isSunday) {
                        return (
                          <td
                            key={day.key}
                            className="text-center px-2 py-2 text-gray-300 dark:text-gray-600"
                          >
                            -
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.key}
                          className="text-center px-2 py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (status === 'gap' && dayDate) {
                              onCellClick(elder.id, dayDate);
                            }
                          }}
                        >
                          {status === 'covered' ? (
                            <Check className="w-4 h-4 text-green-500 dark:text-green-400 mx-auto" />
                          ) : (
                            <button
                              className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                              title="Click to assign"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 mx-auto" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700/30">
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          isFullyCovered
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        )}
                      >
                        {stats.covered}/{stats.total}
                        {isFullyCovered && ' ✓'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {elders.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No elders found
          </div>
        )}
      </div>
    </div>
  );
}
