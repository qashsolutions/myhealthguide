'use client';

import { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ChevronDown, ChevronRight, User, Clock, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

interface ByCaregiverTabProps {
  weekStart: Date;
  weekDays: Date[];
  shifts: ScheduledShift[];
  caregivers: { id: string; name: string }[];
  onShiftClick: (shift: ScheduledShift) => void;
  onAssignGap?: (gap: { shiftId: string; elderId: string; elderName: string; date: Date; startTime: string; endTime: string }) => void;
}

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; className: string; icon?: 'check' | 'warning' }> = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    icon: 'check',
  },
  owner_confirmed: {
    label: 'Confirmed',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    icon: 'check',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  pending_confirmation: {
    label: 'Awaiting',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  },
  unfilled: {
    label: 'Unfilled',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    icon: 'warning',
  },
  declined: {
    label: 'Declined',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
  no_show: {
    label: 'No Show',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500',
  },
};

// Format time from "HH:mm" to "h:mm AM/PM"
function formatTime(time: string): string {
  if (!time) return '--';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function ByCaregiverTab({
  weekStart,
  weekDays,
  shifts,
  caregivers,
  onShiftClick,
  onAssignGap,
}: ByCaregiverTabProps) {
  // Track which caregivers are expanded
  const [expandedCaregivers, setExpandedCaregivers] = useState<Set<string>>(() => {
    // Expand first caregiver by default if there are any
    if (caregivers.length > 0) {
      return new Set([caregivers[0].id]);
    }
    return new Set();
  });

  // Group shifts by caregiver, then by day
  const caregiverData = useMemo(() => {
    const data: Map<string, {
      caregiver: { id: string; name: string };
      totalShifts: number;
      shiftsByDay: Map<string, ScheduledShift[]>;
      loadByDay: Map<string, number>;
    }> = new Map();

    // Initialize all caregivers
    caregivers.forEach((cg) => {
      const shiftsByDay = new Map<string, ScheduledShift[]>();
      const loadByDay = new Map<string, number>();

      weekDays.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        shiftsByDay.set(dateKey, []);
        loadByDay.set(dateKey, 0);
      });

      data.set(cg.id, {
        caregiver: cg,
        totalShifts: 0,
        shiftsByDay,
        loadByDay,
      });
    });

    // Populate with shifts
    shifts.forEach((shift) => {
      if (!shift.caregiverId || !shift.date) return;
      if (['cancelled', 'declined'].includes(shift.status)) return;

      const caregiverEntry = data.get(shift.caregiverId);
      if (!caregiverEntry) return;

      const dateKey = format(shift.date, 'yyyy-MM-dd');
      const dayShifts = caregiverEntry.shiftsByDay.get(dateKey);

      if (dayShifts) {
        dayShifts.push(shift);
        caregiverEntry.totalShifts++;
        caregiverEntry.loadByDay.set(dateKey, (caregiverEntry.loadByDay.get(dateKey) || 0) + 1);
      }
    });

    // Sort shifts within each day by start time
    data.forEach((entry) => {
      entry.shiftsByDay.forEach((dayShifts) => {
        dayShifts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      });
    });

    return data;
  }, [caregivers, weekDays, shifts]);

  // Toggle caregiver expansion
  const toggleCaregiver = (caregiverId: string) => {
    setExpandedCaregivers((prev) => {
      const next = new Set(prev);
      if (next.has(caregiverId)) {
        next.delete(caregiverId);
      } else {
        next.add(caregiverId);
      }
      return next;
    });
  };

  // Expand all caregivers
  const expandAll = () => {
    setExpandedCaregivers(new Set(caregivers.map((c) => c.id)));
  };

  // Collapse all caregivers
  const collapseAll = () => {
    setExpandedCaregivers(new Set());
  };

  if (caregivers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          No caregivers found
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add caregivers to your agency to see their schedules here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Expand/Collapse All */}
      <div className="flex justify-end gap-2">
        <button
          onClick={expandAll}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Expand All
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Collapse All
        </button>
      </div>

      {/* Caregiver Sections */}
      {caregivers.map((caregiver) => {
        const entry = caregiverData.get(caregiver.id);
        if (!entry) return null;

        const isExpanded = expandedCaregivers.has(caregiver.id);
        const hasShifts = entry.totalShifts > 0;

        return (
          <div
            key={caregiver.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Caregiver Header */}
            <button
              onClick={() => toggleCaregiver(caregiver.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              {/* Expand/Collapse Icon */}
              <div className="text-gray-400 dark:text-gray-500">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              {/* Name and Count */}
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {caregiver.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.totalShifts} shift{entry.totalShifts !== 1 ? 's' : ''} this week
                </p>
              </div>

              {/* Daily Load Indicators */}
              <div className="hidden sm:flex items-center gap-1">
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const load = entry.loadByDay.get(dateKey) || 0;
                  const isSunday = day.getDay() === 0;

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        'w-6 h-6 rounded text-xs font-medium flex items-center justify-center',
                        isSunday
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          : load >= 3
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : load > 0
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      )}
                      title={`${format(day, 'EEE')}: ${load} shift${load !== 1 ? 's' : ''}`}
                    >
                      {isSunday ? '-' : load}
                    </div>
                  );
                })}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                {!hasShifts ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No shifts scheduled for this week
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {weekDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayShifts = entry.shiftsByDay.get(dateKey) || [];
                      const isSunday = day.getDay() === 0;

                      if (isSunday || dayShifts.length === 0) return null;

                      return (
                        <div key={dateKey} className="px-4 py-3">
                          {/* Day Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {format(day, 'EEEE, MMM d')}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              ({dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''})
                            </span>
                          </div>

                          {/* Shifts */}
                          <div className="space-y-2">
                            {dayShifts.map((shift) => {
                              const statusConfig = STATUS_CONFIG[shift.status] || {
                                label: shift.status,
                                className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                              };

                              return (
                                <button
                                  key={shift.id}
                                  onClick={() => onShiftClick(shift)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
                                >
                                  {/* Status Icon */}
                                  <div className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                    statusConfig.icon === 'check'
                                      ? 'bg-green-100 dark:bg-green-900/30'
                                      : statusConfig.icon === 'warning'
                                        ? 'bg-amber-100 dark:bg-amber-900/30'
                                        : 'bg-gray-100 dark:bg-gray-700'
                                  )}>
                                    {statusConfig.icon === 'check' ? (
                                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    ) : statusConfig.icon === 'warning' ? (
                                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    )}
                                  </div>

                                  {/* Elder Name */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {shift.elderName || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                                    </p>
                                  </div>

                                  {/* Status Badge */}
                                  <span className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                    statusConfig.className
                                  )}>
                                    {statusConfig.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned Shifts Section */}
      {(() => {
        const unassignedShifts = shifts.filter(
          (s) =>
            !s.caregiverId &&
            s.status !== 'cancelled' &&
            s.date
        );

        if (unassignedShifts.length === 0) return null;

        // Group by day
        const unassignedByDay = new Map<string, ScheduledShift[]>();
        weekDays.forEach((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          unassignedByDay.set(dateKey, []);
        });

        unassignedShifts.forEach((shift) => {
          if (!shift.date) return;
          const dateKey = format(shift.date, 'yyyy-MM-dd');
          const dayShifts = unassignedByDay.get(dateKey);
          if (dayShifts) {
            dayShifts.push(shift);
          }
        });

        return (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                Unassigned Shifts ({unassignedShifts.length})
              </h3>
            </div>

            <div className="divide-y divide-amber-200/50 dark:divide-amber-800/50">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayShifts = unassignedByDay.get(dateKey) || [];
                const isSunday = day.getDay() === 0;

                if (isSunday || dayShifts.length === 0) return null;

                return (
                  <div key={dateKey} className="px-4 py-3">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                      {format(day, 'EEEE, MMM d')}
                    </div>
                    <div className="space-y-2">
                      {dayShifts.map((shift) => (
                        <button
                          key={shift.id}
                          onClick={() => {
                            if (onAssignGap) {
                              onAssignGap({
                                shiftId: shift.id,
                                elderId: shift.elderId,
                                elderName: shift.elderName,
                                date: shift.date!,
                                startTime: shift.startTime,
                                endTime: shift.endTime,
                              });
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-left border border-amber-200 dark:border-amber-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {shift.elderName || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                            Assign
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
