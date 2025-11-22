'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BillableHoursChart } from './BillableHoursChart';
import { StaffUtilizationChart } from './StaffUtilizationChart';
import { BurnoutAlertPanel } from './BurnoutAlertPanel';
import { ScheduleCoverageChart } from './ScheduleCoverageChart';
import { PerformanceLeaderboard } from './PerformanceLeaderboard';
import { MonthSummaryCards } from './MonthSummaryCards';
import { AgencyService } from '@/lib/firebase/agencies';
import {
  getBillableHoursData,
  getStaffUtilizationMetrics,
  getBurnoutRiskAlerts,
  getScheduleCoverageStats,
  getCaregiverPerformanceRankings,
  getCurrentMonthSummary,
  type BillableHoursData,
  type StaffUtilizationMetrics,
  type BurnoutAlert,
  type ScheduleCoverageStats,
  type CaregiverPerformance
} from '@/lib/firebase/agencyAnalytics';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgencyAnalyticsDashboardProps {
  agencyId: string;
}

export function AgencyAnalyticsDashboard({ agencyId }: AgencyAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [billableHours, setBillableHours] = useState<BillableHoursData[]>([]);
  const [utilization, setUtilization] = useState<StaffUtilizationMetrics[]>([]);
  const [burnoutAlerts, setBurnoutAlerts] = useState<BurnoutAlert[]>([]);
  const [coverage, setCoverage] = useState<ScheduleCoverageStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<CaregiverPerformance[]>([]);
  const [monthSummary, setMonthSummary] = useState({
    totalHours: 0,
    averagePerDay: 0,
    projectedRevenue: 0,
    fillRate: 0
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [agencyId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Get agency and caregiver data
      const agency = await AgencyService.getAgency(agencyId);
      if (!agency) {
        console.error('Agency not found');
        return;
      }

      const assignments = await AgencyService.getAgencyAssignments(agencyId);
      const caregiverIds = [...new Set(assignments.map(a => a.caregiverId))];

      // Build caregiver names map by fetching user data
      const caregiverNames = new Map<string, string>();

      // Fetch caregiver user documents to get names
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');

      for (const caregiverId of caregiverIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', caregiverId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || caregiverId;
            caregiverNames.set(caregiverId, name);
          } else {
            caregiverNames.set(caregiverId, caregiverId);
          }
        } catch (error) {
          console.error(`Error fetching user ${caregiverId}:`, error);
          caregiverNames.set(caregiverId, caregiverId);
        }
      }

      // Get all elder IDs from groups
      const elderIds: string[] = [];
      // This is simplified - actual implementation would fetch elder IDs

      // Load all analytics data in parallel
      const [
        billableData,
        utilizationData,
        burnoutData,
        coverageData,
        leaderboardData,
        summaryData
      ] = await Promise.all([
        getBillableHoursData(agencyId, 6),
        getStaffUtilizationMetrics(agencyId, caregiverIds, caregiverNames),
        getBurnoutRiskAlerts(agencyId, caregiverIds, caregiverNames),
        getScheduleCoverageStats(agencyId),
        getCaregiverPerformanceRankings(agencyId, caregiverIds, caregiverNames, 'month'),
        getCurrentMonthSummary(agencyId)
      ]);

      setBillableHours(billableData);
      setUtilization(utilizationData);
      setBurnoutAlerts(burnoutData);
      setCoverage(coverageData);
      setLeaderboard(leaderboardData);
      setMonthSummary(summaryData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Business intelligence and performance metrics
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Access Control Notice */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">SuperAdmin Analytics</CardTitle>
          <CardDescription>
            Advanced business intelligence features available exclusively for Multi-Agency SuperAdmins
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Current Month Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Current Month Summary</h3>
        <MonthSummaryCards summary={monthSummary} loading={loading} />
      </div>

      {/* Billable Hours Trend */}
      <BillableHoursChart data={billableHours} loading={loading} />

      {/* Staff Management Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaffUtilizationChart data={utilization} loading={loading} />
        <BurnoutAlertPanel alerts={burnoutAlerts} loading={loading} />
      </div>

      {/* Schedule Coverage */}
      <ScheduleCoverageChart data={coverage} loading={loading} />

      {/* Performance Leaderboard */}
      <PerformanceLeaderboard data={leaderboard} loading={loading} />

      {/* Data Refresh Info */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            <p>Analytics data is updated in real-time based on shift sessions and schedules.</p>
            <p className="mt-1">
              Last refreshed: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
