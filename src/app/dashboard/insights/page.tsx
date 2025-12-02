'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailySummaryCard } from '@/components/ai/DailySummaryCard';
import { CompliancePatternChart } from '@/components/ai/CompliancePatternChart';
import { AIInsightCard } from '@/components/ai/AIInsightCard';
import { AIInsightsContainer } from '@/components/ai/AIInsightsContainer';
import { AIChat } from '@/components/ai/AIChat';
import { ExportDataDialog } from '@/components/export/ExportDataDialog';
import { WeeklyTrendsDashboard } from '@/components/trends/WeeklyTrendsDashboard';
import { generateDailySummary, detectCompliancePatterns } from '@/lib/ai/geminiService';
import { calculateWeeklyTrends } from '@/lib/utils/trendsCalculation';
import { MedicationService } from '@/lib/firebase/medications';
import { DietService } from '@/lib/firebase/diet';
import { useAuth } from '@/contexts/AuthContext';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { ElderService } from '@/lib/firebase/elders';
import { GroupService } from '@/lib/firebase/groups';
import { SupplementService } from '@/lib/firebase/supplements';
import { DailySummary, Elder } from '@/types';
import { Sparkles, RefreshCw, Calendar, TrendingUp, AlertCircle, FileDown } from 'lucide-react';
import { subWeeks, startOfDay, endOfDay } from 'date-fns';
import type { TrendsData } from '@/lib/utils/trendsCalculation';
import type { ChatContext } from '@/lib/ai/chatService';

