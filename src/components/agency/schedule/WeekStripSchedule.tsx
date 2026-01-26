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
import { Plus, Calendar, Loader2, X, User, Clock, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';

import { ScheduleAlertsBanner } from './ScheduleAlertsBanner';
import { WeekStrip } from './WeekStrip';
import { DayShiftList } from './DayShiftList';
import { ScheduleTabs, type ScheduleTabType } from './ScheduleTabs';
import { WeekSummaryTab } from './WeekSummaryTab';
import { ByCaregiverTab } from './ByCaregiverTab';
import { GapsOnlyTab } from './GapsOnlyTab';
import { CopyWeekSheet } from './CopyWeekSheet';

interface WeekStripScheduleProps {
  agencyId: string;
  userId: string;
}

interface Gap {
  shiftId: string;
  elderId: string;
  elderName: string;
  groupId: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface Caregiver {
  id: string;
  name: string;
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

  // Tab state - default to Week Summary
  const [activeTab, setActiveTab] = useState<ScheduleTabType>('summary');

  // Elders for gap detection
  const [elders, setElders] = useState<
    { id: string; name: string; groupId: string }[]
  >([]);

  // Create shift dialog state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createShiftDate, setCreateShiftDate] = useState<Date | null>(null);

  // Assign caregiver sheet state
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [assigningGap, setAssigningGap] = useState<Gap | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [assigningCaregiverId, setAssigningCaregiverId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Copy week sheet state
  const [showCopySheet, setShowCopySheet] = useState(false);

  // Refs for scrolling to elements
  const dayRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Fetch elders for agency
  useEffect(() => {
    if (!agencyId) return;

    const fetchElders = async () => {
      try {
        const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
        if (!agencyDoc.exists()) return;

        const agencyData = agencyDoc.data();
        const groupIds: string[] = agencyData?.groupIds || [];
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

  // Fetch caregivers via API (uses Admin SDK to bypass security rules)
  useEffect(() => {
    if (!agencyId) return;

    const fetchCaregivers = async () => {
      try {
        const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
        if (!agencyDoc.exists()) return;

        const caregiverIds: string[] = agencyDoc.data()?.caregiverIds || [];
        if (caregiverIds.length === 0) {
          setCaregivers([]);
          return;
        }

        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/agency/caregiver-names', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userIds: caregiverIds, agencyId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.names) {
            // Convert Record<string, string> to array format
            const caregiverList = Object.entries(data.names).map(([id, name]) => ({
              id,
              name: name as string,
            }));
            setCaregivers(caregiverList);
          }
        } else {
          // Fallback: use IDs as names
          console.warn('Failed to fetch caregiver names, using IDs');
          setCaregivers(caregiverIds.map((id) => ({ id, name: id })));
        }
      } catch (err) {
        console.error('Error fetching caregivers:', err);
      }
    };

    fetchCaregivers();
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

  // Compute gaps per day (unfilled shifts + elders without any shift)
  const gapsByDate = useMemo(() => {
    const map = new Map<string, Gap[]>();
    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayShifts = shiftsByDate.get(dateKey) || [];
      const gaps: Gap[] = [];

      // Get elders who already have shifts (any status)
      const eldersWithShifts = new Set(dayShifts.map((s) => s.elderId));

      // 1. Find shifts that are unfilled (no caregiver assigned)
      dayShifts
        .filter((s) => s.status === 'unfilled' || (!s.caregiverId && s.status !== 'offered'))
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

      // 2. Find elders WITHOUT any shift for this day (missing shifts)
      // Skip Sunday (day index 0) as it's typically a day off
      if (day.getDay() !== 0) {
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
      }

      map.set(dateKey, gaps);
    });
    return map;
  }, [weekDays, shiftsByDate, elders]);

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

  // Handle assign gap - open assignment sheet
  const handleAssignGap = useCallback((gap: Gap) => {
    setAssigningGap(gap);
    setShowAssignSheet(true);
    setAssignError(null);
  }, []);

  // Handle caregiver click from Week Summary - switch to By Caregiver tab
  const handleCaregiverClick = useCallback((caregiverId: string) => {
    setActiveTab('caregiver');
    // Future enhancement: scroll to specific caregiver section
  }, []);

  // Handle elder click from Week Summary - switch to By Elder tab
  const handleElderClick = useCallback((elderId: string) => {
    console.log('Elder clicked:', elderId);
    // In future, could filter By Elder view to show specific elder
    setActiveTab('elder');
  }, []);

  // Handle cell click from Week Summary - open assign sheet for gap
  const handleSummaryCellClick = useCallback((elderId: string, date: Date) => {
    const elder = elders.find((e) => e.id === elderId);
    if (!elder) return;

    // Create a gap object for the assignment sheet
    const gap: Gap = {
      shiftId: '',
      elderId,
      elderName: elder.name,
      groupId: elder.groupId,
      date,
      startTime: '09:00',
      endTime: '17:00',
    };

    // Check if there's an existing unfilled shift for this elder on this date
    const existingShift = shifts.find(
      (s) =>
        s.elderId === elderId &&
        s.date &&
        isSameDay(s.date, date) &&
        (s.status === 'unfilled' || !s.caregiverId)
    );

    if (existingShift) {
      gap.shiftId = existingShift.id;
      gap.startTime = existingShift.startTime || '09:00';
      gap.endTime = existingShift.endTime || '17:00';
    }

    handleAssignGap(gap);
  }, [elders, shifts, handleAssignGap]);

  // Assign caregiver to shift
  const handleAssignCaregiver = useCallback(async (caregiverId: string) => {
    if (!assigningGap) return;

    setAssignError(null);
    setAssigningCaregiverId(caregiverId);

    try {
      const caregiver = caregivers.find((c) => c.id === caregiverId);
      if (!caregiver) {
        setAssignError('Caregiver not found');
        return;
      }

      // Find elder info for group
      const elder = elders.find((e) => e.id === assigningGap.elderId);

      if (assigningGap.shiftId) {
        // Update existing shift with the caregiver
        const shiftRef = doc(db, 'scheduledShifts', assigningGap.shiftId);
        await updateDoc(shiftRef, {
          caregiverId: caregiverId,
          caregiverName: caregiver.name,
          status: 'scheduled',
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new shift (elder had no shift for this day)
        const { addDoc, Timestamp } = await import('firebase/firestore');
        const newShift = {
          agencyId,
          groupId: elder?.groupId || '',
          elderId: assigningGap.elderId,
          elderName: assigningGap.elderName,
          caregiverId: caregiverId,
          caregiverName: caregiver.name,
          date: Timestamp.fromDate(assigningGap.date),
          startTime: assigningGap.startTime,
          endTime: assigningGap.endTime,
          duration: 480, // 8 hours default
          status: 'scheduled',
          isRecurring: false,
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'scheduledShifts'), newShift);
      }

      // Close sheet
      setShowAssignSheet(false);
      setAssigningGap(null);
    } catch (err) {
      console.error('Error assigning caregiver:', err);
      setAssignError('Failed to assign caregiver. Please try again.');
    } finally {
      setAssigningCaregiverId(null);
    }
  }, [assigningGap, caregivers, elders, agencyId, userId]);

  // Bulk assign multiple gaps to a caregiver
  const handleBulkAssign = useCallback(async (
    gaps: Gap[],
    caregiverId: string,
    caregiverName: string
  ) => {
    const { addDoc, Timestamp } = await import('firebase/firestore');

    for (const gap of gaps) {
      const elder = elders.find((e) => e.id === gap.elderId);

      if (gap.shiftId) {
        // Update existing shift
        const shiftRef = doc(db, 'scheduledShifts', gap.shiftId);
        await updateDoc(shiftRef, {
          caregiverId,
          caregiverName,
          status: 'scheduled',
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new shift
        const newShift = {
          agencyId,
          groupId: elder?.groupId || gap.groupId || '',
          elderId: gap.elderId,
          elderName: gap.elderName,
          caregiverId,
          caregiverName,
          date: Timestamp.fromDate(gap.date),
          startTime: gap.startTime,
          endTime: gap.endTime,
          duration: 480,
          status: 'scheduled',
          isRecurring: false,
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'scheduledShifts'), newShift);
      }
    }
  }, [elders, agencyId, userId]);

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

      {/* Tab Navigation */}
      <ScheduleTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gapsCount={totalGaps}
      />

      {/* Week Actions Bar - Super Admin only */}
      {userIsSuperAdmin && (
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </div>
          <button
            onClick={() => setShowCopySheet(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Week
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <WeekSummaryTab
          weekStart={weekStart}
          weekDays={weekDays}
          shifts={shifts}
          caregivers={caregivers}
          elders={elders}
          onCellClick={handleSummaryCellClick}
          onCaregiverClick={handleCaregiverClick}
          onElderClick={handleElderClick}
        />
      )}

      {activeTab === 'elder' && (
        <>
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
        </>
      )}

      {activeTab === 'caregiver' && (
        <ByCaregiverTab
          weekStart={weekStart}
          weekDays={weekDays}
          shifts={shifts}
          caregivers={caregivers}
          onShiftClick={handleShiftClick}
          onAssignGap={handleAssignGap}
        />
      )}

      {activeTab === 'gaps' && (
        <GapsOnlyTab
          weekStart={weekStart}
          weekDays={weekDays}
          shifts={shifts}
          elders={elders}
          caregivers={caregivers}
          onAssignGap={handleAssignGap}
          onBulkAssign={handleBulkAssign}
        />
      )}

      {/* Empty state - only show on elder tab */}
      {activeTab === 'elder' && shifts.length === 0 && (
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

      {/* Assign Caregiver Bottom Sheet */}
      {showAssignSheet && assigningGap && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowAssignSheet(false);
              setAssigningGap(null);
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
                  Assign Caregiver
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {assigningGap.elderName} • {format(assigningGap.date, 'EEE, MMM d')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignSheet(false);
                  setAssigningGap(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Shift Info */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  {assigningGap.startTime} - {assigningGap.endTime}
                </span>
              </div>
            </div>

            {/* Error */}
            {assignError && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                {assignError}
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
                    const isAssigning = assigningCaregiverId === caregiver.id;
                    return (
                      <button
                        key={caregiver.id}
                        onClick={() => handleAssignCaregiver(caregiver.id)}
                        disabled={!!assigningCaregiverId}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left',
                          isAssigning
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750',
                          assigningCaregiverId && !isAssigning && 'opacity-50'
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {caregiver.name}
                          </p>
                        </div>
                        {isAssigning && (
                          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
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

      {/* Copy Week Sheet */}
      <CopyWeekSheet
        agencyId={agencyId}
        userId={userId}
        targetWeekStart={weekStart}
        isOpen={showCopySheet}
        onClose={() => setShowCopySheet(false)}
        onSuccess={() => {
          setShowCopySheet(false);
          // Shifts will automatically update via real-time listener
        }}
      />
    </div>
  );
}
