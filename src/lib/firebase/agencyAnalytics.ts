/**
 * Agency Analytics Service
 *
 * Provides business intelligence and analytics for SuperAdmin dashboard
 * Only for multi-agency tier, super admin role
 */

import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

export interface BillableHoursData {
  month: string;
  totalHours: number;
  billableHours: number;
  projectedRevenue: number;
}

export interface StaffUtilizationMetrics {
  caregiverId: string;
  caregiverName: string;
  hoursWorked: number;
  availableHours: number;
  utilizationRate: number;
  shiftCount: number;
}

export interface BurnoutAlert {
  caregiverId: string;
  caregiverName: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  factors: string[];
  consecutiveDays: number;
  hoursThisWeek: number;
  recommendedAction: string;
}

export interface ScheduleCoverageStats {
  dayOfWeek: string;
  totalShifts: number;
  filledShifts: number;
  coverageRate: number;
}

export interface ComplianceDataPoint {
  date: string;
  averageCompliance: number;
  elderCount: number;
}

export interface CaregiverPerformance {
  caregiverId: string;
  caregiverName: string;
  rank: number;
  hoursWorked: number;
  complianceRate: number;
  noShows: number;
  lateClockIns: number;
  avgRating: number;
}

/**
 * Get billable hours data for the last N months
 */
export async function getBillableHoursData(
  agencyId: string,
  monthsBack: number = 6
): Promise<BillableHoursData[]> {
  try {
    const data: BillableHoursData[] = [];
    const today = new Date();

    // Fetch all completed shifts once, then filter by month in memory
    // This avoids needing a composite index on (agencyId, status, startTime)
    const shiftsQuery = query(
      collection(db, 'shiftSessions'),
      where('agencyId', '==', agencyId),
      where('status', '==', 'completed'),
      limit(1000)
    );

    const allShifts = await getDocs(shiftsQuery);

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      // Filter shifts for this month in memory
      let totalHours = 0;

      allShifts.docs.forEach(doc => {
        const shift = doc.data();
        if (shift.startTime && shift.endTime) {
          const shiftDate = shift.startTime.toDate();
          if (shiftDate >= startDate && shiftDate <= endDate) {
            const start = shift.startTime.toDate();
            const end = shift.endTime.toDate();
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
          }
        }
      });

      // Assume $15/hour average billing rate (configurable later)
      const billableHours = totalHours;
      const projectedRevenue = billableHours * 15;

      data.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        totalHours: Math.round(totalHours * 10) / 10,
        billableHours: Math.round(billableHours * 10) / 10,
        projectedRevenue: Math.round(projectedRevenue)
      });
    }

    return data;
  } catch (error) {
    console.error('Error getting billable hours data:', error);
    return [];
  }
}

/**
 * Get staff utilization metrics for all caregivers in agency
 */
export async function getStaffUtilizationMetrics(
  agencyId: string,
  caregiverIds: string[],
  caregiverNames: Map<string, string>
): Promise<StaffUtilizationMetrics[]> {
  try {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const metrics: StaffUtilizationMetrics[] = [];

    for (const caregiverId of caregiverIds) {
      const shiftsQuery = query(
        collection(db, 'shiftSessions'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'completed'),
        where('startTime', '>=', Timestamp.fromDate(weekStart)),
        where('startTime', '<=', Timestamp.fromDate(weekEnd))
      );

      const snapshot = await getDocs(shiftsQuery);
      let hoursWorked = 0;
      const shiftCount = snapshot.size;

      snapshot.docs.forEach(doc => {
        const shift = doc.data();
        if (shift.startTime && shift.endTime) {
          const start = shift.startTime.toDate();
          const end = shift.endTime.toDate();
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          hoursWorked += hours;
        }
      });

      // Assume 40 hours available per week (configurable per caregiver later)
      const availableHours = 40;
      const utilizationRate = (hoursWorked / availableHours) * 100;

      metrics.push({
        caregiverId,
        caregiverName: caregiverNames.get(caregiverId) || caregiverId,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        availableHours,
        utilizationRate: Math.round(utilizationRate),
        shiftCount
      });
    }

    // Sort by utilization rate descending
    return metrics.sort((a, b) => b.utilizationRate - a.utilizationRate);
  } catch (error) {
    console.error('Error getting staff utilization:', error);
    return [];
  }
}

/**
 * Get burnout risk alerts for caregivers
 */
