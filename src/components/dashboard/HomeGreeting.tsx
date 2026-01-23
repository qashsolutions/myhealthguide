'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { isAgencyCaregiver } from '@/lib/utils/getUserRole';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function formatShiftTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getShiftLabel(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Morning Shift';
  if (hour >= 12 && hour < 17) return 'Afternoon Shift';
  if (hour >= 17 && hour < 22) return 'Evening Shift';
  return 'Night Shift';
}

export function HomeGreeting() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const isAgency = isAgencyCaregiver(user);
  const [shiftInfo, setShiftInfo] = useState<{ startTime: Date; endTime?: Date; plannedDuration?: number } | null>(null);

  // Fetch shift data for agency caregivers
  useEffect(() => {
    if (!user || !isAgency) return;

    const fetchShift = async () => {
      try {
        const q = query(
          collection(db, 'shiftSessions'),
          where('caregiverId', '==', user.id),
          where('status', '==', 'active'),
          orderBy('startTime', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const startTime = data.startTime?.toDate?.() || new Date(data.startTime);
          const endTime = data.endTime?.toDate?.() || (data.plannedDuration
            ? new Date(startTime.getTime() + data.plannedDuration * 60_000)
            : undefined
          );
          setShiftInfo({ startTime, endTime, plannedDuration: data.plannedDuration });
        }
      } catch (error) {
        console.error('[HomeGreeting] Error fetching shift:', error);
      }
    };

    fetchShift();
  }, [user, isAgency]);

  const firstName = user?.firstName || '';

  if (isAgency) {
    // Agency caregiver: "Hi Maria" + shift context
    const shiftLabel = shiftInfo
      ? `${getShiftLabel(shiftInfo.startTime.getHours())} · ${formatShiftTime(shiftInfo.startTime)}${shiftInfo.endTime ? ` – ${formatShiftTime(shiftInfo.endTime)}` : ''}`
      : undefined;

    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Hi {firstName}
        </h1>
        {shiftLabel && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {shiftLabel}
          </p>
        )}
      </div>
    );
  }

  // Family caregiver: "Good morning, Maria" + "Caring for {elderName}"
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        {getGreetingPrefix()}, {firstName}
      </h1>
      {selectedElder && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Caring for {selectedElder.name}
        </p>
      )}
    </div>
  );
}
