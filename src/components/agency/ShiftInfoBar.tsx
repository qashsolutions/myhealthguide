'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface ShiftData {
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'abandoned';
  plannedDuration?: number;
}

function formatElapsed(startTime: Date): string {
  const diff = Date.now() - startTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ShiftInfoBar() {
  const { user } = useAuth();
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [elapsed, setElapsed] = useState('');

  // Fetch today's active shift
  useEffect(() => {
    if (!user) return;

    const fetchShift = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
          collection(db, 'shiftSessions'),
          where('caregiverId', '==', user.id),
          where('status', '==', 'active'),
          orderBy('startTime', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          setShift({
            startTime: data.startTime?.toDate?.() || new Date(data.startTime),
            endTime: data.endTime?.toDate?.() || undefined,
            status: data.status,
            plannedDuration: data.plannedDuration,
          });
        }
      } catch (error) {
        // Shift data is optional - don't block the UI
        console.error('[ShiftInfoBar] Error fetching shift:', error);
      }
    };

    fetchShift();
  }, [user]);

  // Update elapsed time every minute
  useEffect(() => {
    if (!shift || shift.status !== 'active') return;

    const update = () => setElapsed(formatElapsed(shift.startTime));
    update();

    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [shift]);

  if (!shift) return null;

  const isActive = shift.status === 'active';
  const remaining = shift.plannedDuration
    ? shift.plannedDuration - Math.floor((Date.now() - shift.startTime.getTime()) / 60_000)
    : null;
  const isEndingSoon = remaining !== null && remaining > 0 && remaining <= 30;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
        isEndingSoon
          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      )}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {isActive ? (
        <span>
          Shift started {formatTime(shift.startTime)}
          {elapsed && <span className="font-medium ml-1">· {elapsed} elapsed</span>}
          {isEndingSoon && <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">· ends in {remaining}m</span>}
        </span>
      ) : (
        <span>Shift ended at {shift.endTime ? formatTime(shift.endTime) : '--'}</span>
      )}
    </div>
  );
}
