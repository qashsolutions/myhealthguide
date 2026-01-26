'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/utils/getUserRole';
import { db, auth } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { Plus, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

import { ScheduleAlertsBanner } from './ScheduleAlertsBanner';
import { WeekStrip } from './WeekStrip';
import { DayShiftList } from './DayShiftList';

interface WeekStripScheduleProps {
  agencyId: string;
  userId: string;
}

interface Gap {
  elderId: string;
  elderName: string;
}

export function WeekStripSchedule({ agencyId, userId }: WeekStripScheduleProps) {
  const { user } = useAuth();
  const userIsSuperAdmin = checkSuperAdmin(user);

  // State
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    // Expand today by default
    return new Set([format(new Date(), 'yyyy-MM-dd')]);
  });
  const [confirmingShiftId, setConfirmingShiftId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Elders for gap detection
  const [elders, setElders] = useState<
    { id: string; name: string; groupId: string }[]
  >([]);

  // Create shift dialog state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createShiftDate, setCreateShiftDate] = useState<Date | null>(null);

  // Refs for scrolling to elements
  const dayRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Fetch elders for agency
  useEffect(() => {
    if (!agencyId) return;

    const fetchElders = async () => {
      try {
        const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
        if (!agencyDoc.exists()) return;

        const groupIds: string[] = agencyDoc.data()?.groupIds || [];
        const allElders: { id: string; name: string; groupId: string }[] = [];

        for (const gId of groupIds) {
          const elderQuery = query(
            collection(db, 'elders'),
            where('groupId', '==', gId)
          );
          const snap = await getDocs(elderQuery);
          snap.docs.forEach((d) => {
            const data = d.data();
            if (!data.archived) {
              allElders.push({
                id: d.id,
                name: data.name || data.preferredName || 'Unknown',
                groupId: gId,
              });
            }
          });
        }
        setElders(allElders);
      } catch (err) {
        console.error('Error fetching elders:', err);
      }
    };

    fetchElders();
  }, [agencyId]);

  // Real-time listener for shifts
  useEffect(() => {
    if (!userId || !agencyId) {
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
        where('caregiverId', '==', userId),
        limit(500)
      );
    }

    const unsubscribe = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        const allShifts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          confirmedAt: doc.data().confirmedAt?.toDate(),
          cancelledAt: doc.data().cancelledAt?.toDate(),
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
  }, [userId, agencyId, userIsSuperAdmin]);

  // Compute week days
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });
  }, [weekStart]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ScheduledShift[]>();
    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      map.set(dateKey, []);
    });

    shifts.forEach((shift) => {
      if (!shift.date) return;
      const dateKey = format(shift.date, 'yyyy-MM-dd');
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(shift);
      }
    });

    return map;
  }, [shifts, weekDays]);

  // Compute expected shifts per day (for coverage calculation)
  const expectedShiftsPerDay = useMemo(() => {
    const map = new Map<string, number>();
    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayShifts = shiftsByDate.get(dateKey) || [];
      // For now, expected = actual scheduled shifts (non-cancelled)
      // In future, could be based on caregiver_assignments
      const nonCancelledCount = dayShifts.filter(
        (s) => !['cancelled', 'declined'].includes(s.status)
      ).length;
      map.set(dateKey, nonCancelledCount);
    });
    return map;
  }, [weekDays, shiftsByDate]);

  // Compute gaps per day (elders without coverage)
  const gapsByDate = useMemo(() => {
    const map = new Map<string, Gap[]>();
    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayShifts = shiftsByDate.get(dateKey) || [];

      // Get elders with active shifts (non-cancelled)
      const coveredElderIds = new Set(
        dayShifts
          .filter(
            (s) =>
              s.caregiverId &&
              !['cancelled', 'declined', 'unfilled'].includes(s.status)
          )
          .map((s) => s.elderId)
      );

      // Find elders that have unfilled shifts on this day
      const unfilledGaps = dayShifts
        .filter((s) => s.status === 'unfilled' || (!s.caregiverId && s.status !== 'offered'))
        .map((s) => ({
          elderId: s.elderId,
          elderName: s.elderName,
        }));

      // Remove duplicates
      const uniqueGaps = unfilledGaps.filter(
        (gap, idx, arr) =>
          arr.findIndex((g) => g.elderId === gap.elderId) === idx
      );

      map.set(dateKey, uniqueGaps);
    });
    return map;
  }, [weekDays, shiftsByDate]);

  // Compute total gaps and unconfirmed counts for alerts banner
  const { totalGaps, totalUnconfirmed } = useMemo(() => {
    let gaps = 0;
    let unconfirmed = 0;

    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayGaps = gapsByDate.get(dateKey) || [];
      gaps += dayGaps.length;

      const dayShifts = shiftsByDate.get(dateKey) || [];
      unconfirmed += dayShifts.filter((s) =>
        ['pending_confirmation', 'scheduled'].includes(s.status) && s.caregiverId
      ).length;
    });

    return { totalGaps: gaps, totalUnconfirmed: unconfirmed };
  }, [weekDays, gapsByDate, shiftsByDate]);

  // Navigation handlers
  const handleWeekChange = useCallback((direction: 'prev' | 'next') => {
    setWeekStart((prev) =>
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.add(dateKey);
      return next;
    });
    // Scroll to the day section
    setTimeout(() => {
      const el = dayRefs.current.get(dateKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  const toggleDay = useCallback((dateKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }, []);

  // Alert banner handlers
  const scrollToFirstGap = useCallback(() => {
    for (const day of weekDays) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayGaps = gapsByDate.get(dateKey) || [];
      if (dayGaps.length > 0) {
        handleDateSelect(day);
        break;
      }
    }
  }, [weekDays, gapsByDate, handleDateSelect]);

  const scrollToFirstUnconfirmed = useCallback(() => {
    for (const day of weekDays) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayShifts = shiftsByDate.get(dateKey) || [];
      const hasUnconfirmed = dayShifts.some(
        (s) =>
          ['pending_confirmation', 'scheduled'].includes(s.status) && s.caregiverId
      );
      if (hasUnconfirmed) {
        handleDateSelect(day);
        break;
      }
    }
  }, [weekDays, shiftsByDate, handleDateSelect]);

  // Mark shift as confirmed
  const handleMarkConfirmed = useCallback(async (shiftId: string) => {
    setConfirmError(null);
    try {
      setConfirmingShiftId(shiftId);
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/shifts/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shiftId, ownerConfirm: true, note: 'Confirmed by owner' }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to confirm shift:', data.error);
        setConfirmError(data.error || 'Failed to confirm shift');
        setTimeout(() => setConfirmError(null), 3000);
      }
    } catch (err) {
      console.error('Failed to confirm shift:', err);
      setConfirmError('Network error - please try again');
      setTimeout(() => setConfirmError(null), 3000);
    } finally {
      setConfirmingShiftId(null);
    }
  }, []);

  // Open create sheet for a specific date
  const handleAddShift = useCallback((date: Date) => {
    setCreateShiftDate(date);
    setShowCreateSheet(true);
  }, []);

  // Handle shift click (edit)
  const handleShiftClick = useCallback((shift: ScheduledShift) => {
    // For now, just log. Could open edit sheet
    console.log('Shift clicked:', shift.id);
  }, []);

  // Handle assign gap
  const handleAssignGap = useCallback((elderId: string) => {
    // For now, just log. Could open create shift dialog with elder pre-selected
    console.log('Assign gap for elder:', elderId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerts Banner */}
      <ScheduleAlertsBanner
        gapsCount={totalGaps}
        unconfirmedCount={totalUnconfirmed}
        onGapsClick={scrollToFirstGap}
        onUnconfirmedClick={scrollToFirstUnconfirmed}
      />

      {/* Error message */}
      {confirmError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
          {confirmError}
        </div>
      )}

      {/* Week Strip */}
      <WeekStrip
        weekStart={weekStart}
        shifts={shifts}
        expectedShiftsPerDay={expectedShiftsPerDay}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onWeekChange={handleWeekChange}
      />

      {/* Day Sections */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayShifts = shiftsByDate.get(dateKey) || [];
          const dayGaps = gapsByDate.get(dateKey) || [];
          const isExpanded = expandedDays.has(dateKey);

          return (
            <div
              key={dateKey}
              ref={(el) => {
                dayRefs.current.set(dateKey, el);
              }}
            >
              <DayShiftList
                date={day}
                shifts={dayShifts}
                gaps={dayGaps}
                isExpanded={isExpanded}
                onToggle={() => toggleDay(dateKey)}
                onAddShift={() => handleAddShift(day)}
                onShiftClick={handleShiftClick}
                onMarkConfirmed={handleMarkConfirmed}
                onAssignGap={handleAssignGap}
                confirmingShiftId={confirmingShiftId}
                isSuperAdmin={userIsSuperAdmin}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {shifts.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            No shifts scheduled
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create shifts to get started with scheduling.
          </p>
        </div>
      )}

      {/* FAB - Create Shift (SuperAdmin only) */}
      {userIsSuperAdmin && (
        <button
          onClick={() => handleAddShift(selectedDate)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all"
          aria-label="Create shift"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
