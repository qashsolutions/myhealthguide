'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { AgencyGreeting } from '@/components/agency/AgencyGreeting';
import { AgencyQuickStats } from '@/components/agency/AgencyQuickStats';
import { NeedsAttentionList } from '@/components/agency/NeedsAttentionList';
import { ManageActionGrid } from '@/components/agency/ManageActionGrid';
import { TodaysShiftsList } from '@/components/agency/TodaysShiftsList';

const MAX_CAREGIVERS = 10;
const MAX_ELDERS_TOTAL = 30;
const MULTI_AGENCY_PRICE_PER_ELDER = 55;
const REFRESH_INTERVAL_MS = 60_000;

export interface AgencyDashboardData {
  caregiverCount: number;
  elderCount: number;
  maxCaregivers: number;
  maxElders: number;
  revenue: number;
  maxRevenue: number;
  todayShifts: TodayShift[];
  unconfirmedCount: number;
  noShowCount: number;
  overtimeCount: number;
  idleCaregiverCount: number;
  replacementNeededCount: number;
  loading: boolean;
}

export interface TodayShift {
  id: string;
  caregiverName: string;
  elderNames: string[];
  startTime: string;
  endTime: string;
  status: string;
}

export function AgencyOwnerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AgencyDashboardData>({
    caregiverCount: 0,
    elderCount: 0,
    maxCaregivers: MAX_CAREGIVERS,
    maxElders: MAX_ELDERS_TOTAL,
    revenue: 0,
    maxRevenue: MAX_ELDERS_TOTAL * MULTI_AGENCY_PRICE_PER_ELDER,
    todayShifts: [],
    unconfirmedCount: 0,
    noShowCount: 0,
    overtimeCount: 0,
    idleCaregiverCount: 0,
    replacementNeededCount: 0,
    loading: true,
  });

  const agencyId = user?.agencies?.[0]?.agencyId;

  const fetchData = useCallback(async () => {
    if (!agencyId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // 1. Caregiver assignments → caregiverCount, elderCount
      const assignQ = query(
        collection(db, 'caregiver_assignments'),
        where('agencyId', '==', agencyId),
        where('active', '==', true)
      );
      const assignSnap = await getDocs(assignQ);

      const uniqueCaregiverIds = new Set<string>();
      const elderIds = new Set<string>();
      assignSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.caregiverId) uniqueCaregiverIds.add(d.caregiverId);
        if (d.elderIds && Array.isArray(d.elderIds)) {
          d.elderIds.forEach((id: string) => elderIds.add(id));
        }
      });

      const caregiverCount = uniqueCaregiverIds.size;
      const elderCount = elderIds.size;
      const revenue = elderCount * MULTI_AGENCY_PRICE_PER_ELDER;

      // 2. Today's scheduled shifts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const shiftsQ = query(
        collection(db, 'scheduledShifts'),
        where('agencyId', '==', agencyId)
      );
      const shiftsSnap = await getDocs(shiftsQ);

      const now = new Date();
      const todayShifts: TodayShift[] = [];
      let unconfirmedCount = 0;
      let noShowCount = 0;

      shiftsSnap.docs.forEach(doc => {
        const d = doc.data();
        const shiftDate = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date);

        if (shiftDate >= today && shiftDate < tomorrow) {
          todayShifts.push({
            id: doc.id,
            caregiverName: d.caregiverName || 'Unassigned',
            elderNames: d.elderName ? [d.elderName] : [],
            startTime: d.startTime || '09:00',
            endTime: d.endTime || '17:00',
            status: d.status || 'scheduled',
          });

          if (d.status === 'scheduled') {
            unconfirmedCount++;
            // No-show: shift start time has passed but still unconfirmed
            const [startH, startM] = (d.startTime || '09:00').split(':').map(Number);
            const shiftStart = new Date(today);
            shiftStart.setHours(startH, startM, 0, 0);
            if (now > shiftStart) {
              noShowCount++;
            }
          }
        }
      });

      // 3. Active shift sessions (overtime check)
      let overtimeCount = 0;
      try {
        const sessionsQ = query(
          collection(db, 'shiftSessions'),
          where('agencyId', '==', agencyId),
          where('status', '==', 'active')
        );
        const sessionsSnap = await getDocs(sessionsQ);
        sessionsSnap.docs.forEach(doc => {
          const d = doc.data();
          const clockIn = d.clockInTime instanceof Timestamp ? d.clockInTime.toDate() : new Date(d.clockInTime);
          const elapsed = (now.getTime() - clockIn.getTime()) / (1000 * 60); // minutes
          const planned = d.plannedDurationMinutes || 480; // default 8 hours
          if (elapsed > planned + 60) {
            overtimeCount++;
          }
        });
      } catch {
        // shiftSessions collection may not exist yet
      }

      // 4. Week coverage - find idle caregivers
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const caregiversWithShiftsThisWeek = new Set<string>();
      shiftsSnap.docs.forEach(doc => {
        const d = doc.data();
        const shiftDate = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date);
        if (shiftDate >= weekStart && shiftDate < weekEnd && d.caregiverId) {
          caregiversWithShiftsThisWeek.add(d.caregiverId);
        }
      });

      const idleCaregiverCount = Math.max(0, caregiverCount - caregiversWithShiftsThisWeek.size);

      // 5. Tomorrow's cancelled shifts (replacement needed)
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      let replacementNeededCount = 0;
      shiftsSnap.docs.forEach(doc => {
        const d = doc.data();
        const shiftDate = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date);
        if (shiftDate >= tomorrow && shiftDate < dayAfterTomorrow && d.status === 'cancelled') {
          replacementNeededCount++;
        }
      });

      setData({
        caregiverCount,
        elderCount,
        maxCaregivers: MAX_CAREGIVERS,
        maxElders: MAX_ELDERS_TOTAL,
        revenue,
        maxRevenue: MAX_ELDERS_TOTAL * MULTI_AGENCY_PRICE_PER_ELDER,
        todayShifts,
        unconfirmedCount,
        noShowCount,
        overtimeCount,
        idleCaregiverCount,
        replacementNeededCount,
        loading: false,
      });
    } catch (error) {
      console.error('[AgencyOwnerDashboard] Error fetching data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [agencyId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AgencyGreeting />
      <AgencyQuickStats
        caregiverCount={data.caregiverCount}
        elderCount={data.elderCount}
        maxCaregivers={data.maxCaregivers}
        maxElders={data.maxElders}
        revenue={data.revenue}
        maxRevenue={data.maxRevenue}
        loading={data.loading}
      />
      <NeedsAttentionList
        elderCount={data.elderCount}
        maxElders={data.maxElders}
        noShowCount={data.noShowCount}
        unconfirmedCount={data.unconfirmedCount}
        overtimeCount={data.overtimeCount}
        idleCaregiverCount={data.idleCaregiverCount}
        replacementNeededCount={data.replacementNeededCount}
        loading={data.loading}
      />
      <ManageActionGrid
        caregiverCount={data.caregiverCount}
        elderCount={data.elderCount}
        maxCaregivers={data.maxCaregivers}
        maxElders={data.maxElders}
      />
      <TodaysShiftsList
        shifts={data.todayShifts}
        loading={data.loading}
      />
    </div>
  );
}
