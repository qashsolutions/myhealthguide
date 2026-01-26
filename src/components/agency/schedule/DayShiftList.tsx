'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  User,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

interface Gap {
  shiftId: string;
  elderId: string;
  elderName: string;
  groupId: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface DayShiftListProps {
  date: Date;
  shifts: ScheduledShift[];
  gaps: Gap[];
  isExpanded: boolean;
  onToggle: () => void;
  onAddShift: () => void;
  onShiftClick: (shift: ScheduledShift) => void;
  onMarkConfirmed: (shiftId: string) => void;
  onAssignGap: (gap: Gap) => void;
  confirmingShiftId: string | null;
  isSuperAdmin: boolean;
}

// Status badge config with clearer labels
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Check }
> = {
  pending_confirmation: {
    label: 'Awaiting',
    className: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    className: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    icon: Check,
  },
  owner_confirmed: {
    label: 'Confirmed',
    className: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    icon: Check,
  },
  scheduled: {
    label: 'Awaiting',
    className: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    className: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
    icon: Check,
  },
  offered: {
    label: 'Offered',
    className: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    icon: Clock,
  },
  unfilled: {
    label: 'Unfilled',
    className: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    icon: AlertTriangle,
  },
  declined: {
    label: 'Declined',
    className: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    icon: AlertTriangle,
  },
  expired: {
    label: 'No Response',
    className: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
    icon: Clock,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800',
    icon: Clock,
  },
  no_show: {
    label: 'No Show',
    className: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    icon: AlertTriangle,
  },
};

// Format time from "HH:mm" to "hAM/PM"
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  if (minutes === 0) return `${h}${period}`;
  return `${h}:${String(minutes).padStart(2, '0')}${period}`;
}

// Get status icon component
function getStatusIcon(status: string) {
  return STATUS_CONFIG[status]?.icon || Clock;
}

export function DayShiftList({
  date,
  shifts,
  gaps,
  isExpanded,
  onToggle,
  onAddShift,
  onShiftClick,
  onMarkConfirmed,
  onAssignGap,
  confirmingShiftId,
  isSuperAdmin,
}: DayShiftListProps) {
  // Filter out cancelled shifts for display
  const visibleShifts = shifts.filter(
    (s) => !['cancelled', 'declined'].includes(s.status)
  );

  // Compute coverage stats
  const confirmedCount = visibleShifts.filter((s) =>
    ['confirmed', 'owner_confirmed', 'in_progress', 'completed'].includes(s.status)
  ).length;
  const totalCount = visibleShifts.length;

  // Determine day status
  const today = isToday(date);
  const past = isPast(date) && !today;
  const hasGaps = gaps.length > 0;
  const allConfirmed = totalCount > 0 && confirmedCount === totalCount;

  // Get header color based on status
  const getHeaderBg = () => {
    if (past) return 'bg-gray-50 dark:bg-gray-800/30';
    if (hasGaps) return 'bg-amber-50 dark:bg-amber-900/10';
    if (allConfirmed) return 'bg-green-50 dark:bg-green-900/10';
    return 'bg-white dark:bg-gray-800';
  };

  const getHeaderBorder = () => {
    if (past) return 'border-gray-200 dark:border-gray-700';
    if (hasGaps) return 'border-amber-200 dark:border-amber-800';
    if (allConfirmed) return 'border-green-200 dark:border-green-800';
    return 'border-gray-200 dark:border-gray-700';
  };

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        getHeaderBorder(),
        isExpanded ? 'shadow-sm' : ''
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
          getHeaderBg(),
          !past && 'hover:bg-gray-50 dark:hover:bg-gray-750'
        )}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-sm font-semibold uppercase',
                  today
                    ? 'text-blue-600 dark:text-blue-400'
                    : past
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-gray-100'
                )}
              >
                {today ? 'Today' : format(date, 'EEEE')}, {format(date, 'MMM d')}
              </span>

              {/* Status indicator */}
              {totalCount > 0 && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    hasGaps
                      ? 'text-amber-600 dark:text-amber-400'
                      : allConfirmed
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {hasGaps
                    ? `${gaps.length} gap${gaps.length !== 1 ? 's' : ''}`
                    : allConfirmed
                      ? 'All covered ✓'
                      : `${confirmedCount}/${totalCount} confirmed`}
                </span>
              )}
            </div>

            {totalCount === 0 && gaps.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                No shifts
              </span>
            )}
          </div>
        </div>

        {/* Add button (super admin only) */}
        {isSuperAdmin && !past && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddShift();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Add shift"
          >
            <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {visibleShifts.length === 0 && gaps.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No shifts scheduled
              </p>
              {isSuperAdmin && !past && (
                <button
                  onClick={onAddShift}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Create shift
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* Shift rows */}
              {visibleShifts
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                .map((shift) => {
                  const statusInfo =
                    STATUS_CONFIG[shift.status] || STATUS_CONFIG.scheduled;
                  const StatusIcon = getStatusIcon(shift.status);
                  const needsConfirmation =
                    ['pending_confirmation', 'scheduled'].includes(shift.status) &&
                    shift.caregiverId;
                  const isConfirming = confirmingShiftId === shift.id;
                  // Check if shift is unfilled (needs caregiver assignment)
                  const isUnfilled = shift.status === 'unfilled' || !shift.caregiverId;

                  return (
                    <div
                      key={shift.id}
                      onClick={() => {
                        // For unfilled shifts, open the assign caregiver sheet
                        if (isUnfilled && isSuperAdmin) {
                          onAssignGap({
                            shiftId: shift.id,
                            elderId: shift.elderId,
                            elderName: shift.elderName,
                            groupId: shift.groupId,
                            date: shift.date,
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                          });
                        } else {
                          onShiftClick(shift);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                        'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                    >
                      {/* Status icon */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          statusInfo.className
                        )}
                      >
                        <StatusIcon className="w-4 h-4" />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {shift.caregiverName || 'Unassigned'}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">→</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {shift.elderName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </span>
                      </div>

                      {/* Actions / Status */}
                      {needsConfirmation && isSuperAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkConfirmed(shift.id);
                          }}
                          disabled={isConfirming}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                            'hover:bg-blue-200 dark:hover:bg-blue-900/50',
                            isConfirming && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {isConfirming ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              Confirm
                            </>
                          )}
                        </button>
                      )}

                      {!needsConfirmation && (
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap',
                            statusInfo.className
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                  );
                })}

              {/* Gap rows */}
              {gaps.map((gap) => (
                <div
                  key={gap.elderId}
                  className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/10"
                >
                  {/* Warning icon */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      Gap: {gap.elderName} needs coverage
                    </span>
                  </div>

                  {/* Assign button */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => onAssignGap(gap)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]'
                      )}
                    >
                      <User className="w-3 h-3" />
                      Assign
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
