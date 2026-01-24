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
const REFRESH_INTERVAL_MS = 60_000;

export interface AgencyDashboardData {
  caregiverCount: number;
  elderCount: number;
  maxCaregivers: number;
  maxElders: number;
  // New insight cards
  burnoutRiskCount: number;
  careQualityPct: number;
  coverageRatePct: number;
  // Shifts
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
    burnoutRiskCount: 0,
    careQualityPct: 100,
    coverageRatePct: 0,
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
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 1. Caregiver assignments → caregiverCount, elderCount, elderIds
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

      // 2. Scheduled shifts (all)
      const shiftsQ = query(
        collection(db, 'scheduledShifts'),
        where('agencyId', '==', agencyId)
      );
      const shiftsSnap = await getDocs(shiftsQ);

      const todayShifts: TodayShift[] = [];
      let unconfirmedCount = 0;
      let noShowCount = 0;

      // Rolling 7-day window for coverage and burnout
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      const weekEnd = new Date(tomorrow);

      // Track shifts per caregiver this week for burnout
      const caregiverWeekShifts: Record<string, number> = {};
      const caregiversWithShiftsThisWeek = new Set<string>();

      // Track this week's completed vs total for coverage
      let weekTotalShifts = 0;
      let weekCoveredShifts = 0;

      shiftsSnap.docs.forEach(doc => {
        const d = doc.data();
        const shiftDate = d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date);

        // Today's shifts
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
            const [startH, startM] = (d.startTime || '09:00').split(':').map(Number);
            const shiftStart = new Date(today);
            shiftStart.setHours(startH, startM, 0, 0);
            if (now > shiftStart) noShowCount++;
          }
        }

        // This week's shifts for coverage and burnout
        if (shiftDate >= weekStart && shiftDate < weekEnd) {
          if (d.status !== 'cancelled') {
            weekTotalShifts++;
            if (['confirmed', 'in_progress', 'completed'].includes(d.status)) {
              weekCoveredShifts++;
            }
          }
          if (d.caregiverId) {
            caregiversWithShiftsThisWeek.add(d.caregiverId);
            caregiverWeekShifts[d.caregiverId] = (caregiverWeekShifts[d.caregiverId] || 0) + 1;
          }
        }
      });

      // Coverage rate (rolling 7d)
      // If no shifts scheduled but caregivers/elders exist, that's 0% coverage
      const coverageRatePct = weekTotalShifts > 0
        ? Math.round((weekCoveredShifts / weekTotalShifts) * 100)
        : (caregiverCount > 0 && elderCount > 0 ? 0 : 100);

      // Burnout risk: caregivers with > 6 shifts this week
      let burnoutRiskCount = 0;
      Object.values(caregiverWeekShifts).forEach(count => {
        if (count > 6) burnoutRiskCount++;
      });

      // 3. Active shift sessions (overtime + burnout from hours)
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
          const elapsed = (now.getTime() - clockIn.getTime()) / (1000 * 60);
          const planned = d.plannedDurationMinutes || 480;
          if (elapsed > planned + 60) {
            overtimeCount++;
            // Also count toward burnout
            if (d.caregiverId && !Object.keys(caregiverWeekShifts).includes(d.caregiverId)) {
              burnoutRiskCount++;
            }
          }
        });
      } catch {
        // shiftSessions collection may not exist yet
      }

      // 4. Care quality: medication adherence for agency elders (last 7 days)
      let careQualityPct = 100;
      const elderIdArray = Array.from(elderIds);
      if (elderIdArray.length > 0) {
        try {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          // Query medication logs for agency elders (batch max 30)
          const medLogQ = query(
            collection(db, 'medication_logs'),
            where('elderId', 'in', elderIdArray.slice(0, 30))
          );
          const medLogSnap = await getDocs(medLogQ);

          let takenCount = 0;
          let totalLogs = 0;
          medLogSnap.docs.forEach(doc => {
            const d = doc.data();
            const logDate = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(d.createdAt);
            if (logDate >= sevenDaysAgo) {
              totalLogs++;
              if (d.status === 'taken') takenCount++;
            }
          });

          if (totalLogs > 0) {
            careQualityPct = Math.round((takenCount / totalLogs) * 100);
          }
        } catch {
          // medication_logs may not exist or have access issues
        }
      }

      // 5. Idle caregivers
      const idleCaregiverCount = Math.max(0, caregiverCount - caregiversWithShiftsThisWeek.size);

      // 6. Tomorrow's cancelled shifts
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
        burnoutRiskCount,
        careQualityPct,
        coverageRatePct,
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

  // Determine if CTA already covers scheduling (hide empty TodaysShifts if so)
  const ctaCoversScheduling = !data.loading && data.todayShifts.length === 0 && (() => {
    // Mirror NeedsAttentionList priority to find top item's rootCause
    if (data.burnoutRiskCount > 0) return false; // burnout
    if (data.maxElders - data.elderCount > 0) return false; // capacity
    if (data.noShowCount > 0) return true; // scheduling
    if (data.unconfirmedCount - data.noShowCount > 0) return true; // scheduling
    if (data.overtimeCount > 0) return false; // burnout
    if (data.careQualityPct < 90) return false; // quality
    if (data.coverageRatePct < 80) return true; // scheduling
    if (data.idleCaregiverCount > 0) return true; // scheduling
    if (data.replacementNeededCount > 0) return true; // scheduling
    return false;
  })();

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AgencyGreeting />
      <AgencyQuickStats
        burnoutRiskCount={data.burnoutRiskCount}
        careQualityPct={data.careQualityPct}
        coverageRatePct={data.coverageRatePct}
        caregiverCount={data.caregiverCount}
        loading={data.loading}
      />
      <NeedsAttentionList
        elderCount={data.elderCount}
        maxElders={data.maxElders}
        caregiverCount={data.caregiverCount}
        noShowCount={data.noShowCount}
        unconfirmedCount={data.unconfirmedCount}
        overtimeCount={data.overtimeCount}
        idleCaregiverCount={data.idleCaregiverCount}
        replacementNeededCount={data.replacementNeededCount}
        burnoutRiskCount={data.burnoutRiskCount}
        careQualityPct={data.careQualityPct}
        coverageRatePct={data.coverageRatePct}
        loading={data.loading}
      />
      {!ctaCoversScheduling && (
        <TodaysShiftsList
          shifts={data.todayShifts}
          loading={data.loading}
        />
      )}
      <ManageActionGrid
        caregiverCount={data.caregiverCount}
        elderCount={data.elderCount}
        maxCaregivers={data.maxCaregivers}
        maxElders={data.maxElders}
      />
    </div>
  );
}
