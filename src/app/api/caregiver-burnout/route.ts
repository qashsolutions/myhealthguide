/**
 * Caregiver Burnout Assessment API
 *
 * Uses Admin SDK to bypass client-side Firestore limitations
 * Only accessible by agency super_admins
 *
 * Now supports AI-driven burnout analysis via useAI=true parameter
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken, getUserDataServer } from '@/lib/api/verifyAuth';
import { analyzeBurnoutWithAI, type AIBurnoutPrediction } from '@/lib/ai/agenticAnalytics';
import type { CaregiverBurnoutAssessment, BurnoutFactor } from '@/types';
import type { UserRole } from '@/lib/medical/phiAuditLog';

interface CaregiverWorkload {
  caregiverId: string;
  totalHours: number;
  overtimeHours: number;
  consecutiveDays: number;
  elderCount: number;
  shiftsWorked: number;
  avgShiftLength: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const periodDays = parseInt(searchParams.get('periodDays') || '14', 10);
    const useAI = searchParams.get('useAI') === 'true';

    if (!agencyId) {
      return NextResponse.json({ success: false, error: 'Agency ID is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify user is super_admin of this agency
    const agencyDoc = await db.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agencyDoc.data();
    if (agencyData?.superAdminId !== authResult.userId) {
      return NextResponse.json({ success: false, error: 'Access denied - Super Admin only' }, { status: 403 });
    }

    // Get all caregivers in agency
    const caregiverIds: string[] = agencyData.caregiverIds || [];

    if (caregiverIds.length === 0) {
      return NextResponse.json({ success: true, assessments: [] });
    }

    // Get user role for AI analysis
    const userData = await getUserDataServer(authResult.userId);
    const userRole: UserRole = userData?.role || 'member';

    // Assess each caregiver
    const assessments: CaregiverBurnoutAssessment[] = [];

    for (const caregiverId of caregiverIds) {
      if (useAI) {
        // Use AI-driven analysis
        const aiAssessment = await assessCaregiverBurnoutWithAI(
          db, agencyId, caregiverId, periodDays, authResult.userId, userRole
        );
        if (aiAssessment) {
          assessments.push(aiAssessment);
        }
      } else {
        // Use traditional analysis with adaptive thresholds
        const assessment = await assessCaregiverBurnout(db, agencyId, caregiverId, periodDays);
        if (assessment) {
          assessments.push(assessment);
        }
      }
    }

    // Sort by risk score (highest first)
    assessments.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ success: true, assessments, useAI });

  } catch (error) {
    console.error('Error in caregiver burnout API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function assessCaregiverBurnout(
  db: FirebaseFirestore.Firestore,
  agencyId: string,
  caregiverId: string,
  periodDays: number
): Promise<CaregiverBurnoutAssessment | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get caregiver's shift history using Admin SDK
    const shiftsSnap = await db.collection('shiftSessions')
      .where('agencyId', '==', agencyId)
      .where('caregiverId', '==', caregiverId)
      .where('status', '==', 'completed')
      .get();

    // Filter by date range in memory (avoids composite index requirement)
    const shifts = shiftsSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate()
      }))
      .filter(shift => {
        if (!shift.startTime) return false;
        return shift.startTime >= startDate && shift.startTime <= endDate;
      });

    if (shifts.length === 0) {
      return null; // No data to assess
    }

    // Calculate workload metrics
    const workload = calculateWorkload(shifts, caregiverId);

    // Analyze burnout factors
    const factors: BurnoutFactor[] = [];
    let totalScore = 0;

    // FACTOR 1: Overtime hours
    if (workload.overtimeHours > 0) {
      const overtimeFactor = analyzeOvertime(workload.overtimeHours, periodDays);
      if (overtimeFactor) {
        factors.push(overtimeFactor);
        totalScore += overtimeFactor.points;
      }
    }

    // FACTOR 2: Consecutive days
    if (workload.consecutiveDays >= 7) {
      const consecutiveFactor = analyzeConsecutiveDays(workload.consecutiveDays);
      if (consecutiveFactor) {
        factors.push(consecutiveFactor);
        totalScore += consecutiveFactor.points;
      }
    }

    // FACTOR 3: High elder count
    if (workload.elderCount > 3) {
      const elderCountFactor = analyzeElderCount(workload.elderCount);
      if (elderCountFactor) {
        factors.push(elderCountFactor);
        totalScore += elderCountFactor.points;
      }
    }

    // FACTOR 4: Long shift lengths
    if (workload.avgShiftLength > 10) {
      const shiftLengthFactor = analyzeShiftLength(workload.avgShiftLength);
      if (shiftLengthFactor) {
        factors.push(shiftLengthFactor);
        totalScore += shiftLengthFactor.points;
      }
    }

    // Determine risk level using adaptive thresholds
    const burnoutRisk = getBurnoutRisk(totalScore, workload);

    // Generate recommendations
    const recommendations = generateBurnoutRecommendations(factors, workload);

    const assessment: CaregiverBurnoutAssessment = {
      id: `${agencyId}-${caregiverId}-${Date.now()}`,
      agencyId,
      caregiverId,
      assessmentDate: new Date(),
      period: { start: startDate, end: endDate },
      burnoutRisk,
      riskScore: totalScore,
      factors,
      recommendations,
      alertGenerated: totalScore >= 60,
      alertId: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      actionTaken: undefined
    };

    return assessment;

  } catch (error) {
    console.error(`Error assessing caregiver ${caregiverId}:`, error);
    return null;
  }
}

function calculateWorkload(shifts: any[], caregiverId: string): CaregiverWorkload {
  let totalHours = 0;
  let overtimeHours = 0;
  const elderIds = new Set<string>();
  const shiftDates = new Set<string>();

  shifts.forEach(shift => {
    if (shift.actualDuration) {
      const hours = shift.actualDuration / 60;
      totalHours += hours;

      // Count overtime (>8 hours per shift)
      if (hours > 8) {
        overtimeHours += hours - 8;
      }
    }

    if (shift.elderId) {
      elderIds.add(shift.elderId);
    }

    if (shift.startTime) {
      shiftDates.add(shift.startTime.toDateString());
    }
  });

  // Calculate consecutive days
  const sortedDates = Array.from(shiftDates)
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let maxConsecutive = 1;
  let currentConsecutive = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = Math.floor(
      (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }

  return {
    caregiverId,
    totalHours,
    overtimeHours,
    consecutiveDays: maxConsecutive,
    elderCount: elderIds.size,
    shiftsWorked: shifts.length,
    avgShiftLength: shifts.length > 0 ? totalHours / shifts.length : 0
  };
}

function analyzeOvertime(overtimeHours: number, periodDays: number): BurnoutFactor | null {
  const weeklyOvertime = (overtimeHours / periodDays) * 7;

  if (weeklyOvertime > 10) {
    return {
      type: 'overtime_hours',
      description: `${Math.round(overtimeHours)} overtime hours in ${periodDays} days (${Math.round(weeklyOvertime)} hours/week)`,
      severity: weeklyOvertime > 20 ? 'high' : 'moderate',
      data: { overtimeHours, weeklyOvertime },
      points: weeklyOvertime > 20 ? 30 : 20
    };
  }

  return null;
}

function analyzeConsecutiveDays(days: number): BurnoutFactor | null {
  if (days >= 10) {
    return {
      type: 'consecutive_days',
      description: `${days} consecutive days worked without a break`,
      severity: 'high',
      data: { consecutiveDays: days },
      points: 25
    };
  } else if (days >= 7) {
    return {
      type: 'consecutive_days',
      description: `${days} consecutive days worked`,
      severity: 'moderate',
      data: { consecutiveDays: days },
      points: 15
    };
  }

  return null;
}

function analyzeElderCount(elderCount: number): BurnoutFactor | null {
  if (elderCount > 5) {
    return {
      type: 'high_elder_count',
      description: `Caring for ${elderCount} different elders`,
      severity: 'high',
      data: { elderCount },
      points: 20
    };
  } else if (elderCount > 3) {
    return {
      type: 'high_elder_count',
      description: `Caring for ${elderCount} elders`,
      severity: 'moderate',
      data: { elderCount },
      points: 10
    };
  }

  return null;
}

function analyzeShiftLength(avgShiftLength: number): BurnoutFactor | null {
  if (avgShiftLength > 12) {
    return {
      type: 'overtime_hours',
      description: `Average shift length: ${Math.round(avgShiftLength)} hours`,
      severity: 'high',
      data: { avgShiftLength },
      points: 15
    };
  } else if (avgShiftLength > 10) {
    return {
      type: 'overtime_hours',
      description: `Average shift length: ${Math.round(avgShiftLength)} hours`,
      severity: 'moderate',
      data: { avgShiftLength },
      points: 10
    };
  }

  return null;
}

/**
 * Adaptive burnout risk calculation based on workload patterns
 * Uses dynamic thresholds instead of fixed 30/50/70 values
 */
