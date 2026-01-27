'use client';

/**
 * SMART INSIGHTS PAGE - Consolidated AI Features (Jan 27, 2026)
 *
 * This page consolidates all AI-powered health insights into 3 tabs:
 * 1. Health Trends - Weekly summaries, compliance charts, AI analysis
 * 2. Clinical Notes - Doctor visit preparation
 * 3. Reports - Medication adherence, nutrition analysis
 *
 * Health Chat is accessible via the chat icon in the navigation rail/header.
 *
 * WHO CAN ACCESS:
 * - Agency caregivers - for their assigned elders (max 3 per day)
 * - Family Plan A/B admins - for their loved ones
 *
 * NOTE: Agency owners are redirected to /dashboard/agency (per-elder features
 * are not practical for owners managing 30+ elders).
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailySummaryCard } from '@/components/ai/DailySummaryCard';
import { CompliancePatternChart } from '@/components/ai/CompliancePatternChart';
import { AIInsightCard } from '@/components/ai/AIInsightCard';
import { AIInsightsContainer } from '@/components/ai/AIInsightsContainer';
import { WeeklySummaryCard } from '@/components/ai/WeeklySummaryCard';
import { ExportDataDialog } from '@/components/export/ExportDataDialog';
import { WeeklyTrendsDashboard } from '@/components/trends/WeeklyTrendsDashboard';
import { QuickInsightsCard } from '@/components/insights/QuickInsightsCard';
import { calculateQuickInsightsFromLogs, type QuickInsightsData } from '@/lib/utils/complianceCalculation';
import { generateDailySummary, detectCompliancePatterns } from '@/lib/ai/geminiService';
import { calculateWeeklyTrends } from '@/lib/utils/trendsCalculation';
import { MedicationService } from '@/lib/firebase/medications';
import { DietService } from '@/lib/firebase/diet';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { ElderService } from '@/lib/firebase/elders';
import { SupplementService } from '@/lib/firebase/supplements';
import { DailySummary, Elder } from '@/types';
import {
  Sparkles,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertCircle,
  FileDown,
  FileText,
  BarChart3,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { subWeeks, startOfDay, endOfDay } from 'date-fns';
import type { TrendsData } from '@/lib/utils/trendsCalculation';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type TabType = 'trends' | 'clinical-notes' | 'reports';

function InsightsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const { isMultiAgency } = useSubscription();
  const userIsSuperAdmin = isSuperAdmin(user);

  // REDIRECT: Agency owners should use /dashboard/agency instead
  useEffect(() => {
    if (isMultiAgency && userIsSuperAdmin) {
      router.replace('/dashboard/agency');
    }
  }, [isMultiAgency, userIsSuperAdmin, router]);

  // Tab state from URL
  const activeTab = (searchParams.get('tab') as TabType) || 'trends';

  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/insights?tab=${tab}`, { scroll: false });
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'trends', label: 'Health Trends', icon: TrendingUp },
    { id: 'clinical-notes', label: 'Clinical Notes', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  // State for trends tab
  const [isLoading, setIsLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [patterns, setPatterns] = useState<{ patterns: string[]; recommendations: string[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [elders, setElders] = useState<Elder[]>([]);
  const [localSelectedElder, setLocalSelectedElder] = useState<Elder | null>(null);
  const [loadingElders, setLoadingElders] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [selectedTrendsWeeks, setSelectedTrendsWeeks] = useState<number>(12);
  const [quickInsights, setQuickInsights] = useState<QuickInsightsData | null>(null);

  // Use context elder or local selection
  const effectiveElder = selectedElder || localSelectedElder;
  const elderName = effectiveElder?.name || 'Loved One';

  // Load elders from group
  useEffect(() => {
    async function loadElders() {
      if (!user?.groups || user.groups.length === 0) {
        setLoadingElders(false);
        return;
      }

      try {
        const groupId = user.groups[0].groupId;
        const userId = user.id;
        const userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
        const eldersData = await ElderService.getEldersByGroup(groupId, userId, userRole);
        setElders(eldersData);

        // Auto-select first elder if no context elder
        if (eldersData.length > 0 && !selectedElder) {
          setLocalSelectedElder(eldersData[0]);
        }
      } catch (error) {
        console.error('Error loading elders:', error);
      } finally {
        setLoadingElders(false);
      }
    }

    loadElders();
  }, [user, selectedElder]);

  // Load trends data
  const loadTrendsData = async (numberOfWeeks: number = 12) => {
    if (!effectiveElder || !user?.groups || user.groups.length === 0) {
      return;
    }

    setLoadingTrends(true);
    try {
      const groupId = user.groups[0].groupId;
      const userId = user.id;
      const userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
      const endDate = new Date();
      const startDate = subWeeks(endDate, numberOfWeeks);

      const [allMedicationLogs, allDietEntries] = await Promise.all([
        MedicationService.getLogsByDateRange(groupId, startDate, endDate, userId, userRole),
        DietService.getEntriesByDateRange(groupId, startDate, endDate, userId, userRole)
      ]);

      // DEBUG: Log data counts
      console.log('[Insights Debug] groupId:', groupId);
      console.log('[Insights Debug] elderId:', effectiveElder.id);
      console.log('[Insights Debug] Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      console.log('[Insights Debug] All medication logs from Firestore:', allMedicationLogs.length);
      console.log('[Insights Debug] All diet entries from Firestore:', allDietEntries.length);

      const medicationLogs = allMedicationLogs.filter(log => log.elderId === effectiveElder.id);
      const dietEntries = allDietEntries.filter(entry => entry.elderId === effectiveElder.id);

      console.log('[Insights Debug] Filtered medication logs for elder:', medicationLogs.length);
      console.log('[Insights Debug] Filtered diet entries for elder:', dietEntries.length);

      if (medicationLogs.length > 0) {
        console.log('[Insights Debug] Sample log statuses:', medicationLogs.slice(0, 5).map(l => l.status));
        const taken = medicationLogs.filter(l => l.status === 'taken').length;
        const missed = medicationLogs.filter(l => l.status === 'missed').length;
        const scheduled = medicationLogs.filter(l => l.status === 'scheduled').length;
        const skipped = medicationLogs.filter(l => l.status === 'skipped').length;
        console.log('[Insights Debug] Status breakdown - taken:', taken, 'missed:', missed, 'scheduled:', scheduled, 'skipped:', skipped);
      }

      const trends = calculateWeeklyTrends(medicationLogs, dietEntries, numberOfWeeks);
      console.log('[Insights Debug] Calculated trends:', {
        overallCompliance: trends.overallCompliance,
        totalMissedDoses: trends.totalMissedDoses,
        weeksCount: trends.weeks.length
      });
      setTrendsData(trends);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoadingTrends(false);
    }
  };

  // Load trends when elder changes
  useEffect(() => {
    if (effectiveElder && activeTab === 'trends') {
      loadTrendsData(selectedTrendsWeeks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveElder, selectedTrendsWeeks, activeTab]);

  const loadInsights = async () => {
    if (!effectiveElder || !user?.groups || user.groups.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const groupId = user.groups[0].groupId;
      const userId = user.id;
      const userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
      const elderId = effectiveElder.id!;

      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const [medications, medicationLogs, supplements, supplementLogs, dietEntries] = await Promise.all([
        MedicationService.getMedicationsByElder(elderId, groupId, userId, userRole),
        MedicationService.getLogsByDateRange(groupId, dayStart, dayEnd, userId, userRole),
        SupplementService.getSupplementsByElder(elderId, groupId, userId, userRole),
        SupplementService.getLogsByDateRange(groupId, dayStart, dayEnd, userId, userRole),
        DietService.getEntriesByDateRange(groupId, dayStart, dayEnd, userId, userRole)
      ]);

      const elderMedLogs = medicationLogs.filter(log => log.elderId === elderId);
      const elderSuppLogs = supplementLogs.filter(log => log.elderId === elderId);
      const elderDietEntries = dietEntries.filter(entry => entry.elderId === elderId);

      const realData = {
        medicationLogs: elderMedLogs.map(log => {
          const med = medications.find(m => m.id === log.medicationId);
          return {
            status: log.status,
            medicationName: med?.name || 'Unknown',
            time: new Date(log.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          };
        }),
        supplementLogs: elderSuppLogs.map(log => {
          const supp = supplements.find(s => s.id === log.supplementId);
          return {
            status: log.status,
            supplementName: supp?.name || 'Unknown',
            time: new Date(log.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          };
        }),
        dietEntries: elderDietEntries.map(entry => ({
          meal: entry.meal,
          items: entry.items
        })),
        elderName
      };

      const quickInsightsData = calculateQuickInsightsFromLogs(
        elderMedLogs,
        elderSuppLogs,
        elderDietEntries,
        elderId
      );
      setQuickInsights(quickInsightsData);

      const summary = await generateDailySummary(realData, userId, userRole, groupId, elderId);
      setDailySummary(summary);

      const compliancePatterns = await detectCompliancePatterns(realData.medicationLogs, userId, userRole, groupId, elderId);
      setPatterns(compliancePatterns);

    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveElder && activeTab === 'trends') {
      loadInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, effectiveElder, activeTab]);

  if (loadingElders) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!effectiveElder && elders.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          No loved ones found in your group. Please add a loved one first to view insights.
        </p>
      </div>
    );
  }

  if (!effectiveElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Please select a loved one from the header to view insights.
        </p>
      </div>
    );
  }

  return (
    <TrialExpirationGate featureName="smart health insights">
      <EmailVerificationGate featureName="smart health insights">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-purple-600" />
                Smart Insights
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                AI-powered health insights for {elderName}
              </p>
            </div>
            {activeTab === 'trends' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(true)}
                  disabled={!effectiveElder}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={loadInsights} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-1 -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      isActive
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'trends' && (
            <HealthTrendsTab
              effectiveElder={effectiveElder}
              elderName={elderName}
              user={user}
              elders={elders}
              setLocalSelectedElder={setLocalSelectedElder}
              trendsData={trendsData}
              loadingTrends={loadingTrends}
              selectedTrendsWeeks={selectedTrendsWeeks}
              setSelectedTrendsWeeks={setSelectedTrendsWeeks}
              loadTrendsData={loadTrendsData}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              quickInsights={quickInsights}
              dailySummary={dailySummary}
              patterns={patterns}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'clinical-notes' && (
            <ClinicalNotesTab elderName={elderName} />
          )}

          {activeTab === 'reports' && (
            <ReportsTab elderName={elderName} />
          )}

          {/* Disclaimer */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Disclaimer:</strong> AI provides data analysis only, not medical advice.
                Always consult healthcare professionals for medical decisions.
              </div>
            </div>
          </Card>

          {/* Export Dialog */}
          {effectiveElder && user?.groups && user.groups.length > 0 && (
            <ExportDataDialog
              open={showExportDialog}
              onOpenChange={setShowExportDialog}
              elderId={effectiveElder.id!}
              elderName={effectiveElder.name}
              groupId={user.groups[0].groupId}
            />
          )}
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}

