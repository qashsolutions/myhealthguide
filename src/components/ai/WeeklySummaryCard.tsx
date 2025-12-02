'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Pill,
  Utensils,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { generateWeeklySummary, getWeeklySummaries, WeeklySummaryData } from '@/lib/ai/weeklySummary';

interface WeeklySummaryCardProps {
  elderId: string;
  elderName: string;
  groupId: string;
  userId: string;
  userRole: 'admin' | 'caregiver' | 'member';
}

export function WeeklySummaryCard({
  elderId,
  elderName,
  groupId,
  userId,
  userRole
}: WeeklySummaryCardProps) {
  const [summaries, setSummaries] = useState<WeeklySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  // Load past summaries
  useEffect(() => {
    async function loadSummaries() {
      setLoading(true);
      try {
        const data = await getWeeklySummaries(groupId, elderId, 4);
        setSummaries(data);
        // Auto-expand current week if exists
        if (data.length > 0) {
          setExpandedWeek(data[0].id || null);
        }
      } catch (err) {
        console.error('Error loading weekly summaries:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSummaries();
  }, [groupId, elderId]);

  // Generate new weekly summary
  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const newSummary = await generateWeeklySummary(
        groupId,
        elderId,
        elderName,
        userId,
        userRole,
        0 // Current week
      );

      if (newSummary) {
        // Add to list or update existing
        setSummaries(prev => {
          const existing = prev.findIndex(s =>
            format(s.weekStart, 'yyyy-MM-dd') === format(newSummary.weekStart, 'yyyy-MM-dd')
          );
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newSummary;
            return updated;
          }
          return [newSummary, ...prev];
        });
        setExpandedWeek(newSummary.id || null);
      }
    } catch (err) {
      console.error('Error generating weekly summary:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Export summary as text
  const handleExport = (summary: WeeklySummaryData) => {
    const content = formatSummaryForExport(summary);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-summary-${format(summary.weekStart, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSummaryForExport = (summary: WeeklySummaryData): string => {
    const lines = [
      `Weekly Health Summary for ${summary.elderName}`,
      `Week of ${format(summary.weekStart, 'MMMM d')} - ${format(summary.weekEnd, 'MMMM d, yyyy')}`,
      `Generated: ${format(summary.generatedAt, 'MMMM d, yyyy h:mm a')}`,
      '',
      '=== MEDICATION COMPLIANCE ===',
      `Overall Compliance: ${summary.medicationSummary.overallCompliance}%`,
      `Doses Taken: ${summary.medicationSummary.takenDoses} / ${summary.medicationSummary.totalDoses}`,
      `Missed Doses: ${summary.medicationSummary.missedDoses}`,
      `Trend: ${summary.medicationSummary.complianceTrend}`,
      '',
      'By Medication:',
      ...summary.medicationSummary.byMedication.map(m =>
        `  - ${m.name}: ${m.compliance}% (${m.taken}/${m.total})`
      ),
      '',
      '=== DIET SUMMARY ===',
      `Total Meals Logged: ${summary.dietSummary.totalMeals}`,
      `Average Meals/Day: ${summary.dietSummary.averageMealsPerDay}`,
      `Breakfast: ${summary.dietSummary.mealsByType.breakfast}`,
      `Lunch: ${summary.dietSummary.mealsByType.lunch}`,
      `Dinner: ${summary.dietSummary.mealsByType.dinner}`,
      `Snacks: ${summary.dietSummary.mealsByType.snack}`,
      '',
      ...(summary.dietSummary.nutritionConcerns.length > 0 ? [
        'Nutrition Notes:',
        ...summary.dietSummary.nutritionConcerns.map(c => `  - ${c}`),
        ''
      ] : []),
      '=== HEALTH OBSERVATIONS ===',
      ...(summary.healthObservations.symptomsReported.length > 0 ? [
        'Symptoms Reported:',
        ...summary.healthObservations.symptomsReported.map(s => `  - ${s}`),
        ''
      ] : []),
      ...(summary.healthObservations.notesHighlights.length > 0 ? [
        'Notable Entries:',
        ...summary.healthObservations.notesHighlights.map(n => `  - ${n}`),
        ''
      ] : []),
      '=== INSIGHTS ===',
      `Priority: ${summary.insights.priority.toUpperCase()}`,
      ...summary.insights.items.map(i => `  • ${i}`),
      '',
      ...(summary.comparison ? [
        '=== WEEK-OVER-WEEK ===',
        summary.comparison.trend,
        ''
      ] : []),
      '---',
      'This summary is for informational purposes only and does not constitute medical advice.',
    ];

    return lines.join('\n');
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
          <span className="text-gray-600 dark:text-gray-400">Loading weekly summaries...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Weekly Summaries
          </CardTitle>
          <Button
            onClick={handleGenerateSummary}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate This Week
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No weekly summaries yet for {elderName}
            </p>
            <Button onClick={handleGenerateSummary} disabled={generating}>
              Generate First Summary
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <Collapsible
                key={summary.id}
                open={expandedWeek === summary.id}
                onOpenChange={(open) => setExpandedWeek(open ? summary.id || null : null)}
              >
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900 dark:text-white">
                            Week of {format(summary.weekStart, 'MMM d')} - {format(summary.weekEnd, 'MMM d, yyyy')}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Generated {format(summary.generatedAt, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={summary.medicationSummary.overallCompliance >= 80 ? 'default' : 'destructive'}
                        >
                          {summary.medicationSummary.overallCompliance}% Compliance
                        </Badge>
                        <Badge className={getPriorityColor(summary.insights.priority)}>
                          {summary.insights.priority} priority
                        </Badge>
                        {expandedWeek === summary.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      {/* Medication Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Pill className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-sm">Medications</span>
                            {getTrendIcon(summary.medicationSummary.complianceTrend)}
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {summary.medicationSummary.overallCompliance}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {summary.medicationSummary.takenDoses} taken, {summary.medicationSummary.missedDoses} missed
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Utensils className="w-4 h-4 text-orange-600" />
                            <span className="font-medium text-sm">Diet</span>
                          </div>
                          <div className="text-2xl font-bold text-orange-600">
                            {summary.dietSummary.totalMeals}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            meals logged ({summary.dietSummary.averageMealsPerDay}/day avg)
                          </div>
                        </div>
                      </div>

                      {/* Insights */}
                      {summary.insights.items.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Key Insights</h4>
                          <ul className="space-y-1">
                            {summary.insights.items.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Health Observations */}
                      {summary.healthObservations.symptomsReported.length > 0 && (
                        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="font-medium text-sm">Symptoms Noted</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {summary.healthObservations.symptomsReported.map((symptom, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {symptom}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Week Comparison */}
                      {summary.comparison && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <span className="font-medium">vs Last Week: </span>
                          {summary.comparison.trend}
                        </div>
                      )}

                      {/* Export Button */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(summary)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Summary
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
