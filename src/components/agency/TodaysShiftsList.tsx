'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface ShiftDisplay {
  id: string;
  caregiverName: string;
  elderNames: string[];
  startTime: string;
  endTime: string;
  status: 'active' | 'upcoming' | 'completed' | 'missed';
}

function formatShiftTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  if (m === 0) return `${hour}${ampm}`;
  return `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
}

function getShiftStatus(startTime: string, endTime: string, docStatus: string): ShiftDisplay['status'] {
  if (docStatus === 'completed') return 'completed';
  if (docStatus === 'in_progress') return 'active';
  if (docStatus === 'no_show') return 'missed';

  const now = new Date();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const shiftStart = new Date();
  shiftStart.setHours(startH, startM, 0, 0);

  const shiftEnd = new Date();
  shiftEnd.setHours(endH, endM, 0, 0);

  if (now > shiftEnd) return 'missed';
  if (now >= shiftStart && now <= shiftEnd) return 'active';
  return 'upcoming';
}

const statusStyles: Record<ShiftDisplay['status'], { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Active' },
  upcoming: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Upcoming' },
  completed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Completed' },
  missed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Missed' },
};

export function TodaysShiftsList() {
  const { user } = useAuth();
  const router = useRouter();
  const [shifts, setShifts] = useState<ShiftDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const agencyId = user?.agencies?.[0]?.agencyId;

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    const fetchTodaysShifts = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const q = query(
          collection(db, 'scheduledShifts'),
          where('agencyId', '==', agencyId)
        );

        const snapshot = await getDocs(q);

        const todaysShifts: ShiftDisplay[] = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const shiftDate = data.date?.toDate?.() || new Date(data.date);

          // Filter for today's shifts only
          if (shiftDate >= today && shiftDate < tomorrow) {
            const status = getShiftStatus(
              data.startTime || '09:00',
              data.endTime || '17:00',
              data.status
            );

            todaysShifts.push({
              id: doc.id,
              caregiverName: data.caregiverName || 'Unassigned',
              elderNames: data.elderName ? [data.elderName] : [],
              startTime: data.startTime || '09:00',
              endTime: data.endTime || '17:00',
              status,
            });
          }
        });

        // Sort: active first, then upcoming, then completed, then missed
        const statusOrder: Record<string, number> = { active: 0, upcoming: 1, completed: 2, missed: 3 };
        todaysShifts.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

        setShifts(todaysShifts);
      } catch (error) {
        console.error('[TodaysShiftsList] Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysShifts();
  }, [agencyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

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
        <Card className="divide-y divide-gray-100 dark:divide-gray-800">
          {shifts.map((shift) => {
            const style = statusStyles[shift.status];
            return (
              <div
                key={shift.id}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => router.push('/dashboard/care-management')}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {shift.caregiverName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatShiftTime(shift.startTime)}–{formatShiftTime(shift.endTime)}
                    {shift.elderNames.length > 0 && (
                      <span className="ml-2">· {shift.elderNames.join(', ')}</span>
                    )}
                  </div>
                </div>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', style.bg, style.text)}>
                  {style.label}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