// Health Trends Tab Component
function HealthTrendsTab({
  effectiveElder,
  elderName,
  user,
  elders,
  setLocalSelectedElder,
  trendsData,
  loadingTrends,
  selectedTrendsWeeks,
  setSelectedTrendsWeeks,
  loadTrendsData,
  selectedDate,
  setSelectedDate,
  quickInsights,
  dailySummary,
  patterns,
  isLoading,
}: {
  effectiveElder: Elder;
  elderName: string;
  user: any;
  elders: Elder[];
  setLocalSelectedElder: (elder: Elder) => void;
  trendsData: TrendsData | null;
  loadingTrends: boolean;
  selectedTrendsWeeks: number;
  setSelectedTrendsWeeks: (weeks: number) => void;
  loadTrendsData: (weeks: number) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  quickInsights: QuickInsightsData | null;
  dailySummary: DailySummary | null;
  patterns: { patterns: string[]; recommendations: string[] } | null;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Elder Selector (if multiple elders and no context selection) */}
      {elders.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Loved One</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={effectiveElder?.id || ''}
              onValueChange={(elderId) => {
                const elder = elders.find(e => e.id === elderId);
                if (elder) setLocalSelectedElder(elder);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a loved one" />
              </SelectTrigger>
              <SelectContent>
                {elders.map((elder) => (
                  <SelectItem key={elder.id} value={elder.id!}>
                    {elder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* AI Health Insights */}
      {effectiveElder && user?.groups && user.groups.length > 0 && (
        <AIInsightsContainer
          elderId={effectiveElder.id!}
          elderName={effectiveElder.name}
          groupId={user.groups[0].groupId}
          showHealthChanges={true}
          showMedicationOptimization={true}
        />
      )}

      {/* Weekly Summaries */}
      {effectiveElder && user?.groups && user.groups.length > 0 && (
        <WeeklySummaryCard
          elderId={effectiveElder.id!}
          elderName={effectiveElder.name}
          groupId={user.groups[0].groupId}
          userId={user.id}
          userRole={user.groups[0].role as 'admin' | 'caregiver' | 'member'}
        />
      )}

      {/* Weekly Trends Dashboard */}
      {effectiveElder && trendsData && !loadingTrends && (
        <WeeklyTrendsDashboard
          trendsData={trendsData}
          elderName={effectiveElder.name}
          onWeeksChange={(weeks) => {
            setSelectedTrendsWeeks(weeks);
            loadTrendsData(weeks);
          }}
        />
      )}

      {loadingTrends && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading trends data...</span>
          </CardContent>
        </Card>
      )}

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Daily Insights For
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights Summary */}
      {quickInsights && (
        <QuickInsightsCard
          insights={quickInsights}
          showCollapsible={false}
        />
      )}

      {/* Detailed AI Insights */}
      {dailySummary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AIInsightCard
              type={dailySummary.medicationCompliance.percentage >= 90 ? 'positive' :
                    dailySummary.medicationCompliance.percentage >= 70 ? 'info' : 'warning'}
              title={dailySummary.medicationCompliance.percentage >= 90 ? 'Excellent Medication Compliance' :
                     dailySummary.medicationCompliance.percentage >= 70 ? 'Good Medication Compliance' : 'Medication Compliance Needs Attention'}
              description={`${elderName} has ${dailySummary.medicationCompliance.percentage}% medication compliance today. ${dailySummary.medicationCompliance.taken} taken, ${dailySummary.medicationCompliance.missed} missed.`}
            />

            <AIInsightCard
              type={dailySummary.dietSummary.mealsLogged >= 3 ? 'positive' :
                    dailySummary.dietSummary.mealsLogged >= 1 ? 'info' : 'warning'}
              title={dailySummary.dietSummary.mealsLogged >= 3 ? 'Meals Well Tracked' :
                     dailySummary.dietSummary.mealsLogged >= 1 ? 'Some Meals Logged' : 'No Meals Logged Yet'}
              description={dailySummary.dietSummary.mealsLogged > 0
                ? `${dailySummary.dietSummary.mealsLogged} meal(s) logged today.`
                : 'No meals have been logged today. Consider adding meal entries.'}
            />

            {dailySummary.supplementCompliance && (dailySummary.supplementCompliance.taken > 0 || dailySummary.supplementCompliance.missed > 0) && (
              <AIInsightCard
                type={dailySummary.supplementCompliance.percentage >= 90 ? 'positive' :
                      dailySummary.supplementCompliance.percentage >= 70 ? 'info' : 'warning'}
                title={dailySummary.supplementCompliance.percentage >= 90 ? 'Supplements On Track' :
                       dailySummary.supplementCompliance.percentage >= 70 ? 'Supplement Compliance Good' : 'Supplements Need Attention'}
                description={`${dailySummary.supplementCompliance.percentage}% supplement compliance. ${dailySummary.supplementCompliance.taken} taken, ${dailySummary.supplementCompliance.missed} missed.`}
              />
            )}

            {dailySummary.missedDoses && dailySummary.missedDoses.length > 0 && (
              <AIInsightCard
                type="warning"
                title={`${dailySummary.missedDoses.length} Missed Dose${dailySummary.missedDoses.length > 1 ? 's' : ''}`}
                description={dailySummary.missedDoses.slice(0, 2).map(d => `${d.medicationName} at ${d.scheduledTime}`).join(', ')}
              />
            )}
          </div>

          <DailySummaryCard
            summary={dailySummary}
            elderName={elderName}
            date={selectedDate}
          />

          {patterns && (
            <CompliancePatternChart
              patterns={patterns.patterns}
              recommendations={patterns.recommendations}
            />
          )}
        </>
      )}

      {isLoading && !dailySummary && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Analyzing health data...</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Clinical Notes Tab Component
function ClinicalNotesTab({ elderName }: { elderName: string }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Generate Clinical Notes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create a comprehensive summary report for {elderName}&apos;s next doctor visit.
              Includes medications overview, adherence data, diet entries, and discussion points.
            </p>
            <Link href="/dashboard/clinical-notes">
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Generate Notes
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">What&apos;s Included:</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Patient information and current medications</li>
          <li>• 14-day adherence summary with compliance rates</li>
          <li>• Recent diet and nutrition entries</li>
          <li>• Discussion points and questions for the provider</li>
          <li>• Print-friendly PDF format</li>
        </ul>
      </Card>
    </div>
  );
}

// Reports Tab Component
function ReportsTab({ elderName }: { elderName: string }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <ReportCard
          title="Medication Adherence Report"
          description="Detailed adherence analysis with predictions and patterns"
          icon={FileText}
          linkHref="/dashboard/medication-adherence"
          color="blue"
        />
        <ReportCard
          title="Nutrition Analysis Report"
          description="Eating patterns, meal tracking, and nutritional insights"
          icon={FileText}
          linkHref="/dashboard/nutrition-analysis"
          color="green"
        />
      </div>
    </div>
  );
}

// Report Card Component
function ReportCard({
  title,
  description,
  icon: Icon,
  linkHref,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  linkHref: string;
  color: 'blue' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
          <Link href={linkHref}>
            <Button variant="outline" size="sm">
              View Report
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <InsightsContent />
    </Suspense>
  );
}
