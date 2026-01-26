'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { format, isBefore, isToday, isTomorrow, addDays } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PendingShift {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  elderName: string;
  elderId: string;
  status: string;
  agencyId: string;
}

interface UpcomingShift extends PendingShift {
  confirmedAt?: Date;
}

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

export default function MyShiftsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pendingShifts, setPendingShifts] = useState<PendingShift[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle URL params for email deep links
  const actionParam = searchParams.get('action');
  const shiftIdParam = searchParams.get('shiftId');

  const fetchShifts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const now = new Date();
      const sevenDaysFromNow = addDays(now, 7);

      // Get user's agency
      const agencyId = user.agencies?.[0]?.agencyId;
      if (!agencyId) {
        setLoading(false);
        return;
      }

      // Query shifts assigned to this caregiver
      const shiftsQuery = query(
        collection(db, 'scheduledShifts'),
        where('agencyId', '==', agencyId),
        where('caregiverId', '==', user.id)
      );

      const snapshot = await getDocs(shiftsQuery);
      const pending: PendingShift[] = [];
      const upcoming: UpcomingShift[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const shiftDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);

        // Skip past shifts
        if (isBefore(shiftDate, now) && !isToday(shiftDate)) return;

        // Skip cancelled shifts
        if (data.status === 'cancelled') return;

        const shift: PendingShift = {
          id: doc.id,
          date: shiftDate,
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '17:00',
          elderName: data.elderName || 'Loved One',
          elderId: data.elderId || '',
          status: data.status || 'scheduled',
          agencyId: data.agencyId,
        };

        if (['pending_confirmation', 'scheduled'].includes(data.status)) {
          pending.push(shift);
        } else if (['confirmed', 'owner_confirmed'].includes(data.status)) {
          upcoming.push({
            ...shift,
            confirmedAt: data.confirmation?.respondedAt?.toDate?.() || undefined,
          });
        }
      });

      // Sort by date
      pending.sort((a, b) => a.date.getTime() - b.date.getTime());
      upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());

      setPendingShifts(pending);
      setUpcomingShifts(upcoming);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setError('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Handle deep link actions from email
  useEffect(() => {
    if (actionParam && shiftIdParam && !loading) {
      if (actionParam === 'confirm') {
        handleConfirm(shiftIdParam);
      } else if (actionParam === 'decline') {
        // Open decline modal or handle decline
        handleDecline(shiftIdParam);
      }
      // Clear URL params
      router.replace('/dashboard/my-shifts');
    }
  }, [actionParam, shiftIdParam, loading]);

  const handleConfirm = async (shiftId: string) => {
    try {
      setActionLoading(shiftId);
      setError(null);

      const response = await fetchWithAuth('/api/shifts/confirm', {
        method: 'POST',
        body: JSON.stringify({ shiftId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Shift confirmed! Your manager has been notified.');
        fetchShifts(); // Refresh list
      } else {
        setError(data.error || 'Failed to confirm shift');
      }
    } catch (err) {
      setError('Failed to confirm shift. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (shiftId: string, reason?: string) => {
    try {
      setActionLoading(shiftId);
      setError(null);

      const response = await fetchWithAuth('/api/shifts/decline', {
        method: 'POST',
        body: JSON.stringify({ shiftId, reason }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Shift declined. Your manager has been notified to reassign.');
        fetchShifts(); // Refresh list
      } else {
        setError(data.error || 'Failed to decline shift');
      }
    } catch (err) {
      setError('Failed to decline shift. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatShiftDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Shifts</h1>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Pending Confirmation Section */}
      {pendingShifts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Action Required ({pendingShifts.length})
            </h2>
          </div>

          <div className="space-y-3">
            {pendingShifts.map(shift => (
              <Card key={shift.id} className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatShiftDate(shift.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {shift.elderName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(shift.id)}
                      disabled={actionLoading === shift.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading === shift.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Confirm
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(shift.id)}
                      disabled={actionLoading === shift.id}
                      className="text-gray-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Confirmed Shifts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upcoming Shifts ({upcomingShifts.length})
        </h2>

        {upcomingShifts.length === 0 && pendingShifts.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No shifts scheduled. Check back later for new assignments.
            </p>
          </Card>
        ) : upcomingShifts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No confirmed shifts yet. Please confirm your pending shifts above.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingShifts.map(shift => (
              <Card
                key={shift.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/agency/schedule`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatShiftDate(shift.date)}
                      </span>
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                        Confirmed
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                      <span>• {shift.elderName}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