export default function InsightsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [patterns, setPatterns] = useState<{ patterns: string[]; recommendations: string[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [loadingElders, setLoadingElders] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [selectedTrendsWeeks, setSelectedTrendsWeeks] = useState<number>(12);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);

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

        // Auto-select first elder if available
        if (eldersData.length > 0) {
          setSelectedElder(eldersData[0]);
        }
      } catch (error) {
        console.error('Error loading elders:', error);
      } finally {
        setLoadingElders(false);
      }
    }

    loadElders();
  }, [user]);

  const elderName = selectedElder?.name || 'John Smith';

  // Load trends data
  const loadTrendsData = async (numberOfWeeks: number = 12) => {
    if (!selectedElder || !user?.groups || user.groups.length === 0) {
      return;
    }

    setLoadingTrends(true);
    try {
      const groupId = user.groups[0].groupId;
      const userId = user.id;
      const userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
      const endDate = new Date();
      const startDate = subWeeks(endDate, numberOfWeeks);

      // Fetch historical data
      const [allMedicationLogs, allDietEntries] = await Promise.all([
        MedicationService.getLogsByDateRange(groupId, startDate, endDate, userId, userRole),
        DietService.getEntriesByDateRange(groupId, startDate, endDate, userId, userRole)
      ]);

      // Filter for selected elder
      const medicationLogs = allMedicationLogs.filter(log => log.elderId === selectedElder.id);
      const dietEntries = allDietEntries.filter(entry => entry.elderId === selectedElder.id);

      // Calculate trends
      const trends = calculateWeeklyTrends(medicationLogs, dietEntries, numberOfWeeks);
      setTrendsData(trends);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoadingTrends(false);
    }
  };

  // Load trends when elder changes
  useEffect(() => {
    if (selectedElder) {
      loadTrendsData(selectedTrendsWeeks);
      loadChatContext();
    }
  }, [selectedElder, selectedTrendsWeeks]);

  // Load chat context
  const loadChatContext = async () => {
    if (!user || !selectedElder || !user.groups || user.groups.length === 0) {
      return;
    }

    try {
      const groupId = user.groups[0].groupId;
      const userId = user.id;
      const userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';

      // Fetch data for chat context
      const [medications, groupMembers] = await Promise.all([
        MedicationService.getMedicationsByElder(selectedElder.id!, selectedElder.groupId, userId, userRole),
        GroupService.getGroupMembersWithDetails(groupId)
      ]);

      const context: ChatContext = {
        userId: user.id,
        groupId: groupId,
        elders: [selectedElder],
        medications: medications || [],
        upcomingSchedules: [], // TODO: Fetch actual upcoming schedules
        groupMembers: groupMembers || []
      };

      setChatContext(context);
    } catch (error) {
      console.error('Error loading chat context:', error);
    }
  };

  const loadInsights = async () => {
    if (!selectedElder || !user?.groups || user.groups.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const groupId = user.groups[0].groupId;
      const userId = user.id;
      const userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
      const elderId = selectedElder.id!;

      // Fetch real data from Firestore for the selected date
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const [medications, medicationLogs, supplements, supplementLogs, dietEntries] = await Promise.all([
        MedicationService.getMedicationsByElder(elderId, groupId, userId, userRole),
        MedicationService.getLogsByDateRange(groupId, dayStart, dayEnd, userId, userRole),
        SupplementService.getSupplementsByElder(elderId, groupId, userId, userRole),
        SupplementService.getLogsByDateRange(groupId, dayStart, dayEnd, userId, userRole),
        DietService.getEntriesByDateRange(groupId, dayStart, dayEnd, userId, userRole)
      ]);

      // Filter logs for selected elder
      const elderMedLogs = medicationLogs.filter(log => log.elderId === elderId);
      const elderSuppLogs = supplementLogs.filter(log => log.elderId === elderId);
      const elderDietEntries = dietEntries.filter(entry => entry.elderId === elderId);

      // Build data object for AI analysis
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

      // Generate AI summary from real data
      const summary = await generateDailySummary(realData, userId, userRole, groupId, elderId);
      setDailySummary(summary);

      // Detect compliance patterns from real data
      const compliancePatterns = await detectCompliancePatterns(realData.medicationLogs, userId, userRole, groupId, elderId);
      setPatterns(compliancePatterns);

    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedElder) {
      loadInsights();
    }
  }, [selectedDate, selectedElder]);

  if (loadingElders) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <TrialExpirationGate featureName="AI health insights">
      <EmailVerificationGate featureName="AI health insights">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              AI Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI-powered analysis and recommendations
            </p>
          </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={!selectedElder}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={loadInsights} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Elder Selector */}
      {elders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Elder</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedElder?.id || ''}
              onValueChange={(elderId) => {
                const elder = elders.find(e => e.id === elderId);
                if (elder) setSelectedElder(elder);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an elder" />
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

      {/* No elders warning */}
      {elders.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No elders found in your group. Please add an elder first to view AI insights.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Chat Assistant */}
      {selectedElder && chatContext && (
        <AIChat context={chatContext} />
      )}

      {/* AI Health Insights - New Features */}
      {selectedElder && user?.groups && user.groups.length > 0 && (
        <AIInsightsContainer
          elderId={selectedElder.id!}
          elderName={selectedElder.name}
          groupId={user.groups[0].groupId}
          showHealthChanges={true}
          showMedicationOptimization={true}
        />
      )}

      {/* Weekly Trends Dashboard */}
      {selectedElder && trendsData && !loadingTrends && (
        <WeeklyTrendsDashboard
          trendsData={trendsData}
          elderName={selectedElder.name}
          onWeeksChange={(weeks) => {
            setSelectedTrendsWeeks(weeks);
            loadTrendsData(weeks);
          }}
        />
      )}

      {loadingTrends && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading trends data...</span>
          </CardContent>
        </Card>
      )}

      {/* Date Selector */}
      {selectedElder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Viewing Insights For
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
      )}

      {/* Quick Insights - Generated from real data */}
      {selectedElder && dailySummary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medication Compliance Insight */}
            <AIInsightCard
              type={dailySummary.medicationCompliance.percentage >= 90 ? 'positive' :
                    dailySummary.medicationCompliance.percentage >= 70 ? 'info' : 'warning'}
              title={dailySummary.medicationCompliance.percentage >= 90 ? 'Excellent Medication Compliance' :
                     dailySummary.medicationCompliance.percentage >= 70 ? 'Good Medication Compliance' : 'Medication Compliance Needs Attention'}
              description={`${elderName} has ${dailySummary.medicationCompliance.percentage}% medication compliance today. ${dailySummary.medicationCompliance.taken} taken, ${dailySummary.medicationCompliance.missed} missed.`}
            />

            {/* Diet Insight */}
            <AIInsightCard
              type={dailySummary.dietSummary.mealsLogged >= 3 ? 'positive' :
                    dailySummary.dietSummary.mealsLogged >= 1 ? 'info' : 'warning'}
              title={dailySummary.dietSummary.mealsLogged >= 3 ? 'Meals Well Tracked' :
                     dailySummary.dietSummary.mealsLogged >= 1 ? 'Some Meals Logged' : 'No Meals Logged Yet'}
              description={dailySummary.dietSummary.mealsLogged > 0
                ? `${dailySummary.dietSummary.mealsLogged} meal(s) logged today.`
                : 'No meals have been logged today. Consider adding meal entries.'}
            />

            {/* Supplement Compliance Insight */}
            {dailySummary.supplementCompliance && (dailySummary.supplementCompliance.taken > 0 || dailySummary.supplementCompliance.missed > 0) && (
              <AIInsightCard
                type={dailySummary.supplementCompliance.percentage >= 90 ? 'positive' :
                      dailySummary.supplementCompliance.percentage >= 70 ? 'info' : 'warning'}
                title={dailySummary.supplementCompliance.percentage >= 90 ? 'Supplements On Track' :
                       dailySummary.supplementCompliance.percentage >= 70 ? 'Supplement Compliance Good' : 'Supplements Need Attention'}
                description={`${dailySummary.supplementCompliance.percentage}% supplement compliance. ${dailySummary.supplementCompliance.taken} taken, ${dailySummary.supplementCompliance.missed} missed.`}
              />
            )}

            {/* Missed Doses Alert */}
            {dailySummary.missedDoses && dailySummary.missedDoses.length > 0 && (
              <AIInsightCard
                type="warning"
                title={`${dailySummary.missedDoses.length} Missed Dose${dailySummary.missedDoses.length > 1 ? 's' : ''}`}
                description={dailySummary.missedDoses.slice(0, 2).map(d => `${d.medicationName} at ${d.scheduledTime}`).join(', ')}
              />
            )}
          </div>

          {/* Daily Summary */}
          {dailySummary && (
            <DailySummaryCard
              summary={dailySummary}
              elderName={elderName}
              date={selectedDate}
            />
          )}

          {/* Compliance Patterns */}
          {patterns && (
            <CompliancePatternChart
              patterns={patterns.patterns}
              recommendations={patterns.recommendations}
            />
          )}
        </>
      )}

      {/* AI Capabilities Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            AI-Powered Features
          </CardTitle>
          <CardDescription>
            Powered by Google Gemini AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                What AI Analyzes:
              </h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Medication and supplement compliance patterns</li>
                <li>• Time-of-day and day-of-week trends</li>
                <li>• Diet and nutrition observations</li>
                <li>• Behavioral patterns and consistency</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                What AI Provides:
              </h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Daily summaries and insights</li>
                <li>• Compliance improvement recommendations</li>
                <li>• General wellness suggestions</li>
                <li>• Pattern detection and alerts</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border-l-4 border-red-500">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong className="text-red-700 dark:text-red-400">DISCLAIMER:</strong> AI provides data analysis and pattern
              detection only. It does NOT provide medical advice, medication recommendations, dosage guidance, dietary
              prescriptions, or treatment suggestions. All medical decisions must be made in consultation with qualified
              healthcare professionals. This tool analyzes data entered by caregivers and does not diagnose, treat, or
              prevent any medical conditions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export Data Dialog */}
      {selectedElder && user?.groups && user.groups.length > 0 && (
        <ExportDataDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          elderId={selectedElder.id!}
          elderName={selectedElder.name}
          groupId={user.groups[0].groupId}
        />
      )}
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