export async function getBurnoutRiskAlerts(
  agencyId: string,
  caregiverIds: string[],
  caregiverNames: Map<string, string>
): Promise<BurnoutAlert[]> {
  try {
    const alerts: BurnoutAlert[] = [];
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    for (const caregiverId of caregiverIds) {
      // Get shifts this week
      const shiftsQuery = query(
        collection(db, 'shiftSessions'),
        where('caregiverId', '==', caregiverId),
        where('startTime', '>=', Timestamp.fromDate(weekStart)),
        where('startTime', '<=', Timestamp.fromDate(weekEnd)),
        orderBy('startTime', 'asc')
      );

      const snapshot = await getDocs(shiftsQuery);
      let hoursThisWeek = 0;
      let consecutiveDays = 0;
      const workDates = new Set<string>();

      snapshot.docs.forEach(doc => {
        const shift = doc.data();
        if (shift.startTime && shift.endTime) {
          const start = shift.startTime.toDate();
          const end = shift.endTime.toDate();
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          hoursThisWeek += hours;

          const dateKey = start.toISOString().split('T')[0];
          workDates.add(dateKey);
        }
      });

      // Calculate consecutive days (simplified - actual would need more logic)
      consecutiveDays = workDates.size;

      // Determine risk level
      const factors: string[] = [];
      let riskLevel: BurnoutAlert['riskLevel'] = 'low';

      if (hoursThisWeek > 60) {
        factors.push('Excessive hours (>60 hrs/week)');
        riskLevel = 'critical';
      } else if (hoursThisWeek > 50) {
        factors.push('High hours (>50 hrs/week)');
        riskLevel = 'high';
      } else if (hoursThisWeek > 45) {
        factors.push('Moderate overtime (>45 hrs/week)');
        riskLevel = 'moderate';
      }

      if (consecutiveDays >= 14) {
        factors.push('14+ consecutive days worked');
        riskLevel = 'critical';
      } else if (consecutiveDays >= 10) {
        factors.push('10+ consecutive days worked');
        if (riskLevel === 'low') riskLevel = 'high';
      } else if (consecutiveDays >= 7) {
        factors.push('7+ consecutive days worked');
        if (riskLevel === 'low') riskLevel = 'moderate';
      }

      // Only include if there's actual risk
      if (factors.length > 0) {
        let recommendedAction = 'Monitor closely';
        if (riskLevel === 'critical') {
          recommendedAction = 'Immediate action required - schedule time off';
        } else if (riskLevel === 'high') {
          recommendedAction = 'Schedule break within 48 hours';
        } else if (riskLevel === 'moderate') {
          recommendedAction = 'Consider reducing hours next week';
        }

        alerts.push({
          caregiverId,
          caregiverName: caregiverNames.get(caregiverId) || caregiverId,
          riskLevel,
          factors,
          consecutiveDays,
          hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
          recommendedAction
        });
      }
    }

    // Sort by risk level (critical first)
    const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
    return alerts.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
  } catch (error) {
    console.error('Error getting burnout alerts:', error);
    return [];
  }
}

/**
 * Get schedule coverage statistics by day of week
 */
export async function getScheduleCoverageStats(
  agencyId: string
): Promise<ScheduleCoverageStats[]> {
  try {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    // Simplified query - filter by agencyId only, then filter dates in memory
    // This avoids needing a composite index on (agencyId, date)
    const scheduledQuery = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      limit(500)
    );

    const allShifts = await getDocs(scheduledQuery);

    // Filter by date range in memory
    const snapshot = allShifts.docs.filter(doc => {
      const shift = doc.data();
      if (!shift.date) return false;
      const shiftDate = shift.date.toDate();
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });

    const dayStats = new Map<number, { total: number; filled: number }>();
    for (let i = 0; i < 7; i++) {
      dayStats.set(i, { total: 0, filled: 0 });
    }

    snapshot.forEach(doc => {
      const shift = doc.data();
      const date = shift.date.toDate();
      const dayOfWeek = date.getDay();

      const stats = dayStats.get(dayOfWeek)!;
      stats.total++;

      if (shift.status !== 'cancelled' && shift.caregiverId) {
        stats.filled++;
      }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: ScheduleCoverageStats[] = [];

    for (let i = 0; i < 7; i++) {
      const stats = dayStats.get(i)!;
      const coverageRate = stats.total > 0 ? (stats.filled / stats.total) * 100 : 0;

      result.push({
        dayOfWeek: days[i],
        totalShifts: stats.total,
        filledShifts: stats.filled,
        coverageRate: Math.round(coverageRate)
      });
    }

    return result;
  } catch (error) {
    console.error('Error getting schedule coverage:', error);
    return [];
  }
}

/**
 * Get portfolio-wide compliance data over time
 */
export async function getPortfolioComplianceData(
  agencyId: string,
  elderIds: string[],
  days: number = 90
): Promise<ComplianceDataPoint[]> {
  try {
    // This is a simplified version - actual would aggregate medication logs per day
    // For now, return sample trend data structure
    const data: ComplianceDataPoint[] = [];
    const today = new Date();

    // Sample implementation - replace with actual aggregation
    for (let i = days - 1; i >= 0; i -= 7) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        averageCompliance: 85 + Math.random() * 10, // Replace with actual calculation
        elderCount: elderIds.length
      });
    }

    return data;
  } catch (error) {
    console.error('Error getting compliance data:', error);
    return [];
  }
}