function getBurnoutRisk(
  score: number,
  workload: CaregiverWorkload
): 'low' | 'moderate' | 'high' | 'critical' {
  // Calculate adaptive thresholds based on workload characteristics
  // Caregivers with sustained high workloads have lower thresholds (more at risk)
  const weeklyHours = (workload.totalHours / 14) * 7; // Normalize to weekly
  const isHighVolume = weeklyHours > 50;
  const isHighComplexity = workload.elderCount > 4;

  // Adjust thresholds based on context
  let criticalThreshold = 70;
  let highThreshold = 50;
  let moderateThreshold = 30;

  if (isHighVolume) {
    // High volume caregivers reach burnout faster
    criticalThreshold -= 10;
    highThreshold -= 8;
    moderateThreshold -= 5;
  }

  if (isHighComplexity) {
    // Many elders = more cognitive load
    criticalThreshold -= 5;
    highThreshold -= 5;
    moderateThreshold -= 3;
  }

  // Also factor in consecutive days as a severity multiplier
  if (workload.consecutiveDays >= 10) {
    criticalThreshold -= 10;
    highThreshold -= 8;
  }

  if (score >= criticalThreshold) return 'critical';
  if (score >= highThreshold) return 'high';
  if (score >= moderateThreshold) return 'moderate';
  return 'low';
}

