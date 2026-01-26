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
  getDocs,
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
  Loader2,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { createScheduledShift, createCascadeShift } from '@/lib/firebase/scheduleShifts';
import { cn } from '@/lib/utils';
import type { ScheduledShift } from '@/types';
import { WeekStripSchedule } from '@/components/agency/schedule';

// Status badge config with clearer labels
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_confirmation: {
    label: 'Awaiting Response',
    className: 'text-amber-700 dark:text-amber-400'
  },
  confirmed: {
    label: 'Confirmed',
    className: 'text-green-700 dark:text-green-400'
  },
  owner_confirmed: {
    label: 'Confirmed ✓',
    className: 'text-green-700 dark:text-green-400'
  },
  scheduled: {
    label: 'Awaiting Response',
    className: 'text-amber-700 dark:text-amber-400'
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
  declined: {
    label: 'Declined',
    className: 'text-red-700 dark:text-red-400'
  },
  expired: {
    label: 'No Response',
    className: 'text-gray-500 dark:text-gray-400'
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

// Parse "HH:mm" to minutes since midnight
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Check if existing shifts fully cover a target time range
function isTimeRangeCovered(
  shiftsOnDate: ScheduledShift[],
  targetStart: number,
  targetEnd: number
): boolean {
  const intervals = shiftsOnDate.map(s => ({
    start: parseTimeToMinutes(s.startTime),
    end: parseTimeToMinutes(s.endTime)
  }));

  intervals.sort((a, b) => a.start - b.start);

  let coveredEnd = targetStart;
  for (const interval of intervals) {
    if (interval.start > coveredEnd) break;
    coveredEnd = Math.max(coveredEnd, interval.end);
    if (coveredEnd >= targetEnd) return true;
  }
  return false;
}

// Check if a caregiver has a conflicting shift (overlapping time on same date)
function hasCaregiverConflict(
  caregiverId: string,
  targetShift: ScheduledShift,
  allShifts: ScheduledShift[]
): boolean {
  if (!targetShift.date) return false;

  const targetStart = parseTimeToMinutes(targetShift.startTime);
  const targetEnd = parseTimeToMinutes(targetShift.endTime);

  // Find all shifts for this caregiver on the same date (excluding the current shift being reassigned)
  const caregiverShiftsOnDate = allShifts.filter(s =>
    s.caregiverId === caregiverId &&
    s.id !== targetShift.id && // Exclude the shift being reassigned
    s.date &&
    isSameDay(s.date, targetShift.date!) &&
    !['cancelled', 'no_show'].includes(s.status)
  );

  // Check if any of these shifts overlap with the target time range
  for (const shift of caregiverShiftsOnDate) {
    const shiftStart = parseTimeToMinutes(shift.startTime);
    const shiftEnd = parseTimeToMinutes(shift.endTime);

    // Overlaps if: start1 < end2 AND start2 < end1
    if (targetStart < shiftEnd && shiftStart < targetEnd) {
      return true; // Conflict found
    }
  }

  return false;
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

  // Phase 4: Create Shift state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [elders, setElders] = useState<{ id: string; name: string; groupId: string }[]>([]);
  const [loadingElders, setLoadingElders] = useState(false);
  const [creatingShift, setCreatingShift] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createForm, setCreateForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    elderId: '',
    elderName: '',
    elderGroupId: '',
    assignmentMode: 'cascade' as 'direct' | 'cascade',
    caregiverId: '',
    caregiverName: '',
    repeatMode: 'none' as 'none' | 'daily' | 'weekdays' | 'custom',
    customDays: [] as number[],
    notes: ''
  });

  // Phase 5: Edit/Delete Shift state
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editingShift, setEditingShift] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    shiftId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    elderId: '',
    elderName: '',
    elderGroupId: '',
    caregiverId: '',
    caregiverName: '',
    notes: ''
  });

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

  // Fetch elders for agency
  const fetchElders = useCallback(async () => {
    if (!agencyId) return;
    setLoadingElders(true);
    try {
      const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
      if (!agencyDoc.exists()) {
        setLoadingElders(false);
        return;
      }
      const groupIds: string[] = agencyDoc.data()?.groupIds || [];
      const allElders: { id: string; name: string; groupId: string }[] = [];

      for (const gId of groupIds) {
        const elderQuery = query(
          collection(db, 'elders'),
          where('groupId', '==', gId)
        );
        const snap = await getDocs(elderQuery);
        snap.docs.forEach(d => {
          const data = d.data();
          if (!data.archived) {
            allElders.push({
              id: d.id,
              name: data.name || data.preferredName || 'Unknown',
              groupId: gId
            });
          }
        });
      }
      setElders(allElders);
    } catch (err) {
      console.error('Error fetching elders:', err);
    } finally {
      setLoadingElders(false);
    }
  }, [agencyId]);

  // Filter elders to hide those fully covered by existing shifts for the selected date/time
  const availableElders = useMemo(() => {
    if (!createForm.date || !createForm.startTime || !createForm.endTime) return elders;
    if (createForm.startTime >= createForm.endTime) return elders;

    const formDate = new Date(createForm.date + 'T00:00:00');
    const newStart = parseTimeToMinutes(createForm.startTime);
    const newEnd = parseTimeToMinutes(createForm.endTime);

    return elders.filter(elder => {
      const elderShiftsOnDate = shifts.filter(s =>
        s.elderId === elder.id &&
        s.date && isSameDay(s.date, formDate) &&
        !['cancelled', 'no_show'].includes(s.status)
      );

      if (elderShiftsOnDate.length === 0) return true;

      return !isTimeRangeCovered(elderShiftsOnDate, newStart, newEnd);
    });
  }, [elders, shifts, createForm.date, createForm.startTime, createForm.endTime]);

  // Reset elder selection if the selected elder becomes covered after date/time change
  useEffect(() => {
    if (createForm.elderId && !availableElders.find(e => e.id === createForm.elderId)) {
      setCreateForm(prev => ({ ...prev, elderId: '', elderName: '', elderGroupId: '' }));
    }
  }, [availableElders, createForm.elderId]);

  // Compute which caregivers have conflicts for the Edit Shift form
  const editFormCaregiverConflicts = useMemo(() => {
    if (!editForm.date || !editForm.startTime || !editForm.endTime) return new Set<string>();

    // Create a virtual shift object for conflict checking
    const virtualShift: ScheduledShift = {
      id: editForm.shiftId,
      date: new Date(editForm.date + 'T00:00:00'),
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      agencyId: agencyId || '',
      groupId: editForm.elderGroupId,
      elderId: editForm.elderId,
      elderName: editForm.elderName,
      caregiverId: editForm.caregiverId,
      caregiverName: editForm.caregiverName,
      status: 'scheduled',
      duration: 0,
      isRecurring: false,
      createdBy: user?.id || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const conflicts = new Set<string>();
    for (const cg of caregivers) {
      if (hasCaregiverConflict(cg.id, virtualShift, shifts)) {
        conflicts.add(cg.id);
      }
    }
    return conflicts;
  }, [editForm.shiftId, editForm.date, editForm.startTime, editForm.endTime, editForm.elderGroupId, editForm.elderId, editForm.elderName, editForm.caregiverId, editForm.caregiverName, caregivers, shifts, agencyId]);

  // Open create sheet
  const openCreateSheet = useCallback(() => {
    setShowCreateSheet(true);
    setCreateError(null);
    setCreateSuccess(false);
    setCreateForm(prev => ({
      ...prev,
      date: format(selectedDate, 'yyyy-MM-dd')
    }));
    if (elders.length === 0) fetchElders();
    if (caregivers.length === 0) fetchCaregivers();
  }, [selectedDate, elders.length, caregivers.length, fetchElders, fetchCaregivers]);

  // Close create sheet
  const closeCreateSheet = useCallback(() => {
    setShowCreateSheet(false);
    setCreateError(null);
    setCreateSuccess(false);
  }, []);

  // Handle create shift submission
  const handleCreateShift = useCallback(async () => {
    if (!agencyId || !user?.id) return;

    // Validate
    if (!createForm.elderId) {
      setCreateError('Please select a Loved One.');
      return;
    }
    if (!createForm.date) {
      setCreateError('Please select a date.');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(createForm.date + 'T00:00:00');
    if (selectedDate < today) {
      setCreateError('Cannot create shifts in the past.');
      return;
    }
    if (createForm.startTime >= createForm.endTime) {
      setCreateError('End time must be after start time.');
      return;
    }
    if (createForm.assignmentMode === 'direct' && !createForm.caregiverId) {
      setCreateError('Please select a caregiver for Direct Assign.');
      return;
    }

    setCreatingShift(true);
    setCreateError(null);

    try {
      // Determine dates to create shifts for
      const baseDates: Date[] = [];
      const baseDate = startOfDay(new Date(createForm.date + 'T00:00:00'));

      if (createForm.repeatMode === 'none') {
        baseDates.push(baseDate);
      } else {
        // Generate dates for next 4 weeks
        const end = addDays(baseDate, 27);
        let current = baseDate;
        while (current <= end) {
          const dow = current.getDay();
          if (createForm.repeatMode === 'daily') {
            baseDates.push(new Date(current));
          } else if (createForm.repeatMode === 'weekdays') {
            if (dow >= 1 && dow <= 5) baseDates.push(new Date(current));
          } else if (createForm.repeatMode === 'custom') {
            if (createForm.customDays.includes(dow)) baseDates.push(new Date(current));
          }
          current = addDays(current, 1);
        }
      }

      let successCount = 0;
      let lastError = '';

      for (const shiftDate of baseDates) {
        let result: { success: boolean; error?: string };

        if (createForm.assignmentMode === 'cascade') {
          result = await createCascadeShift(
            agencyId,
            createForm.elderGroupId,
            createForm.elderId,
            createForm.elderName,
            shiftDate,
            createForm.startTime,
            createForm.endTime,
            createForm.notes || undefined,
            user.id,
            createForm.caregiverId || undefined,
            user.id
          );
        } else {
          result = await createScheduledShift(
            agencyId,
            createForm.elderGroupId,
            createForm.elderId,
            createForm.elderName,
            createForm.caregiverId,
            createForm.caregiverName,
            shiftDate,
            createForm.startTime,
            createForm.endTime,
            createForm.notes || undefined,
            user.id,
            baseDates.length > 1,
            baseDates.length > 1 ? `recurring_${Date.now()}` : undefined
          );
        }

        if (result.success) {
          successCount++;
        } else {
          lastError = result.error || 'Unknown error';
        }
      }

      if (successCount > 0) {
        setCreateSuccess(true);
        // Reset form
        setCreateForm({
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '17:00',
          elderId: '',
          elderName: '',
          elderGroupId: '',
          assignmentMode: 'cascade',
          caregiverId: '',
          caregiverName: '',
          repeatMode: 'none',
          customDays: [],
          notes: ''
        });
        // Auto-close after brief delay
        setTimeout(() => closeCreateSheet(), 1200);
      } else {
        setCreateError(lastError || 'Failed to create shift.');
      }
    } catch (err: any) {
      console.error('Error creating shift:', err);
      setCreateError(err.message || 'Failed to create shift.');
    } finally {
      setCreatingShift(false);
    }
  }, [agencyId, user?.id, createForm, selectedDate, closeCreateSheet]);

  // Phase 5: Open edit sheet with shift data
  const openEditSheet = useCallback((shift: ScheduledShift) => {
    setEditForm({
      shiftId: shift.id,
      date: shift.date ? format(shift.date, 'yyyy-MM-dd') : '',
      startTime: shift.startTime || '09:00',
      endTime: shift.endTime || '17:00',
      elderId: shift.elderId || '',
      elderName: shift.elderName || '',
      elderGroupId: shift.groupId || '',
      caregiverId: shift.caregiverId || '',
      caregiverName: shift.caregiverName || '',
      notes: shift.notes || ''
    });
    setShowEditSheet(true);
    setEditError(null);
    setEditSuccess(false);
    setConfirmDelete(false);
    if (elders.length === 0) fetchElders();
    if (caregivers.length === 0) fetchCaregivers();
  }, [elders.length, caregivers.length, fetchElders, fetchCaregivers]);

  const closeEditSheet = useCallback(() => {
    setShowEditSheet(false);
    setEditError(null);
    setEditSuccess(false);
    setConfirmDelete(false);
  }, []);

  // Save edited shift
  const handleSaveEdit = useCallback(async () => {
    if (!editForm.shiftId) return;

    if (!editForm.elderId) {
      setEditError('Please select a Loved One.');
      return;
    }
    if (editForm.startTime >= editForm.endTime) {
      setEditError('End time must be after start time.');
      return;
    }

    setEditingShift(true);
    setEditError(null);

    try {
      const shiftRef = doc(db, 'scheduledShifts', editForm.shiftId);
      const [sh, sm] = editForm.startTime.split(':').map(Number);
      const [eh, em] = editForm.endTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);

      await updateDoc(shiftRef, {
        date: startOfDay(new Date(editForm.date + 'T00:00:00')),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        duration,
        elderId: editForm.elderId,
        elderName: editForm.elderName,
        groupId: editForm.elderGroupId,
        caregiverId: editForm.caregiverId,
        caregiverName: editForm.caregiverName,
        notes: editForm.notes || '',
        updatedAt: serverTimestamp()
      });

      setEditSuccess(true);
      setTimeout(() => closeEditSheet(), 1200);
    } catch (err: any) {
      console.error('Error updating shift:', err);
      setEditError(err.message || 'Failed to update shift.');
    } finally {
      setEditingShift(false);
    }
  }, [editForm, closeEditSheet]);

  // Delete (cancel) shift
  const handleDeleteShift = useCallback(async () => {
    if (!editForm.shiftId) return;

    setDeleting(true);
    setEditError(null);

    try {
      const shiftRef = doc(db, 'scheduledShifts', editForm.shiftId);
      await updateDoc(shiftRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      closeEditSheet();
    } catch (err: any) {
      console.error('Error deleting shift:', err);
      setEditError(err.message || 'Failed to delete shift.');
    } finally {
      setDeleting(false);
    }
  }, [editForm.shiftId, closeEditSheet]);

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

  // Count shifts needing assignment (offered shifts are being handled by cascade)
  const needsAssignmentCount = dayShifts.filter(
    s => s.status === 'unfilled' || (!s.caregiverId && s.status !== 'offered')
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

  // Check if a shift needs manual assignment (offered shifts are handled by cascade)
  const needsAssignment = (shift: ScheduledShift) => {
    return shift.status === 'unfilled' || (!shift.caregiverId && shift.status !== 'offered');
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Schedule
        </h1>
      </div>

      {/* Week Strip Schedule View */}
      <div className="px-4 pt-4">
        {agencyId && user?.id && (
          <WeekStripSchedule
            agencyId={agencyId}
            userId={user.id}
          />
        )}
      </div>

      {/* Phase 4: Create Shift Bottom Sheet */}
      {showCreateSheet && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeCreateSheet}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                New Shift
              </h2>
              <button
                onClick={closeCreateSheet}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Success message */}
              {createSuccess && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  Shift created successfully!
                </div>
              )}

              {/* Error message */}
              {createError && (
                <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                  {createError}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={e => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              {/* Time row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={createForm.startTime}
                    onChange={e => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={createForm.endTime}
                    onChange={e => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Elder picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Loved One <span className="text-red-500">*</span>
                </label>
                {loadingElders ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <select
                    value={createForm.elderId}
                    onChange={e => {
                      const elder = availableElders.find(el => el.id === e.target.value);
                      setCreateForm(prev => ({
                        ...prev,
                        elderId: e.target.value,
                        elderName: elder?.name || '',
                        elderGroupId: elder?.groupId || ''
                      }));
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Select loved one...</option>
                    {availableElders.length === 0 ? (
                      <option value="" disabled>All loved ones are covered for this time</option>
                    ) : (
                      availableElders.map(elder => (
                        <option key={elder.id} value={elder.id}>{elder.name}</option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Assignment Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assignment
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setCreateForm(prev => ({ ...prev, assignmentMode: 'direct' }))}
                    className={cn(
                      'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      createForm.assignmentMode === 'direct'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    Direct Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm(prev => ({ ...prev, assignmentMode: 'cascade' }))}
                    className={cn(
                      'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      createForm.assignmentMode === 'cascade'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    Auto-Assign
                  </button>
                </div>
              </div>

              {/* Caregiver picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {createForm.assignmentMode === 'cascade' ? 'Preferred First (optional)' : 'Caregiver'}
                  {createForm.assignmentMode === 'direct' && <span className="text-red-500"> *</span>}
                </label>
                {loadingCaregivers ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <select
                    value={createForm.caregiverId}
                    onChange={e => {
                      const cg = caregivers.find(c => c.id === e.target.value);
                      setCreateForm(prev => ({
                        ...prev,
                        caregiverId: e.target.value,
                        caregiverName: cg?.name || ''
                      }));
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">
                      {createForm.assignmentMode === 'cascade' ? 'None (auto-rank)' : 'Select caregiver...'}
                    </option>
                    {caregivers.map(cg => (
                      <option key={cg.id} value={cg.id}>{cg.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Repeat options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Repeat
                </label>
                <select
                  value={createForm.repeatMode}
                  onChange={e => setCreateForm(prev => ({
                    ...prev,
                    repeatMode: e.target.value as any,
                    customDays: []
                  }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="none">No repeat</option>
                  <option value="daily">Daily (next 4 weeks)</option>
                  <option value="weekdays">Weekdays (next 4 weeks)</option>
                  <option value="custom">Custom days (next 4 weeks)</option>
                </select>

                {/* Custom day checkboxes */}
                {createForm.repeatMode === 'custom' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setCreateForm(prev => ({
                            ...prev,
                            customDays: prev.customDays.includes(idx)
                              ? prev.customDays.filter(d => d !== idx)
                              : [...prev.customDays, idx]
                          }));
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                          createForm.customDays.includes(idx)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCreateShift}
                disabled={creatingShift || createSuccess}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                  creatingShift || createSuccess
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white'
                )}
              >
                {creatingShift ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : createSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Created!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Shift{createForm.repeatMode !== 'none' ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Phase 5: Edit Shift Bottom Sheet */}
      {showEditSheet && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeEditSheet}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Edit Shift
              </h2>
              <button
                onClick={closeEditSheet}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Success message */}
              {editSuccess && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  Shift updated successfully!
                </div>
              )}

              {/* Error message */}
              {editError && (
                <div className="px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
                  {editError}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              {/* Time row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={e => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={e => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Elder picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Loved One <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.elderId}
                  onChange={e => {
                    const elder = elders.find(el => el.id === e.target.value);
                    setEditForm(prev => ({
                      ...prev,
                      elderId: e.target.value,
                      elderName: elder?.name || '',
                      elderGroupId: elder?.groupId || ''
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="">Select loved one...</option>
                  {elders.map(elder => (
                    <option key={elder.id} value={elder.id}>{elder.name}</option>
                  ))}
                </select>
              </div>

              {/* Caregiver picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Caregiver
                </label>
                <select
                  value={editForm.caregiverId}
                  onChange={e => {
                    const cg = caregivers.find(c => c.id === e.target.value);
                    setEditForm(prev => ({
                      ...prev,
                      caregiverId: e.target.value,
                      caregiverName: cg?.name || ''
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="">Unassigned</option>
                  {caregivers.map(cg => {
                    const hasConflict = editFormCaregiverConflicts.has(cg.id);
                    return (
                      <option
                        key={cg.id}
                        value={cg.id}
                        disabled={hasConflict}
                      >
                        {cg.name}{hasConflict ? ' (Busy)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none"
                />
              </div>

              {/* Delete section */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Shift
                  </button>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                    <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                      Are you sure? This will cancel the shift.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteShift}
                        disabled={deleting}
                        className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-1.5"
                      >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2 px-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSaveEdit}
                disabled={editingShift || editSuccess}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                  editingShift || editSuccess
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white'
                )}
              >
                {editingShift ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : editSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </>
      )}

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
                    const hasConflict = hasCaregiverConflict(cg.id, selectedShift, shifts);
                    const isDisabled = assigning || isCurrentlyAssigned || hasConflict;
                    return (
                      <button
                        key={cg.id}
                        onClick={() => !isDisabled && assignCaregiver(cg.id, cg.name)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left',
                          isCurrentlyAssigned
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : hasConflict
                              ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          isCurrentlyAssigned
                            ? 'bg-blue-100 dark:bg-blue-900/40'
                            : hasConflict
                              ? 'bg-amber-100 dark:bg-amber-900/40'
                              : 'bg-gray-100 dark:bg-gray-700'
                        )}>
                          <User className={cn(
                            'w-4 h-4',
                            isCurrentlyAssigned
                              ? 'text-blue-600 dark:text-blue-400'
                              : hasConflict
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-500 dark:text-gray-400'
                          )} />
                        </div>
                        <span className={cn(
                          'flex-1 text-sm font-medium',
                          isCurrentlyAssigned
                            ? 'text-blue-700 dark:text-blue-300'
                            : hasConflict
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-900 dark:text-gray-100'
                        )}>
                          {cg.name}
                        </span>
                        {isCurrentlyAssigned && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                        {hasConflict && !isCurrentlyAssigned && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            Busy
                          </span>
                        )}
                        {assigning && !isCurrentlyAssigned && !hasConflict && (
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
