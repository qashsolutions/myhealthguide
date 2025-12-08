/**
 * Caregiver Burnout Prediction System
 *
 * Analyzes workload metrics for agency caregivers:
 * - Overtime hours
 * - Consecutive days worked
 * - Number of elders assigned
 * - Shift complexity
 *
 * ONLY for agency admins to monitor caregiver wellbeing
 */

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import type { CaregiverBurnoutAssessment, BurnoutFactor } from '@/types';

interface CaregiverWorkload {
  caregiverId: string;
  totalHours: number;
  overtimeHours: number;
  consecutiveDays: number;
  elderCount: number;
  shiftsWorked: number;
  avgShiftLength: number;
}

/**
 * Assess caregiver burnout risk
 */
export async function assessCaregiverBurnout(
  agencyId: string,
  caregiverId: string,
  periodDays: number = 14
): Promise<CaregiverBurnoutAssessment | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get caregiver's shift history
    const shiftsQuery = query(
      collection(db, 'shiftSessions'),
      where('agencyId', '==', agencyId),
      where('caregiverId', '==', caregiverId),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'completed')
    );

    const shiftsSnap = await getDocs(shiftsQuery);
    const shifts = shiftsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate(),
      endTime: doc.data().endTime?.toDate()
    }));

    if (shifts.length === 0) {
      return null; // No data to assess
    }

    // Calculate workload metrics
    const workload = calculateWorkload(shifts);

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

    // Determine risk level
    const burnoutRisk = getBurnoutRisk(totalScore);

    // Generate recommendations
    const recommendations = generateBurnoutRecommendations(factors, workload);

    const assessment: Omit<CaregiverBurnoutAssessment, 'id'> = {
      agencyId,
      caregiverId,
      assessmentDate: new Date(),
      period: { start: startDate, end: endDate },
      burnoutRisk,
      riskScore: totalScore,
      factors,
      recommendations,
      alertGenerated: totalScore >= 60, // Generate alert if score >= 60
      alertId: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      actionTaken: undefined
    };

    // Save to Firestore
    const assessmentRef = await addDoc(collection(db, 'caregiverBurnoutAssessments'), assessment);

    return { ...assessment, id: assessmentRef.id };

  } catch (error) {
    console.error('Error assessing caregiver burnout:', error);
    return null;
  }
}

function calculateWorkload(shifts: any[]): CaregiverWorkload {
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
    caregiverId: shifts[0].caregiverId,
    totalHours,
    overtimeHours,
    consecutiveDays: maxConsecutive,
    elderCount: elderIds.size,
    shiftsWorked: shifts.length,
    avgShiftLength: totalHours / shifts.length
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

function getBurnoutRisk(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
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
 * Assess all caregivers in an agency
 */
export async function assessAllCaregivers(
  agencyId: string,
  periodDays: number = 14
): Promise<CaregiverBurnoutAssessment[]> {
  try {
    // Get agency document by ID
    const agencyRef = doc(db, 'agencies', agencyId);
    const agencySnap = await getDoc(agencyRef);

    if (!agencySnap.exists()) return [];

    const agency = agencySnap.data();
    const caregiverIds: string[] = agency.caregiverIds || [];

    const assessments: CaregiverBurnoutAssessment[] = [];

    for (const caregiverId of caregiverIds) {
      const assessment = await assessCaregiverBurnout(agencyId, caregiverId, periodDays);
      if (assessment) {
        assessments.push(assessment);
      }
    }

    return assessments;

  } catch (error) {
    console.error('Error assessing all caregivers:', error);
    return [];
  }
}
