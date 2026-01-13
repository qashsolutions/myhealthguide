'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Pill,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
  Activity,
  Heart,
  Loader2,
  Leaf,
  Utensils
} from 'lucide-react';
import { Elder } from '@/types';
import Link from 'next/link';
import { CaregiverEldersCardGrid } from '@/components/agency/CaregiverEldersCardGrid';
import { isSuperAdmin } from '@/lib/utils/getUserRole';

// Check if user can add elders based on their role
function canUserAddElders(user: any): boolean {
  if (!user) return false;

  // Check group membership first (Family Plans)
  // Only 'admin' role in groups can add elders, 'member' role is read-only
  if (user.groups && user.groups.length > 0) {
    return user.groups.some((group: any) => group.role === 'admin');
  }

  // Check agency membership (Agency Plans)
  // Only super_admin can add elders, caregivers manage assigned elders only
  if (user.agencies && user.agencies.length > 0) {
    return user.agencies.some((agency: any) =>
      agency.role === 'super_admin' && agency.status === 'active'
    );
  }

  // No membership - new user without subscription, allow to add first elder
  return true;
}
import { format } from 'date-fns';
import {
  DashboardStatsService,
  DashboardData,
  ElderDashboardStats
} from '@/lib/firebase/dashboardStats';
import { TimeToggle, TimePeriod } from '@/components/dashboard/TimeToggle';
import { WeeklySummaryPanel } from '@/components/dashboard/WeeklySummaryPanel';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableElders, setSelectedElder, selectedElder, isLoading: eldersLoading } = useElder();

  // Feature tracking
  useFeatureTracking('overview');

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');

  // Check if user is multi-agency super admin using the helper function
  const isMultiAgencySuperAdmin = isSuperAdmin(user);
  const agencyId = user?.agencies?.find(
    (a: any) => a.role === 'super_admin'
  )?.agencyId;

  // Fetch dashboard stats when elders are available
  const fetchDashboardStats = useCallback(async () => {
    if (!user || availableElders.length === 0) {
      setDashboardData(null);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const agencyRole = user.agencies?.[0]?.role;
      const data = await DashboardStatsService.getDashboardStats(
        availableElders,
        user.id,
        agencyRole
      );
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStatsError('Unable to load dashboard statistics. Please try again.');
    } finally {
      setStatsLoading(false);
    }
  }, [user, availableElders]);

  useEffect(() => {
    if (!eldersLoading) {
      fetchDashboardStats();
    }
  }, [eldersLoading, fetchDashboardStats]);

  // Get stats for a specific elder
  const getElderStats = (elderId: string): ElderDashboardStats | null => {
    return dashboardData?.elderStats.find(s => s.elderId === elderId) || null;
  };

  const handleElderClick = (elder: Elder) => {
    setSelectedElder(elder);
    router.push('/dashboard/medications');
  };

  // Format compliance display
  const formatCompliance = (stats: ElderDashboardStats | null): string => {
    if (!stats) return '--';
    const { medicationCompliance, supplementCompliance } = stats;

    // If no logs at all, show --
    if (medicationCompliance.total === 0 && supplementCompliance.total === 0) {
      return '--';
    }

    // Calculate combined compliance (weighted by total logs)
    const totalLogs = medicationCompliance.total + supplementCompliance.total;
    const weightedCompliance = Math.round(
      (medicationCompliance.compliancePercentage * medicationCompliance.total +
        supplementCompliance.compliancePercentage * supplementCompliance.total) /
        totalLogs
    );

    return `${weightedCompliance}%`;
  };

  // Format skipped count display
  const formatSkipped = (stats: ElderDashboardStats | null): string | null => {
    if (!stats) return null;
    const totalSkipped =
      stats.medicationCompliance.skipped + stats.supplementCompliance.skipped;
    return totalSkipped > 0 ? `${totalSkipped} skipped` : null;
  };

  // Loading state
  if (eldersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Aggregate stats from dashboard data or show zeros
  const aggregate = dashboardData?.aggregate || {
    totalElders: availableElders.length,
    totalActiveMedications: 0,
    totalActiveSupplements: 0,
    averageMedicationCompliance: 0,
    averageSupplementCompliance: 0,
    totalMealsLoggedToday: 0
  };

  // Calculate combined average compliance for header (weighted by total logs)
  // Use elder stats to get actual log counts for proper weighting
  const totalMedLogs = dashboardData?.elderStats.reduce(
    (sum, e) => sum + e.medicationCompliance.total, 0
  ) || 0;
  const totalSuppLogs = dashboardData?.elderStats.reduce(
    (sum, e) => sum + e.supplementCompliance.total, 0
  ) || 0;
  const totalLogs = totalMedLogs + totalSuppLogs;

  const combinedAvgCompliance = totalLogs > 0
    ? Math.round(
        (aggregate.averageMedicationCompliance * totalMedLogs +
         aggregate.averageSupplementCompliance * totalSuppLogs) / totalLogs
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {timePeriod === 'today'
              ? (user?.firstName ? `Welcome back, ${user.firstName}!` : 'Welcome to your caregiving dashboard')
              : `${timePeriod === 'week' ? 'Weekly' : 'Monthly'} summary${selectedElder ? ` for ${selectedElder.name}` : ''}`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeToggle value={timePeriod} onChange={setTimePeriod} />
          {canUserAddElders(user) && (
            <Link href="/dashboard/elders/new" className="hidden sm:block">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Loved One
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {statsError && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <p className="text-red-700 dark:text-red-300">{statsError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDashboardStats}
              className="text-red-700 hover:text-red-800 dark:text-red-300"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Weekly/Monthly Summary Panel */}
      {timePeriod !== 'today' && (
        <WeeklySummaryPanel
          period={timePeriod}
          stats={{
            medicationsTaken: dashboardData?.elderStats.reduce((sum, e) => sum + e.medicationCompliance.taken, 0) || 0,
            medicationsTotal: dashboardData?.elderStats.reduce((sum, e) => sum + e.medicationCompliance.total, 0) || 0,
            supplementsTaken: dashboardData?.elderStats.reduce((sum, e) => sum + e.supplementCompliance.taken, 0) || 0,
            supplementsTotal: dashboardData?.elderStats.reduce((sum, e) => sum + e.supplementCompliance.total, 0) || 0,
            mealsLogged: aggregate.totalMealsLoggedToday * (timePeriod === 'week' ? 7 : 30),
            mealsExpected: availableElders.length * 3 * (timePeriod === 'week' ? 7 : 30),
            compliancePercentage: combinedAvgCompliance,
            missedDoses: dashboardData?.elderStats.reduce((sum, e) => sum + e.medicationCompliance.missed, 0) || 0,
            activityLogs: dashboardData?.elderStats.reduce((sum, e) => sum + e.recentLogsCount, 0) || 0,
            safetyAlerts: 0,
            careScore: combinedAvgCompliance >= 90 ? 'A+' : combinedAvgCompliance >= 80 ? 'A' : combinedAvgCompliance >= 70 ? 'B' : combinedAvgCompliance >= 60 ? 'C' : 'D',
          }}
        />
      )}

      {/* Overall Stats - 5 cards now (show only for Today view) */}
      {timePeriod === 'today' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Elders */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Loved Ones
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {availableElders.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Active Medications */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Medications
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  aggregate.totalActiveMedications
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Pill className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Active Supplements */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Supplements
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  aggregate.totalActiveSupplements
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        {/* Avg Compliance */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Compliance
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : combinedAvgCompliance > 0 ? (
                  `${combinedAvgCompliance}%`
                ) : (
                  '--'
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Meals Today */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Meals Today
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  aggregate.totalMealsLoggedToday
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Utensils className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>
      )}

      {/* Elders Grid */}
      {availableElders.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Loved Ones
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click on a loved one to view their care details
            </p>
          </div>

          {/* Multi-agency grouped view using shared component */}
          {isMultiAgencySuperAdmin && agencyId ? (
            <CaregiverEldersCardGrid
              agencyId={agencyId}
              maxEldersPerCaregiver={3}
              onAssignElder={() => router.push('/dashboard/agency?tab=assignments')}
              renderElderCard={(elder, caregiverName) => {
                const elderStats = getElderStats(elder.id);
                const skippedText = formatSkipped(elderStats);

                return (
                  <Card
                    className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 ${
                      selectedElder?.id === elder.id
                        ? 'border-2 border-blue-600 dark:border-blue-400 shadow-lg'
                        : ''
                    }`}
                    onClick={() => handleElderClick(elder)}
                  >
                    {/* Elder Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {elder.name}
                        </h3>
                        {elder.approximateAge && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ~{elder.approximateAge} years old
                          </p>
                        )}
                      </div>
                      {selectedElder?.id === elder.id && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>

                    {/* Elder Stats */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Pill className="w-3 h-3 mr-1.5 text-green-600" />
                          Meds
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : elderStats?.activeMedicationsCount ?? 0}
                          </span>
                          {elderStats && elderStats.medicationCompliance.total > 0 && (
                            <span className="text-xs text-gray-500">({elderStats.medicationCompliance.compliancePercentage}%)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Leaf className="w-3 h-3 mr-1.5 text-amber-600" />
                          Supps
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {statsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : elderStats?.activeSupplementsCount ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Heart className="w-3 h-3 mr-1.5 text-red-500" />
                          Compliance
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {statsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : formatCompliance(elderStats)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button variant="ghost" size="sm" className="w-full justify-between group text-xs" onClick={(e) => { e.stopPropagation(); setSelectedElder(elder); router.push('/dashboard/medications'); }}>
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </Card>
                );
              }}
            />
          ) : (
            /* Standard grid view (non multi-agency users) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableElders.map((elder) => {
                const elderStats = getElderStats(elder.id);
                const skippedText = formatSkipped(elderStats);

                return (
                  <Card
                    key={elder.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 ${
                      selectedElder?.id === elder.id
                        ? 'border-2 border-blue-600 dark:border-blue-400 shadow-lg'
                        : ''
                    }`}
                    onClick={() => handleElderClick(elder)}
                  >
                    {/* Elder Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {elder.name}
                        </h3>
                        {elder.approximateAge && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            ~{elder.approximateAge} years old
                          </p>
                        )}
                      </div>
                      {selectedElder?.id === elder.id && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>

                    {/* Elder Stats - Three Categories */}
                    <div className="space-y-3">
                      {/* Medications */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Pill className="w-4 h-4 mr-2 text-green-600" />
                          Medications
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              elderStats?.activeMedicationsCount ?? 0
                            )}
                          </span>
                          {elderStats && elderStats.medicationCompliance.total > 0 && (
                            <span className="text-xs text-gray-500">
                              ({elderStats.medicationCompliance.compliancePercentage}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Supplements */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Leaf className="w-4 h-4 mr-2 text-amber-600" />
                          Supplements
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              elderStats?.activeSupplementsCount ?? 0
                            )}
                          </span>
                          {elderStats && elderStats.supplementCompliance.total > 0 && (
                            <span className="text-xs text-gray-500">
                              ({elderStats.supplementCompliance.compliancePercentage}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Diet */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Utensils className="w-4 h-4 mr-2 text-orange-600" />
                          Meals Today
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {statsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `${elderStats?.dietStats.mealsLoggedToday ?? 0}/${elderStats?.dietStats.expectedMealsToday ?? 3}`
                          )}
                        </span>
                      </div>

                      {/* Combined Compliance */}
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Heart className="w-4 h-4 mr-2 text-red-500" />
                          Overall Compliance
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              formatCompliance(elderStats)
                            )}
                          </span>
                          {skippedText && !statsLoading && (
                            <span className="text-xs text-gray-400">{skippedText}</span>
                          )}
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <Activity className="w-4 h-4 mr-2 text-blue-600" />
                          7-Day Logs
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {statsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            elderStats?.recentLogsCount ?? 0
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElder(elder);
                          router.push('/dashboard/medications');
                        }}
                      >
                        <span>View Care Details</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* No Elders - Getting Started */
        <Card className="p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to MyHealthGuide!
            </h3>
            {canUserAddElders(user) ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by adding your first loved one. You&apos;ll be able to track medications,
                  diet, and activities - and we&apos;ll help you spot anything that needs attention.
                </p>
                <Link href="/dashboard/elders/new">
                  <Button size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Loved One
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No loved ones have been assigned to you yet. Once your agency admin assigns you to a loved one,
                you&apos;ll be able to track their medications, diet, and activities here.
              </p>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              What You Can Do
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Medication Management
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track medications, set reminders, and log doses with voice input
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Diet & Activity Tracking
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Log meals and activities to monitor health patterns
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Daily Health Summaries
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    See how your loved one is doing at a glance
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Family Collaboration
                  </h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Invite family members to coordinate care together
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
