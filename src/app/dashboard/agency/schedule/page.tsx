'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/utils/getUserRole';
import { db, auth } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Zap,
  X,
  Check,
  Loader2
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

  // Phase 2: Assignment sheet state
  const [selectedShift, setSelectedShift] = useState<ScheduledShift | null>(null);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [caregivers, setCaregivers] = useState<{ id: string; name: string }[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const userAgency = user?.agencies?.[0];
  const agencyId = userAgency?.agencyId;

  // Fetch caregiver names from agency
  const fetchCaregivers = useCallback(async () => {
    if (!agencyId) return;
    setLoadingCaregivers(true);
    try {
      // Get agency doc to get caregiverIds
      const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
      if (!agencyDoc.exists()) {
        setLoadingCaregivers(false);
        return;
      }
      const caregiverIds: string[] = agencyDoc.data()?.caregiverIds || [];
      if (caregiverIds.length === 0) {
        setCaregivers([]);
        setLoadingCaregivers(false);
        return;
      }

      // Call API to resolve names
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setLoadingCaregivers(false);
        return;
      }

      const res = await fetch('/api/agency/caregiver-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds: caregiverIds, agencyId })
      });

      if (res.ok) {
        const data = await res.json();
        const names: Record<string, string> = data.names || {};
        const list = caregiverIds.map(id => ({
          id,
          name: names[id] || `User ${id.substring(0, 6)}`
        }));
        setCaregivers(list);
      }
    } catch (err) {
      console.error('Error fetching caregivers:', err);
    } finally {
      setLoadingCaregivers(false);
    }
  }, [agencyId]);

  // Open assignment sheet
  const openAssignSheet = useCallback((shift: ScheduledShift) => {
    setSelectedShift(shift);
    setShowAssignSheet(true);
    setAssignError(null);
    if (caregivers.length === 0) {
      fetchCaregivers();
    }
  }, [caregivers.length, fetchCaregivers]);

  // Close assignment sheet
  const closeAssignSheet = useCallback(() => {
    setShowAssignSheet(false);
    setSelectedShift(null);
    setAssignError(null);
  }, []);

  // Assign caregiver to shift
  const assignCaregiver = useCallback(async (caregiverId: string, caregiverName: string) => {
    if (!selectedShift?.id) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const shiftRef = doc(db, 'scheduledShifts', selectedShift.id);
      await updateDoc(shiftRef, {
        caregiverId,
        caregiverName,
        status: 'scheduled',
        updatedAt: serverTimestamp()
      });
      closeAssignSheet();
    } catch (err: any) {
      console.error('Error assigning caregiver:', err);
      setAssignError(err.message || 'Failed to assign caregiver');
    } finally {
      setAssigning(false);
    }
  }, [selectedShift, closeAssignSheet]);

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

  // Week view data
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);
  const weekDays = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    return days.map(day => {
      const dayFilteredShifts = shifts
        .filter(s => s.date && isSameDay(s.date, day) && s.status !== 'cancelled');
      const totalShifts = dayFilteredShifts.length;
      const filledShifts = dayFilteredShifts.filter(s => s.caregiverId && s.status !== 'unfilled' && s.status !== 'offered').length;
      const unfilledShifts = totalShifts - filledShifts;
      const totalHours = dayFilteredShifts.reduce((sum, s) => {
        if (!s.startTime || !s.endTime) return sum;
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
      }, 0);
      return { date: day, totalShifts, filledShifts, unfilledShifts, totalHours };
    });
  }, [weekStart, shifts]);

  // Navigation handlers
  const goToPrevDay = () => setSelectedDate(prev => viewMode === 'week' ? subWeeks(prev, 1) : subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => viewMode === 'week' ? addWeeks(prev, 1) : addDays(prev, 1));
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
            aria-label={viewMode === 'week' ? 'Previous week' : 'Previous day'}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-center">
            {viewMode === 'week' ? (
              <>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {weekDays.reduce((s, d) => s + d.totalShifts, 0)} shifts
                  {weekDays.reduce((s, d) => s + d.unfilledShifts, 0) > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {' '}&bull; {weekDays.reduce((s, d) => s + d.unfilledShifts, 0)} unfilled
                    </span>
                  )}
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          <button
            onClick={goToNextDay}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100"
            aria-label={viewMode === 'week' ? 'Next week' : 'Next day'}
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Quick navigation chips (day mode only) */}
        {viewMode === 'day' && (
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
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {viewMode === 'week' ? (
          // Week View: 7 day cards
          loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-20" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {weekDays.map(({ date, totalShifts, filledShifts, unfilledShifts, totalHours }) => {
                const today = isToday(date);
                const hasUnfilled = unfilledShifts > 0;
                const allFilled = totalShifts > 0 && unfilledShifts === 0;

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setSelectedDate(date);
                      setViewMode('day');
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors active:scale-[0.99]',
                      today
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        : hasUnfilled
                          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                    )}
                  >
                    {/* Day number + name */}
                    <div className="w-12 flex-shrink-0 text-center">
                      <p className={cn(
                        'text-2xl font-bold',
                        today
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-900 dark:text-gray-100'
                      )}>
                        {format(date, 'd')}
                      </p>
                      <p className={cn(
                        'text-xs font-medium',
                        today
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}>
                        {format(date, 'EEE')}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 min-w-0">
                      {totalShifts === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No shifts</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {totalShifts} shift{totalShifts !== 1 ? 's' : ''}
                            <span className="text-gray-400 dark:text-gray-500"> &bull; </span>
                            <span className="text-gray-500 dark:text-gray-400">{totalHours.toFixed(1)}h</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {filledShifts > 0 && (
                              <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                                {filledShifts} filled
                              </span>
                            )}
                            {unfilledShifts > 0 && (
                              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                {unfilledShifts} unfilled
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      {totalShifts === 0 ? (
                        <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600" />
                      ) : allFilled ? (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      ) : hasUnfilled ? (
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      ) : null}
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )
        ) : loading ? (
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
                        onClick={() => openAssignSheet(shift)}
                      >
                        <Zap className="w-4 h-4" />
                        Assign Caregiver
                      </button>
                    ) : (
                      <button
                        className="w-full flex items-center justify-between mt-1 text-left"
                        onClick={() => userIsSuperAdmin ? openAssignSheet(shift) : undefined}
                        disabled={!userIsSuperAdmin}
                      >
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
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase 2: Assignment Bottom Sheet */}
      {showAssignSheet && selectedShift && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeAssignSheet}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Assign Caregiver
              </h2>
              <button
                onClick={closeAssignSheet}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Shift Details */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedShift.elderName || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}
                    {selectedShift.date && ` • ${format(selectedShift.date, 'MMM d')}`}
                  </p>
                </div>
              </div>
              {selectedShift.caregiverId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Currently: <span className="font-medium">{selectedShift.caregiverName || 'Unknown'}</span>
                </p>
              )}
            </div>

            {/* Error */}
            {assignError && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                {assignError}
              </div>
            )}

            {/* Caregiver List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingCaregivers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Loading caregivers...</span>
                </div>
              ) : caregivers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No caregivers found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {caregivers.map((cg) => {
                    const isCurrentlyAssigned = selectedShift.caregiverId === cg.id;
                    return (
                      <button
                        key={cg.id}
                        onClick={() => !isCurrentlyAssigned && !assigning && assignCaregiver(cg.id, cg.name)}
                        disabled={assigning || isCurrentlyAssigned}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                          isCurrentlyAssigned
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          isCurrentlyAssigned
                            ? 'bg-blue-100 dark:bg-blue-900/40'
                            : 'bg-gray-100 dark:bg-gray-700'
                        )}>
                          <User className={cn(
                            'w-4 h-4',
                            isCurrentlyAssigned
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-500 dark:text-gray-400'
                          )} />
                        </div>
                        <span className={cn(
                          'flex-1 text-sm font-medium',
                          isCurrentlyAssigned
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-gray-100'
                        )}>
                          {cg.name}
                        </span>
                        {isCurrentlyAssigned && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                        {assigning && !isCurrentlyAssigned && (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
