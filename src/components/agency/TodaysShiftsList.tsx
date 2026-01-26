'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, Check, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/config';
import type { TodayShift } from '@/components/dashboard/AgencyOwnerDashboard';

interface TodaysShiftsListProps {
  shifts: TodayShift[];
  loading: boolean;
  onRefresh?: () => void;
}

type ShiftStatus = 'confirmed' | 'owner_confirmed' | 'in_progress' | 'completed' |
                   'scheduled' | 'pending_confirmation' | 'no_show' | 'cancelled' |
                   'declined' | 'expired';

function formatShiftTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  if (m === 0) return `${hour}${ampm}`;
  return `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
}

// Map database status to display status
function resolveDisplayStatus(shift: TodayShift): ShiftStatus {
  const status = shift.status as ShiftStatus;
  const validStatuses: ShiftStatus[] = [
    'confirmed', 'owner_confirmed', 'in_progress', 'completed',
    'scheduled', 'pending_confirmation', 'no_show', 'cancelled',
    'declined', 'expired'
  ];
  if (validStatuses.includes(status)) {
    return status;
  }
  return 'scheduled';
}

// Status configuration with clearer labels for owners
const statusConfig: Record<ShiftStatus, { bg: string; text: string; label: string; showAction?: boolean }> = {
  pending_confirmation: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Awaiting Response', showAction: true },
  scheduled: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Awaiting Response', showAction: true },
  confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Confirmed' },
  owner_confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Confirmed ✓' },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'In Progress' },
  completed: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Completed' },
  no_show: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'No-Show' },
  declined: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Declined' },
  expired: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-500', label: 'No Response' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-500', label: 'Cancelled' },
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export function TodaysShiftsList({ shifts, loading, onRefresh }: TodaysShiftsListProps) {
  const router = useRouter();
  const [confirmingShiftId, setConfirmingShiftId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleMarkConfirmed = async (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation(); // Prevent navigation
    setConfirmError(null);
    try {
      setConfirmingShiftId(shiftId);
      const response = await fetchWithAuth('/api/shifts/confirm', {
        method: 'POST',
        body: JSON.stringify({ shiftId, ownerConfirm: true, note: 'Confirmed by owner' }),
      });
      const data = await response.json();
      if (data.success) {
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to confirm shift:', data.error);
        setConfirmError(data.error || 'Failed to confirm shift');
        // Clear error after 3 seconds
        setTimeout(() => setConfirmError(null), 3000);
      }
    } catch (err) {
      console.error('Failed to confirm shift:', err);
      setConfirmError('Network error - please try again');
      setTimeout(() => setConfirmError(null), 3000);
    } finally {
      setConfirmingShiftId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Compute coverage stats - include owner_confirmed in confirmed count
  const confirmedCount = shifts.filter(s =>
    ['confirmed', 'owner_confirmed', 'in_progress', 'completed'].includes(s.status)
  ).length;
  const totalCount = shifts.filter(s => !['cancelled', 'declined'].includes(s.status)).length;
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

  // Sort: pending first, then in_progress, confirmed, no_show, declined, completed, cancelled
  const statusOrder: Record<string, number> = {
    pending_confirmation: 0,
    scheduled: 1,
    in_progress: 2,
    confirmed: 3,
    owner_confirmed: 3,
    no_show: 4,
    declined: 5,
    expired: 6,
    completed: 7,
    cancelled: 8,
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
              onClick={() => router.push('/dashboard/agency/schedule')}
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

          {/* Error message */}
          {confirmError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-sm text-red-700 dark:text-red-300">
              {confirmError}
            </div>
          )}

          {/* Shift list */}
          <Card className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedShifts.map((shift) => {
              const displayStatus = resolveDisplayStatus(shift);
              const style = statusConfig[displayStatus];
              const isCancelled = displayStatus === 'cancelled';
              const showConfirmAction = style.showAction && !isCancelled;
              const isConfirming = confirmingShiftId === shift.id;

              return (
                <div
                  key={shift.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => router.push('/dashboard/agency/schedule')}
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

                  {/* Action button for pending shifts */}
                  {showConfirmAction && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={(e) => handleMarkConfirmed(e, shift.id)}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Mark Confirmed
                        </>
                      )}
                    </Button>
                  )}

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