/**
 * Get caregiver performance rankings
 */
export async function getCaregiverPerformanceRankings(
  agencyId: string,
  caregiverIds: string[],
  caregiverNames: Map<string, string>,
  period: 'week' | 'month' = 'month'
): Promise<CaregiverPerformance[]> {
  try {
    const startDate = period === 'week'
      ? startOfWeek(new Date())
      : startOfMonth(new Date());
    const endDate = new Date();

    const performances: CaregiverPerformance[] = [];

    for (const caregiverId of caregiverIds) {
      const shiftsQuery = query(
        collection(db, 'shiftSessions'),
        where('caregiverId', '==', caregiverId),
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(shiftsQuery);
      let hoursWorked = 0;
      let noShows = 0;
      let lateClockIns = 0;

      snapshot.docs.forEach(doc => {
        const shift = doc.data();
        if (shift.startTime && shift.endTime) {
          const start = shift.startTime.toDate();
          const end = shift.endTime.toDate();
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          hoursWorked += hours;
        }

        if (shift.status === 'no_show') noShows++;

        // Check if clocked in late (would need scheduledStartTime to compare)
        // For now, simplified
      });

      performances.push({
        caregiverId,
        caregiverName: caregiverNames.get(caregiverId) || caregiverId,
        rank: 0, // Will be set after sorting
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        complianceRate: 92 + Math.random() * 6, // Replace with actual from medication logs
        noShows,
        lateClockIns,
        avgRating: 4.5 + Math.random() * 0.5 // Replace with actual ratings if implemented
      });
    }

    // Sort by hours worked (primary) and compliance (secondary)
    performances.sort((a, b) => {
      if (b.hoursWorked !== a.hoursWorked) {
        return b.hoursWorked - a.hoursWorked;
      }
      return b.complianceRate - a.complianceRate;
    });

    // Assign ranks
    performances.forEach((perf, index) => {
      perf.rank = index + 1;
    });

    return performances.slice(0, 10); // Top 10
  } catch (error) {
    console.error('Error getting performance rankings:', error);
    return [];
  }
}

/**
 * Get current month summary stats
 */
export async function getCurrentMonthSummary(agencyId: string) {
  try {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Simplified query - filter by agencyId and status only, then filter dates in memory
    const shiftsQuery = query(
      collection(db, 'shiftSessions'),
      where('agencyId', '==', agencyId),
      where('status', '==', 'completed'),
      limit(500)
    );

    const allShifts = await getDocs(shiftsQuery);

    // Filter by date range in memory
    const snapshot = allShifts.docs.filter(doc => {
      const shift = doc.data();
      if (!shift.startTime) return false;
      const shiftDate = shift.startTime.toDate();
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    });
    let totalHours = 0;

    snapshot.forEach(doc => {
      const shift = doc.data();
      if (shift.startTime && shift.endTime) {
        const start = shift.startTime.toDate();
        const end = shift.endTime.toDate();
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    const daysInMonth = new Date().getDate(); // Days elapsed
    const averagePerDay = totalHours / daysInMonth;
    const projectedRevenue = totalHours * 15; // $15/hour

    // Get fill rate - simplified query to avoid composite index
    const scheduledQuery = query(
      collection(db, 'scheduledShifts'),
      where('agencyId', '==', agencyId),
      limit(500)
    );

    const allScheduledShifts = await getDocs(scheduledQuery);

    // Filter by date range in memory
    const scheduledInMonth = allScheduledShifts.docs.filter(doc => {
      const shift = doc.data();
      if (!shift.date) return false;
      const shiftDate = shift.date.toDate();
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    });

    const totalScheduled = scheduledInMonth.length;
    const filled = scheduledInMonth.filter(doc => {
      const shift = doc.data();
      return shift.status !== 'cancelled' && shift.caregiverId;
    }).length;

    const fillRate = totalScheduled > 0 ? (filled / totalScheduled) * 100 : 0;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      averagePerDay: Math.round(averagePerDay * 10) / 10,
      projectedRevenue: Math.round(projectedRevenue),
      fillRate: Math.round(fillRate)
    };
  } catch (error) {
    console.error('Error getting month summary:', error);
    return {
      totalHours: 0,
      averagePerDay: 0,
      projectedRevenue: 0,
      fillRate: 0
    };
  }
}
