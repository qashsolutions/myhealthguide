'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { AlertTriangle, User, Clock, Check, X, Loader2, Users, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

// Schedule constants
const MAX_ELDERS_PER_CAREGIVER_PER_DAY = 3;

interface Gap {
  shiftId: string;
  elderId: string;
  elderName: string;
  groupId: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface GapsOnlyTabProps {
  weekStart: Date;
  weekDays: Date[];
  shifts: ScheduledShift[];
  elders: { id: string; name: string; groupId: string }[];
  caregivers: { id: string; name: string }[];
  onAssignGap: (gap: Gap) => void;
  onBulkAssign: (gaps: Gap[], caregiverId: string, caregiverName: string) => Promise<void>;
}

// Format time from "HH:mm" to "h:mm AM/PM"
function formatTime(time: string): string {
  if (!time) return '--';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function GapsOnlyTab({
  weekStart,
  weekDays,
  shifts,
  elders,
  caregivers,
  onAssignGap,
  onBulkAssign,
}: GapsOnlyTabProps) {
  // Track selected gaps for bulk assign
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());

  // Bulk assign sheet state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Compute all gaps (unfilled shifts + elders without shifts)
  const gapsByDay = useMemo(() => {
    const map = new Map<string, Gap[]>();

    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const gaps: Gap[] = [];

      // Skip Sunday (day off)
      if (day.getDay() === 0) {
        map.set(dateKey, []);
        return;
      }

      // Get shifts for this day
      const dayShifts = shifts.filter(
        (s) => s.date && isSameDay(s.date, day) && s.status !== 'cancelled'
      );

      // Get elders who have shifts on this day
      const eldersWithShifts = new Set(dayShifts.map((s) => s.elderId));

      // 1. Find unfilled shifts (no caregiver assigned)
      dayShifts
        .filter((s) => s.status === 'unfilled' || !s.caregiverId)
        .forEach((s) => {
          gaps.push({
            shiftId: s.id,
            elderId: s.elderId,
            elderName: s.elderName,
            groupId: s.groupId,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          });
        });

      // 2. Find elders without any shift for this day
      elders.forEach((elder) => {
        if (!eldersWithShifts.has(elder.id)) {
          gaps.push({
            shiftId: '', // No shift exists yet
            elderId: elder.id,
            elderName: elder.name,
            groupId: elder.groupId,
            date: day,
            startTime: '09:00', // Default time
            endTime: '17:00',
          });
        }
      });

      map.set(dateKey, gaps);
    });

    return map;
  }, [weekDays, shifts, elders]);

  // Flatten all gaps for counting and selection
  const allGaps = useMemo(() => {
    const gaps: Gap[] = [];
    gapsByDay.forEach((dayGaps) => {
      gaps.push(...dayGaps);
    });
    return gaps;
  }, [gapsByDay]);

  // Total gap count
  const totalGaps = allGaps.length;

  // Get unique key for a gap
  const getGapKey = (gap: Gap) => {
    return `${gap.elderId}-${format(gap.date, 'yyyy-MM-dd')}`;
  };

  // Toggle gap selection
  const toggleGap = (gap: Gap) => {
    const key = getGapKey(gap);
    setSelectedGaps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all gaps
  const selectAll = () => {
    const allKeys = allGaps.map(getGapKey);
    setSelectedGaps(new Set(allKeys));
  };

  // Deselect all gaps
  const deselectAll = () => {
    setSelectedGaps(new Set());
  };

  // Get selected gap objects
  const selectedGapObjects = useMemo(() => {
    return allGaps.filter((gap) => selectedGaps.has(getGapKey(gap)));
  }, [allGaps, selectedGaps]);

  // Handle bulk assign
  const handleBulkAssign = useCallback(async (caregiverId: string, caregiverName: string) => {
    if (selectedGapObjects.length === 0) return;

    setBulkAssigning(true);
    setBulkError(null);

    try {
      await onBulkAssign(selectedGapObjects, caregiverId, caregiverName);
      setSelectedGaps(new Set());
      setShowBulkAssign(false);
    } catch (err: any) {
      console.error('Bulk assign error:', err);
      setBulkError(err.message || 'Failed to assign shifts');
    } finally {
      setBulkAssigning(false);
    }
  }, [selectedGapObjects, onBulkAssign]);

  // Count caregiver load for the week (for display in bulk assign)
  const caregiverWeeklyLoad = useMemo(() => {
    const load = new Map<string, number>();
    caregivers.forEach((cg) => load.set(cg.id, 0));

    shifts.forEach((shift) => {
      if (!shift.caregiverId || shift.status === 'cancelled') return;
      const current = load.get(shift.caregiverId) || 0;
      load.set(shift.caregiverId, current + 1);
    });

    return load;
  }, [caregivers, shifts]);

  // Count caregiver load per day (for 3-elder daily limit check)
  const caregiverDailyLoad = useMemo(() => {
    // Map: caregiverId -> dateKey -> count
    const load = new Map<string, Map<string, number>>();
    caregivers.forEach((cg) => load.set(cg.id, new Map()));

    shifts.forEach((shift) => {
      if (!shift.caregiverId || shift.status === 'cancelled' || !shift.date) return;
      const dateKey = format(shift.date, 'yyyy-MM-dd');
      const cgMap = load.get(shift.caregiverId);
      if (cgMap) {
        cgMap.set(dateKey, (cgMap.get(dateKey) || 0) + 1);
      }
    });

    return load;
  }, [caregivers, shifts]);

  // Check if caregiver would exceed daily limit for selected gaps
  const wouldExceedDailyLimit = useCallback((caregiverId: string, gaps: Gap[]) => {
    const cgDayLoad = caregiverDailyLoad.get(caregiverId);
    if (!cgDayLoad) return false;

    // Count how many gaps are on each day
    const gapsPerDay = new Map<string, number>();
    gaps.forEach((gap) => {
      const dateKey = format(gap.date, 'yyyy-MM-dd');
      gapsPerDay.set(dateKey, (gapsPerDay.get(dateKey) || 0) + 1);
    });

    // Check if any day would exceed the limit
    for (const [dateKey, gapCount] of gapsPerDay) {
      const currentLoad = cgDayLoad.get(dateKey) || 0;
      if (currentLoad + gapCount > MAX_ELDERS_PER_CAREGIVER_PER_DAY) {
        return true;
      }
    }

    return false;
  }, [caregiverDailyLoad]);

  if (totalGaps === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-8 text-center">
        <Check className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-3" />
        <p className="text-lg font-medium text-green-800 dark:text-green-300">
          All shifts covered!
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Every elder has a caregiver assigned for this week.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and actions */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                {totalGaps} Gap{totalGaps !== 1 ? 's' : ''} This Week
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {selectedGaps.size > 0
                  ? `${selectedGaps.size} selected`
                  : 'Select gaps to bulk assign'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedGaps.size > 0 ? (
              <>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Assign {selectedGaps.size}
                </button>
              </>
            ) : (
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Select All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gap list grouped by day */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayGaps = gapsByDay.get(dateKey) || [];
          const isSunday = day.getDay() === 0;

          if (isSunday || dayGaps.length === 0) return null;

          return (
            <div
              key={dateKey}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Day Header */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {format(day, 'EEEE, MMM d')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    {dayGaps.length} gap{dayGaps.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const dayGapKeys = dayGaps.map(getGapKey);
                    const allSelected = dayGapKeys.every((k) => selectedGaps.has(k));

                    setSelectedGaps((prev) => {
                      const next = new Set(prev);
                      if (allSelected) {
                        dayGapKeys.forEach((k) => next.delete(k));
                      } else {
                        dayGapKeys.forEach((k) => next.add(k));
                      }
                      return next;
                    });
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {dayGaps.every((g) => selectedGaps.has(getGapKey(g)))
                    ? 'Deselect Day'
                    : 'Select Day'}
                </button>
              </div>

              {/* Gaps */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {dayGaps.map((gap) => {
                  const key = getGapKey(gap);
                  const isSelected = selectedGaps.has(key);

                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleGap(gap)}
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Elder Info */}
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {gap.elderName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatTime(gap.startTime)} – {formatTime(gap.endTime)}
                          </span>
                          {!gap.shiftId && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              (no shift created)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Assign Button */}
                      <button
                        onClick={() => onAssignGap(gap)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                      >
                        Assign
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Assign Bottom Sheet */}
      {showBulkAssign && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!bulkAssigning) {
                setShowBulkAssign(false);
                setBulkError(null);
              }
            }}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Bulk Assign
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Assign {selectedGapObjects.length} gap{selectedGapObjects.length !== 1 ? 's' : ''} to a caregiver
                </p>
              </div>
              <button
                onClick={() => {
                  if (!bulkAssigning) {
                    setShowBulkAssign(false);
                    setBulkError(null);
                  }
                }}
                disabled={bulkAssigning}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Selected Gaps Summary */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-1.5">
                {selectedGapObjects.slice(0, 5).map((gap) => (
                  <span
                    key={getGapKey(gap)}
                    className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium"
                  >
                    {gap.elderName} ({format(gap.date, 'EEE')})
                  </span>
                ))}
                {selectedGapObjects.length > 5 && (
                  <span className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium">
                    +{selectedGapObjects.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {bulkError && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                {bulkError}
              </div>
            )}

            {/* Caregiver List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {caregivers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No caregivers available
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {caregivers.map((caregiver) => {
                    const weeklyLoad = caregiverWeeklyLoad.get(caregiver.id) || 0;
                    const newLoad = weeklyLoad + selectedGapObjects.length;
                    const exceedsLimit = wouldExceedDailyLimit(caregiver.id, selectedGapObjects);
                    const isDisabled = bulkAssigning || exceedsLimit;

                    return (
                      <button
                        key={caregiver.id}
                        onClick={() => handleBulkAssign(caregiver.id, caregiver.name)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left',
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                          exceedsLimit
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        )}>
                          {exceedsLimit ? (
                            <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {caregiver.name}
                          </p>
                          {exceedsLimit ? (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Would exceed 3 elders/day limit
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {weeklyLoad} shifts this week → {newLoad} after assign
                            </p>
                          )}
                        </div>
                        {bulkAssigning ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : exceedsLimit ? (
                          <div className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                            Max 3/day
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium">
                            +{selectedGapObjects.length}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                This will create/update shifts and assign the selected caregiver to all {selectedGapObjects.length} gaps.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
