/**
 * AI Analytics API
 *
 * Provides intelligent, context-aware analytics using Gemini 3 Pro Preview
 * with thinking mode. Replaces all hardcoded thresholds with AI-driven analysis.
 *
 * Endpoints:
 * POST /api/ai-analytics
 *   - type: adherence | burnout | refill | trends | alerts | compliance-status
 *
 * All responses include personalized thresholds and reasoning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, canAccessElderProfileServer, getUserDataServer } from '@/lib/api/verifyAuth';
import {
  analyzeAdherenceWithAI,
  analyzeBurnoutWithAI,
  analyzeRefillNeedsWithAI,
  analyzeTrendsWithAI,
  prioritizeAlertsWithAI,
  getAIComplianceStatus,
} from '@/lib/ai/agenticAnalytics';
import { getAdminDb } from '@/lib/firebase/admin';
import type { UserRole } from '@/lib/medical/phiAuditLog';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { type, groupId, elderId, data } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    // Get user role
    const userData = await getUserDataServer(userId);
    const userRole: UserRole = userData?.role || 'member';

    // Verify access if elder-specific analysis
    if (elderId && groupId) {
      const hasAccess = await canAccessElderProfileServer(userId, elderId, groupId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this elder' },
          { status: 403 }
        );
      }
    }

    const db = getAdminDb();

    switch (type) {
      case 'adherence': {
        // Analyze medication adherence with AI
        if (!groupId || !elderId) {
          return NextResponse.json(
            { success: false, error: 'groupId and elderId required for adherence analysis' },
            { status: 400 }
          );
        }

        // Fetch elder data
        const elderDoc = await db.collection('elders').doc(elderId).get();
        const elderData = elderDoc.exists ? elderDoc.data() : null;

        // Fetch medications
        const medsSnap = await db.collection('medications')
          .where('groupId', '==', groupId)
          .where('elderId', '==', elderId)
          .get();

        const medications = medsSnap.docs.map(doc => {
          const d = doc.data();
          return {
            name: d.name,
            dosage: d.dosage,
            frequency: Array.isArray(d.frequency?.times) ? `${d.frequency.times.length}x daily` : d.frequency?.type || 'as needed',
            isCritical: d.isCritical || false,
          };
        });

        // Fetch medication logs (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logsSnap = await db.collection('medication_logs')
          .where('groupId', '==', groupId)
          .where('elderId', '==', elderId)
          .where('scheduledTime', '>=', thirtyDaysAgo)
          .get();

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const logs = logsSnap.docs.map(doc => {
          const d = doc.data();
          let scheduledTime = d.scheduledTime;
          if (scheduledTime?.toDate) scheduledTime = scheduledTime.toDate();
          else if (scheduledTime?.seconds) scheduledTime = new Date(scheduledTime.seconds * 1000);

          return {
            medicationName: d.medicationName || 'Unknown',
            scheduledTime: scheduledTime || new Date(),
            status: d.status as 'taken' | 'missed' | 'skipped',
            dayOfWeek: dayNames[new Date(scheduledTime).getDay()],
            hour: new Date(scheduledTime).getHours(),
          };
        });

        const takenCount = logs.filter(l => l.status === 'taken').length;
        const historicalAdherence = logs.length > 0 ? (takenCount / logs.length) * 100 : 100;

        // Get first medication date to calculate days since start
        const firstMedDate = medsSnap.docs.reduce((earliest, doc) => {
          let startDate = doc.data().startDate;
          if (startDate?.toDate) startDate = startDate.toDate();
          else if (startDate?.seconds) startDate = new Date(startDate.seconds * 1000);
          if (!earliest || (startDate && startDate < earliest)) return startDate;
          return earliest;
        }, null as Date | null);

        const daysSinceStart = firstMedDate ?
          Math.ceil((new Date().getTime() - firstMedDate.getTime()) / (1000 * 60 * 60 * 24)) : 30;

        const prediction = await analyzeAdherenceWithAI(
          {
            elderName: elderData?.name || data?.elderName || 'Elder',
            elderAge: elderData?.age || data?.elderAge || 75,
            medicalConditions: elderData?.medicalConditions || data?.medicalConditions,
            medications,
            logs,
            historicalAdherence,
            daysSinceStart,
          },
          userId,
          userRole,
          groupId,
          elderId
        );

        return NextResponse.json({ success: true, data: prediction });
      }

      case 'burnout': {
        // Analyze caregiver burnout with AI
        if (!data?.agencyId || !data?.caregiverId) {
          return NextResponse.json(
            { success: false, error: 'agencyId and caregiverId required for burnout analysis' },
            { status: 400 }
          );
        }

        const periodDays = data.periodDays || 14;
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - periodDays);

        // Fetch shift sessions for this caregiver
        const shiftsSnap = await db.collection('shiftSessions')
          .where('caregiverId', '==', data.caregiverId)
          .where('status', '==', 'completed')
          .where('startTime', '>=', periodStart)
          .get();

        const shifts = shiftsSnap.docs.map(doc => {
          const d = doc.data();
          let startTime = d.startTime;
          let endTime = d.endTime;
          if (startTime?.toDate) startTime = startTime.toDate();
          else if (startTime?.seconds) startTime = new Date(startTime.seconds * 1000);
          if (endTime?.toDate) endTime = endTime.toDate();
          else if (endTime?.seconds) endTime = new Date(endTime.seconds * 1000);

          const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

          return {
            date: startTime,
            startTime,
            endTime,
            elderId: d.elderId,
            elderName: d.elderName || 'Elder',
            hoursWorked,
          };
        });

        const totalHoursWorked = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
        const regularHours = 8 * periodDays * (5 / 7); // Assuming 5-day work week
        const overtimeHours = Math.max(0, totalHoursWorked - regularHours);

        // Calculate consecutive days worked
        const workDays = new Set(shifts.map(s => s.date.toDateString()));
        let consecutiveDays = 0;
        let tempConsecutive = 0;
        const checkDate = new Date();
        for (let i = 0; i < periodDays; i++) {
          if (workDays.has(checkDate.toDateString())) {
            tempConsecutive++;
            consecutiveDays = Math.max(consecutiveDays, tempConsecutive);
          } else {
            tempConsecutive = 0;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }

        const uniqueElders = new Set(shifts.map(s => s.elderId)).size;
        const averageShiftLength = shifts.length > 0 ? totalHoursWorked / shifts.length : 8;

        const prediction = await analyzeBurnoutWithAI(
          {
            caregiverId: data.caregiverId,
            caregiverName: data.caregiverName,
            periodDays,
            shifts,
            totalHoursWorked,
            overtimeHours,
            consecutiveDaysWorked: consecutiveDays,
            uniqueEldersCount: uniqueElders,
            averageShiftLength,
            previousPeriodData: data.previousPeriodData,
          },
          userId,
          userRole,
          groupId || data.agencyId
        );

        return NextResponse.json({ success: true, data: prediction });
      }

      case 'refill': {
        // Analyze medication refill needs with AI
        if (!groupId || !elderId || !data?.medicationId) {
          return NextResponse.json(
            { success: false, error: 'groupId, elderId, and medicationId required' },
            { status: 400 }
          );
        }

        // Fetch medication
        const medDoc = await db.collection('medications').doc(data.medicationId).get();
        if (!medDoc.exists) {
          return NextResponse.json(
            { success: false, error: 'Medication not found' },
            { status: 404 }
          );
        }

        const medData = medDoc.data()!;
        let lastRefillDate = medData.supply?.lastRefillDate;
        if (lastRefillDate?.toDate) lastRefillDate = lastRefillDate.toDate();
        else if (lastRefillDate?.seconds) lastRefillDate = new Date(lastRefillDate.seconds * 1000);

        const medication = {
          id: medDoc.id,
          name: medData.name,
          dosage: medData.dosage,
          frequency: Array.isArray(medData.frequency?.times) ? `${medData.frequency.times.length}x daily` : medData.frequency?.type || 'as needed',
          currentQuantity: medData.supply?.currentQuantity || 0,
          isCritical: medData.isCritical || false,
          lastRefillDate,
          lastRefillQuantity: medData.supply?.lastRefillQuantity,
        };

        // Fetch medication logs (last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const logsSnap = await db.collection('medication_logs')
          .where('medicationId', '==', data.medicationId)
          .where('scheduledTime', '>=', sixtyDaysAgo)
          .get();

        const logs = logsSnap.docs.map(doc => {
          const d = doc.data();
          let scheduledTime = d.scheduledTime;
          if (scheduledTime?.toDate) scheduledTime = scheduledTime.toDate();
          else if (scheduledTime?.seconds) scheduledTime = new Date(scheduledTime.seconds * 1000);

          return {
            date: scheduledTime || new Date(),
            status: d.status as 'taken' | 'missed' | 'skipped',
          };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());

        // Get elder data
        const elderDoc = await db.collection('elders').doc(elderId).get();
        const elderData = elderDoc.exists ? elderDoc.data() : null;

        const prediction = await analyzeRefillNeedsWithAI(
          {
            medication,
            logs,
            elderName: elderData?.name || 'Elder',
            elderAge: elderData?.age || 75,
          },
          userId,
          userRole,
          groupId,
          elderId
        );

        return NextResponse.json({ success: true, data: prediction });
      }

      case 'trends': {
        // Analyze health trends with AI
        if (!groupId || !elderId) {
          return NextResponse.json(
            { success: false, error: 'groupId and elderId required for trend analysis' },
            { status: 400 }
          );
        }

        const numberOfWeeks = data?.numberOfWeeks || 12;

        // Get elder data
        const elderDoc = await db.collection('elders').doc(elderId).get();
        const elderData = elderDoc.exists ? elderDoc.data() : null;

        // Get medications
        const medsSnap = await db.collection('medications')
          .where('groupId', '==', groupId)
          .where('elderId', '==', elderId)
          .get();

        const medications = medsSnap.docs.map(doc => ({
          name: doc.data().name,
          isCritical: doc.data().isCritical || false,
        }));

        // Calculate weekly data
        const weeks: Array<{
          weekLabel: string;
          weekStart: Date;
          complianceRate: number;
          missedDoses: number;
          totalDoses: number;
          dietEntries: number;
        }> = [];

        for (let i = numberOfWeeks - 1; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          // Fetch medication logs for this week
          const weekLogsSnap = await db.collection('medication_logs')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('scheduledTime', '>=', weekStart)
            .where('scheduledTime', '<', weekEnd)
            .get();

          const weekLogs = weekLogsSnap.docs.map(doc => doc.data());
          const totalDoses = weekLogs.length;
          const takenDoses = weekLogs.filter(l => l.status === 'taken').length;
          const missedDoses = weekLogs.filter(l => l.status === 'missed').length;
          const complianceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

          // Fetch diet entries for this week
          const dietSnap = await db.collection('diet_entries')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('timestamp', '>=', weekStart)
            .where('timestamp', '<', weekEnd)
            .get();

          weeks.push({
            weekLabel: `Week ${numberOfWeeks - i}`,
            weekStart,
            complianceRate,
            missedDoses,
            totalDoses,
            dietEntries: dietSnap.size,
          });
        }

        const analysis = await analyzeTrendsWithAI(
          {
            elderName: elderData?.name || 'Elder',
            weeks,
            medicalConditions: elderData?.medicalConditions,
            medications,
          },
          userId,
          userRole,
          groupId,
          elderId
        );

        return NextResponse.json({ success: true, data: analysis });
      }

      case 'alerts': {
        // Prioritize alerts with AI
        if (!groupId || !elderId) {
          return NextResponse.json(
            { success: false, error: 'groupId and elderId required for alert prioritization' },
            { status: 400 }
          );
        }

        // Get elder data
        const elderDoc = await db.collection('elders').doc(elderId).get();
        const elderData = elderDoc.exists ? elderDoc.data() : null;

        // Get current alerts
        const alertsSnap = await db.collection('alerts')
          .where('groupId', '==', groupId)
          .where('elderId', '==', elderId)
          .where('status', '==', 'active')
          .get();

        const alerts = alertsSnap.docs.map(doc => {
          const d = doc.data();
          let createdAt = d.createdAt;
          if (createdAt?.toDate) createdAt = createdAt.toDate();
          else if (createdAt?.seconds) createdAt = new Date(createdAt.seconds * 1000);

          return {
            id: doc.id,
            type: d.type,
            severity: d.severity,
            title: d.title,
            message: d.message,
            createdAt: createdAt || new Date(),
            data: d.data,
          };
        });

        // Get recent alert history
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const historySnap = await db.collection('alerts')
          .where('groupId', '==', groupId)
          .where('elderId', '==', elderId)
          .where('createdAt', '>=', sevenDaysAgo)
          .get();

        const recentAlertHistory = historySnap.docs.map(doc => {
          const d = doc.data();
          let createdAt = d.createdAt;
          if (createdAt?.toDate) createdAt = createdAt.toDate();
          else if (createdAt?.seconds) createdAt = new Date(createdAt.seconds * 1000);

          return {
            type: d.type,
            createdAt: createdAt || new Date(),
            wasActioned: d.status === 'actioned',
            wasDismissed: d.status === 'dismissed',
          };
        });

        // Get user preferences
        const prefsDoc = await db.collection('userAlertPreferences').doc(userId).get();
        const userPreferences = prefsDoc.exists ? prefsDoc.data() : undefined;

        const prioritization = await prioritizeAlertsWithAI(
          {
            elderName: elderData?.name || 'Elder',
            elderAge: elderData?.age || 75,
            medicalConditions: elderData?.medicalConditions,
            alerts,
            recentAlertHistory,
            userPreferences: userPreferences as any,
          },
          userId,
          userRole,
          groupId,
          elderId
        );

        return NextResponse.json({ success: true, data: prioritization });
      }

      case 'compliance-status': {
        // Get AI-driven compliance status
        if (!data?.percentage) {
          return NextResponse.json(
            { success: false, error: 'percentage required for compliance status' },
            { status: 400 }
          );
        }

        const status = await getAIComplianceStatus(
          {
            percentage: data.percentage,
            elderName: data.elderName || 'Elder',
            elderAge: data.elderAge || 75,
            medicalConditions: data.medicalConditions,
            hasCriticalMedications: data.hasCriticalMedications || false,
            historicalAverage: data.historicalAverage || data.percentage,
            recentTrend: data.recentTrend || 'stable',
          },
          userId,
          userRole,
          groupId || 'general',
          elderId || 'general'
        );

        return NextResponse.json({ success: true, data: status });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown analysis type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
