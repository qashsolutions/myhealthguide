'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/utils/getUserRole';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit
} from 'firebase/firestore';
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  startOfDay
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmed',
    className: 'text-green-700 dark:text-green-400'
  },
  scheduled: {
    label: 'Scheduled',
    className: 'text-blue-700 dark:text-blue-400'
  },
  in_progress: {
    label: 'In Progress',
    className: 'text-blue-700 dark:text-blue-400'
  },
  completed: {
    label: 'Completed',
    className: 'text-gray-500 dark:text-gray-400'
  },
  offered: {
    label: 'Pending',
    className: 'text-amber-700 dark:text-amber-400'
  },
  unfilled: {
    label: 'Unfilled',
    className: 'text-red-700 dark:text-red-400'
  },
  cancelled: {
    label: 'Cancelled',
    className: 'text-red-500 dark:text-red-400'
  },
  no_show: {
    label: 'No Show',
    className: 'text-red-700 dark:text-red-400'
  }
};

// Format time from "HH:mm" to "h:mm AM/PM"
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Get hour label for timeline (e.g., "9 AM")
function getHourLabel(time: string): string {
  const [hours] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h} ${period}`;
}

export default function AgencySchedulePage() {
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();
  const userIsSuperAdmin = checkSuperAdmin(user);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(true);

  const userAgency = user?.agencies?.[0];
  const agencyId = userAgency?.agencyId;

  // Real-time listener for shifts
  useEffect(() => {
    if (!user?.id || !isMultiAgency || !agencyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Build query based on role
    let shiftsQuery;
    if (userIsSuperAdmin) {
      // Super admin sees all agency shifts
      shiftsQuery = query(
        collection(db, 'scheduledShifts'),
        where('agencyId', '==', agencyId),
        limit(500)
      );
    } else {
      // Caregiver sees only their assigned shifts
      shiftsQuery = query(
        collection(db, 'scheduledShifts'),
        where('caregiverId', '==', user.id),
        limit(500)
      );
    }

    const unsubscribe = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        const allShifts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          confirmedAt: doc.data().confirmedAt?.toDate(),
          cancelledAt: doc.data().cancelledAt?.toDate()
        })) as ScheduledShift[];

        setShifts(allShifts);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to shifts:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id, agencyId, isMultiAgency, userIsSuperAdmin]);

  // Filter shifts for selected date
  const dayShifts = useMemo(() => {
    return shifts
      .filter(shift => {
        if (!shift.date) return false;
        return isSameDay(shift.date, selectedDate);
      })
      .filter(shift => shift.status !== 'cancelled')
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [shifts, selectedDate]);

  // Count shifts needing assignment
  const needsAssignmentCount = dayShifts.filter(
    s => s.status === 'unfilled' || s.status === 'offered' || !s.caregiverId
  ).length;

  // Navigation handlers
  const goToPrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(startOfDay(new Date()));
  const goToTomorrow = () => setSelectedDate(addDays(startOfDay(new Date()), 1));

  // Get the start of this weekend (Saturday)
  const goToWeekend = () => {
    const today = startOfDay(new Date());
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    setSelectedDate(addDays(today, daysUntilSaturday));
  };

  // Check if a shift needs assignment
  const needsAssignment = (shift: ScheduledShift) => {
    return shift.status === 'unfilled' || shift.status === 'offered' || !shift.caregiverId;
  };

  if (!isMultiAgency) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Schedule view is available for Multi-Agency plans.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Schedule
          </h1>

          {/* Day/Week Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'day'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevDay}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isToday(selectedDate)
                ? `Today, ${format(selectedDate, 'MMMM d')}`
                : format(selectedDate, 'EEEE, MMMM d')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
              {needsAssignmentCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}&bull; {needsAssignmentCount} need{needsAssignmentCount !== 1 ? '' : 's'} assignment
                </span>
              )}
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Quick navigation chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={goToToday}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
              isToday(selectedDate)
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            Today
          </button>
          <button
            onClick={goToTomorrow}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
              isSameDay(selectedDate, addDays(startOfDay(new Date()), 1))
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            Tomorrow
          </button>
          <button
            onClick={goToWeekend}
            className="px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            This Weekend
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-12 pt-1">
                  <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : dayShifts.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              No shifts scheduled
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isToday(selectedDate)
                ? 'No shifts scheduled for today.'
                : `No shifts for ${format(selectedDate, 'MMMM d, yyyy')}.`}
            </p>
          </div>
        ) : (
          // Shift cards timeline
          <div className="space-y-3">
            {dayShifts.map((shift) => {
              const isUnassigned = needsAssignment(shift);
              const statusInfo = STATUS_CONFIG[shift.status] || STATUS_CONFIG.scheduled;

              return (
                <div key={shift.id} className="flex gap-3">
                  {/* Time label */}
                  <div className="w-12 pt-2 flex-shrink-0">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                      {getHourLabel(shift.startTime)}
                    </span>
                  </div>

                  {/* Shift card */}
                  <div
                    className={cn(
                      'flex-1 rounded-xl p-3.5 border transition-colors',
                      isUnassigned
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    {/* Time range */}
                    <p className={cn(
                      'text-xs font-semibold mb-2',
                      isUnassigned
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </p>

                    {/* Elder info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {shift.elderName || 'Unknown'}
                        </p>
                        {shift.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {shift.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Caregiver / Assignment */}
                    {isUnassigned ? (
                      <button
                        className="w-full mt-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium active:scale-[0.98] transition-transform"
                        onClick={() => {/* Phase 2: open assignment sheet */}}
                      >
                        <Zap className="w-4 h-4" />
                        Assign Caregiver
                      </button>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {shift.caregiverName || 'Unknown'}
                          </span>
                        </div>
                        <span className={cn('text-xs font-medium flex items-center gap-1', statusInfo.className)}>
                          {(shift.status === 'confirmed' || shift.status === 'completed') && '✓ '}
                          {statusInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