function generateBurnoutRecommendations(
  factors: BurnoutFactor[],
  workload: CaregiverWorkload
): string[] {
  const recommendations: string[] = [];

  if (factors.some(f => f.type === 'overtime_hours')) {
    recommendations.push('Reduce overtime hours - consider redistributing shifts');
  }

  if (factors.some(f => f.type === 'consecutive_days')) {
    recommendations.push('Schedule mandatory days off to prevent burnout');
  }

  if (factors.some(f => f.type === 'high_elder_count')) {
    recommendations.push('Reduce number of assigned elders for better work-life balance');
  }

  if (workload.avgShiftLength > 10) {
    recommendations.push('Consider shorter shift lengths or additional support');
  }

  recommendations.push('Schedule check-in meeting with caregiver to discuss workload');
  recommendations.push('Monitor for signs of stress or reduced performance');

  return recommendations;
}

/**
 * AI-driven caregiver burnout assessment
 * Uses Gemini 3 Pro Preview with thinking mode for deep analysis
 */
async function assessCaregiverBurnoutWithAI(
  db: FirebaseFirestore.Firestore,
  agencyId: string,
  caregiverId: string,
  periodDays: number,
  userId: string,
  userRole: UserRole
): Promise<CaregiverBurnoutAssessment | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get caregiver's shift history
    const shiftsSnap = await db.collection('shiftSessions')
      .where('agencyId', '==', agencyId)
      .where('caregiverId', '==', caregiverId)
      .where('status', '==', 'completed')
      .get();

    const shifts = shiftsSnap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate()
      }))
      .filter(shift => {
        if (!shift.startTime) return false;
        return shift.startTime >= startDate && shift.startTime <= endDate;
      });

    if (shifts.length === 0) {
      return null;
    }

    // Calculate workload metrics
    const workload = calculateWorkload(shifts, caregiverId);

    // Prepare shifts for AI analysis
    const shiftsForAI = shifts.map(s => ({
      date: s.startTime,
      startTime: s.startTime,
      endTime: s.endTime,
      elderId: (s as any).elderId || 'unknown',
      elderName: (s as any).elderName || 'Elder',
      hoursWorked: ((s as any).actualDuration || 0) / 60,
    }));

    // Get previous period data for comparison
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

    const prevShiftsSnap = await db.collection('shiftSessions')
      .where('agencyId', '==', agencyId)
      .where('caregiverId', '==', caregiverId)
      .where('status', '==', 'completed')
      .get();

    const prevShifts = prevShiftsSnap.docs
      .map(doc => ({
        startTime: doc.data().startTime?.toDate(),
        actualDuration: doc.data().actualDuration || 0
      }))
      .filter(shift => {
        if (!shift.startTime) return false;
        return shift.startTime >= prevPeriodStart && shift.startTime < startDate;
      });

    const prevTotalHours = prevShifts.reduce((sum, s) => sum + (s.actualDuration / 60), 0);
    const prevRegularHours = 8 * periodDays * (5 / 7);
    const prevOvertimeHours = Math.max(0, prevTotalHours - prevRegularHours);

    // Call AI analysis
    const aiPrediction = await analyzeBurnoutWithAI(
      {
        caregiverId,
        caregiverName: undefined,
        periodDays,
        shifts: shiftsForAI,
        totalHoursWorked: workload.totalHours,
        overtimeHours: workload.overtimeHours,
        consecutiveDaysWorked: workload.consecutiveDays,
        uniqueEldersCount: workload.elderCount,
        averageShiftLength: workload.avgShiftLength,
        previousPeriodData: prevShifts.length > 0 ? {
          totalHours: prevTotalHours,
          overtimeHours: prevOvertimeHours,
          burnoutScore: 0, // We don't have previous score
        } : undefined,
      },
      userId,
      userRole,
      agencyId
    );

    // Convert AI prediction to CaregiverBurnoutAssessment format
    const factors: BurnoutFactor[] = aiPrediction.factors.map(f => ({
      type: f.type as BurnoutFactor['type'],
      description: f.description,
      severity: f.severity,
      data: { contribution: f.contribution, trend: f.trend },
      points: f.contribution,
    }));

    const assessment: CaregiverBurnoutAssessment = {
      id: `${agencyId}-${caregiverId}-${Date.now()}`,
      agencyId,
      caregiverId,
      assessmentDate: new Date(),
      period: { start: startDate, end: endDate },
      burnoutRisk: aiPrediction.burnoutRisk,
      riskScore: aiPrediction.riskScore,
      factors,
      recommendations: aiPrediction.interventions.map(i => `[${i.urgency.toUpperCase()}] ${i.description}`),
      alertGenerated: aiPrediction.riskScore >= 60,
      alertId: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      actionTaken: undefined,
      // Add AI-specific data
      aiAnalysis: {
        trajectory: aiPrediction.trajectory,
        predictedDaysToHighRisk: aiPrediction.predictedDaysToHighRisk,
        personalizedThresholds: aiPrediction.personalizedThresholds,
        workloadAnalysis: aiPrediction.workloadAnalysis,
        reasoning: aiPrediction.reasoning,
      },
    };

    return assessment;

  } catch (error) {
    console.error(`Error in AI burnout assessment for ${caregiverId}:`, error);
    // Fall back to traditional assessment
    return assessCaregiverBurnout(db, agencyId, caregiverId, periodDays);
  }
}
