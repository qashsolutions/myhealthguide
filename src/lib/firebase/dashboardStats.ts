/**
 * Dashboard Statistics Service
 *
 * Aggregates medication, supplement, and diet data for dashboard display.
 * Optimized for batch fetching by group to minimize Firestore queries.
 *
 * HIPAA Compliant: All PHI access is logged via the PHI audit service.
 *
 * Account Structure:
 * - Family: 1 admin + 1 member (read-only), 1 elder
 * - Single Agency: 1 admin + 3 members (read-only), 1 elder
 * - Multi Agency: 1 super admin + 10 caregivers, 30 elders (3 per caregiver)
 */

import { subDays, startOfDay, endOfDay, isToday } from 'date-fns';
import { MedicationService } from './medications';
import { SupplementService } from './supplements';
import { DietService } from './diet';
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';
import type {
  Elder,
  MedicationLog,
  SupplementLog,
  DietEntry
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Compliance statistics for a category (medications or supplements)
 */
export interface ComplianceStats {
  taken: number;
  missed: number;
  skipped: number;
  total: number;
  compliancePercentage: number; // (taken / (taken + missed)) * 100, skipped excluded
}

/**
 * Diet statistics
 */
export interface DietStats {
  mealsLoggedToday: number;
  expectedMealsToday: number; // 3 main meals (breakfast, lunch, dinner)
  totalMealsLast7Days: number;
}

/**
 * Per-elder statistics for dashboard cards
 */
export interface ElderDashboardStats {
  elderId: string;
  elderName: string;
  groupId: string;

  // Medication stats
  activeMedicationsCount: number;
  medicationCompliance: ComplianceStats;

  // Supplement stats
  activeSupplementsCount: number;
  supplementCompliance: ComplianceStats;

  // Diet stats
  dietStats: DietStats;

  // Combined recent activity
  recentLogsCount: number; // Total logs in last 7 days across all categories
}

/**
 * Aggregate statistics across all elders (for dashboard header)
 */
export interface AggregateDashboardStats {
  totalElders: number;
  totalActiveMedications: number;
  totalActiveSupplements: number;
  averageMedicationCompliance: number; // Weighted average across all elders
  averageSupplementCompliance: number;
  totalMealsLoggedToday: number;
}

/**
 * Complete dashboard data for a user
 */
export interface DashboardData {
  aggregate: AggregateDashboardStats;
  elderStats: ElderDashboardStats[];
  // For multi-agency super admin: group by caregiver
  byCaregiver?: {
    caregiverId: string;
    caregiverName: string;
    elders: ElderDashboardStats[];
  }[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate compliance stats from logs
 * Skipped doses are excluded from compliance percentage but shown separately
 */
function calculateComplianceFromLogs(
  logs: (MedicationLog | SupplementLog)[]
): ComplianceStats {
  const taken = logs.filter(l => l.status === 'taken').length;
  const missed = logs.filter(l => l.status === 'missed').length;
  const skipped = logs.filter(l => l.status === 'skipped').length;
  const total = logs.length;

  // Compliance = taken / (taken + missed), skipped excluded
  const denominator = taken + missed;
  const compliancePercentage = denominator > 0
    ? Math.round((taken / denominator) * 100)
    : 0;

  return {
    taken,
    missed,
    skipped,
    total,
    compliancePercentage
  };
}

/**
 * Filter logs by elder ID
 */
function filterLogsByElder<T extends { elderId: string }>(
  logs: T[],
  elderId: string
): T[] {
  return logs.filter(l => l.elderId === elderId);
}

/**
 * Filter active medications/supplements (no end date or end date in future)
 */
function filterActive<T extends { endDate?: Date }>(items: T[]): T[] {
  const now = new Date();
  return items.filter(item => !item.endDate || item.endDate > now);
}

/**
 * Filter items by elder ID
 */
function filterByElder<T extends { elderId: string }>(
  items: T[],
  elderId: string
): T[] {
  return items.filter(item => item.elderId === elderId);
}

/**
 * Count meals logged today for an elder
 */
function countMealsToday(dietEntries: DietEntry[], elderId: string): number {
  return dietEntries.filter(
    entry => entry.elderId === elderId && isToday(entry.timestamp)
  ).length;
}

/**
 * Determine user role for PHI logging based on agency membership
 */
function getUserRole(agencyRole?: string): UserRole {
  if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') {
    return 'admin';
  }
  if (agencyRole === 'caregiver') {
    return 'caregiver';
  }
  return 'member';
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class DashboardStatsService {
  /**
   * Fetch dashboard statistics for all accessible elders
   *
   * Optimized to fetch data by group rather than per-elder to minimize queries.
   * For a user with access to 1 group, this makes ~6 queries total:
   * - 1 for medications
   * - 1 for medication logs
   * - 1 for supplements
   * - 1 for supplement logs
   * - 1 for diet entries
   * - 1 PHI audit log
   *
   * @param elders - Array of elders the user has access to
   * @param userId - Current user ID for PHI logging
   * @param agencyRole - User's agency role (for determining PHI log role)
   * @returns Dashboard data with aggregate and per-elder stats
   */
  static async getDashboardStats(
    elders: Elder[],
    userId: string,
    agencyRole?: string
  ): Promise<DashboardData> {
    if (elders.length === 0) {
      return {
        aggregate: {
          totalElders: 0,
          totalActiveMedications: 0,
          totalActiveSupplements: 0,
          averageMedicationCompliance: 0,
          averageSupplementCompliance: 0,
          totalMealsLoggedToday: 0
        },
        elderStats: []
      };
    }

    const userRole = getUserRole(agencyRole);

    // Get unique group IDs to minimize queries
    const groupIds = [...new Set(elders.map(e => e.groupId))];

    // Date range for logs (last 7 days)
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), 6)); // 7 days including today

    // Fetch all data by group in parallel
    const dataByGroup = await Promise.all(
      groupIds.map(async (groupId) => {
        const [medications, medicationLogs, supplements, supplementLogs, dietEntries] =
          await Promise.all([
            MedicationService.getMedicationsByGroup(groupId, userId, userRole),
            MedicationService.getLogsByDateRange(groupId, startDate, endDate, userId, userRole),
            SupplementService.getSupplementsByGroup(groupId, userId, userRole),
            SupplementService.getLogsByDateRange(groupId, startDate, endDate, userId, userRole),
            DietService.getEntriesByDateRange(groupId, startDate, endDate, userId, userRole)
          ]);

        return {
          groupId,
          medications,
          medicationLogs,
          supplements,
          supplementLogs,
          dietEntries
        };
      })
    );

    // Flatten data for easier access
    const allMedications = dataByGroup.flatMap(d => d.medications);
    const allMedicationLogs = dataByGroup.flatMap(d => d.medicationLogs);
    const allSupplements = dataByGroup.flatMap(d => d.supplements);
    const allSupplementLogs = dataByGroup.flatMap(d => d.supplementLogs);
    const allDietEntries = dataByGroup.flatMap(d => d.dietEntries);

    // Calculate per-elder stats
    const elderStats: ElderDashboardStats[] = elders.map(elder => {
      // Filter data for this elder
      const elderMedications = filterByElder(allMedications, elder.id);
      const elderMedicationLogs = filterLogsByElder(allMedicationLogs, elder.id);
      const elderSupplements = filterByElder(allSupplements, elder.id);
      const elderSupplementLogs = filterLogsByElder(allSupplementLogs, elder.id);
      const elderDietEntries = filterByElder(allDietEntries, elder.id);

      // Active counts
      const activeMedications = filterActive(elderMedications);
      const activeSupplements = filterActive(elderSupplements);

      // Compliance calculations
      const medicationCompliance = calculateComplianceFromLogs(elderMedicationLogs);
      const supplementCompliance = calculateComplianceFromLogs(elderSupplementLogs);

      // Diet stats
      const mealsLoggedToday = countMealsToday(allDietEntries, elder.id);

      // Recent logs count (all categories)
      const recentLogsCount =
        elderMedicationLogs.length +
        elderSupplementLogs.length +
        elderDietEntries.length;

      return {
        elderId: elder.id,
        elderName: elder.name,
        groupId: elder.groupId,
        activeMedicationsCount: activeMedications.length,
        medicationCompliance,
        activeSupplementsCount: activeSupplements.length,
        supplementCompliance,
        dietStats: {
          mealsLoggedToday,
          expectedMealsToday: 3, // breakfast, lunch, dinner
          totalMealsLast7Days: elderDietEntries.length
        },
        recentLogsCount
      };
    });

    // Calculate aggregate stats
    const totalActiveMedications = elderStats.reduce(
      (sum, e) => sum + e.activeMedicationsCount, 0
    );
    const totalActiveSupplements = elderStats.reduce(
      (sum, e) => sum + e.activeSupplementsCount, 0
    );
    const totalMealsLoggedToday = elderStats.reduce(
      (sum, e) => sum + e.dietStats.mealsLoggedToday, 0
    );

    // Weighted average compliance (by number of logs, not just number of elders)
    const totalMedLogs = elderStats.reduce(
      (sum, e) => sum + e.medicationCompliance.total, 0
    );
    const totalSuppLogs = elderStats.reduce(
      (sum, e) => sum + e.supplementCompliance.total, 0
    );

    const weightedMedCompliance = totalMedLogs > 0
      ? Math.round(
          elderStats.reduce(
            (sum, e) => sum + (e.medicationCompliance.compliancePercentage * e.medicationCompliance.total),
            0
          ) / totalMedLogs
        )
      : 0;

    const weightedSuppCompliance = totalSuppLogs > 0
      ? Math.round(
          elderStats.reduce(
            (sum, e) => sum + (e.supplementCompliance.compliancePercentage * e.supplementCompliance.total),
            0
          ) / totalSuppLogs
        )
      : 0;

    // Log dashboard access for PHI audit
    await logPHIAccess({
      userId,
      userRole,
      groupId: groupIds[0], // Primary group for logging
      phiType: 'health_summary',
      action: 'read',
      actionDetails: `Dashboard stats retrieved for ${elders.length} elder(s) across ${groupIds.length} group(s)`,
      purpose: 'treatment',
      method: 'web_app'
    });

    return {
      aggregate: {
        totalElders: elders.length,
        totalActiveMedications,
        totalActiveSupplements,
        averageMedicationCompliance: weightedMedCompliance,
        averageSupplementCompliance: weightedSuppCompliance,
        totalMealsLoggedToday
      },
      elderStats
    };
  }

  /**
   * Get dashboard stats grouped by caregiver
   * Used for Multi-Agency Super Admin view
   *
   * @param elders - All elders in the agency
   * @param caregiverAssignments - Mapping of caregiver to their assigned elders
   * @param userId - Current user ID
   * @param agencyRole - User's role in the agency
   */
  static async getDashboardStatsByCaregiver(
    elders: Elder[],
    caregiverAssignments: {
      caregiverId: string;
      caregiverName: string;
      elderIds: string[]
    }[],
    userId: string,
    agencyRole?: string
  ): Promise<DashboardData> {
    // Get base stats for all elders
    const baseData = await this.getDashboardStats(elders, userId, agencyRole);

    // Group elder stats by caregiver
    const byCaregiver = caregiverAssignments.map(assignment => {
      const caregiverElderStats = baseData.elderStats.filter(
        es => assignment.elderIds.includes(es.elderId)
      );

      return {
        caregiverId: assignment.caregiverId,
        caregiverName: assignment.caregiverName,
        elders: caregiverElderStats
      };
    });

    return {
      ...baseData,
      byCaregiver
    };
  }
}
