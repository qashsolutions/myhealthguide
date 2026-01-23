'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TodayShift } from '@/components/dashboard/AgencyOwnerDashboard';

interface TodaysShiftsListProps {
  shifts: TodayShift[];
  loading: boolean;
}

type ShiftStatus = 'confirmed' | 'in_progress' | 'completed' | 'scheduled' | 'no_show' | 'cancelled';

function formatShiftTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  if (m === 0) return `${hour}${ampm}`;
  return `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
}

function resolveDisplayStatus(shift: TodayShift): ShiftStatus {
  const status = shift.status as ShiftStatus;
  if (['confirmed', 'in_progress', 'completed', 'no_show', 'cancelled'].includes(status)) {
    return status;
  }
  // 'scheduled' status — check if past start time (potential no-show)
  if (status === 'scheduled') {
    const now = new Date();
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const shiftStart = new Date();
    shiftStart.setHours(startH, startM, 0, 0);
    if (now > shiftStart) return 'no_show';
  }
  return 'scheduled';
}

const statusConfig: Record<ShiftStatus, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Confirmed' },
  scheduled: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Unconfirmed' },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'In Progress' },
  completed: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Completed' },
  no_show: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'No-Show' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-500', label: 'Cancelled' },
};

export function TodaysShiftsList({ shifts, loading }: TodaysShiftsListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Compute coverage stats
  const confirmedCount = shifts.filter(s =>
    ['confirmed', 'in_progress', 'completed'].includes(s.status)
  ).length;
  const totalCount = shifts.filter(s => s.status !== 'cancelled').length;
  const coveragePct = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;

  const coverageColor = coveragePct > 80
    ? 'bg-green-500 dark:bg-green-400'
    : coveragePct >= 50
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-red-500 dark:bg-red-400';

  const coverageTextColor = coveragePct > 80
    ? 'text-green-700 dark:text-green-300'
    : coveragePct >= 50
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-red-700 dark:text-red-300';

  // Sort: in_progress first, then confirmed, scheduled, no_show, completed, cancelled
  const statusOrder: Record<string, number> = {
    in_progress: 0, confirmed: 1, scheduled: 2, no_show: 3, completed: 4, cancelled: 5,
  };
  const sortedShifts = [...shifts].sort((a, b) => {
    const aStatus = resolveDisplayStatus(a);
    const bStatus = resolveDisplayStatus(b);
    return (statusOrder[aStatus] ?? 9) - (statusOrder[bStatus] ?? 9);
  });

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Today&apos;s Shifts</h2>

      {shifts.length === 0 ? (
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No shifts scheduled today</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/agency?tab=scheduling')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Coverage header */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Today&apos;s Coverage
              </span>
              <span className={cn('text-xs font-semibold', coverageTextColor)}>
                {confirmedCount}/{totalCount} confirmed
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', coverageColor)}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </Card>

          {/* Shift list */}
          <Card className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedShifts.map((shift) => {
              const displayStatus = resolveDisplayStatus(shift);
              const style = statusConfig[displayStatus];
              const isCancelled = displayStatus === 'cancelled';
              return (
                <div
                  key={shift.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => router.push('/dashboard/care-management')}
                >
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium truncate',
                      isCancelled
                        ? 'text-gray-400 dark:text-gray-500 line-through'
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {shift.caregiverName}
                    </div>
                    <div className={cn(
                      'text-xs',
                      isCancelled
                        ? 'text-gray-400 dark:text-gray-500 line-through'
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {formatShiftTime(shift.startTime)}–{formatShiftTime(shift.endTime)}
                      {shift.elderNames.length > 0 && (
                        <span className="ml-2">· {shift.elderNames.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap', style.bg, style.text)}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}
