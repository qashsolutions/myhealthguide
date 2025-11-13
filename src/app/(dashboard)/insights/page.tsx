'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DailySummaryCard } from '@/components/ai/DailySummaryCard';
import { CompliancePatternChart } from '@/components/ai/CompliancePatternChart';
import { AIInsightCard } from '@/components/ai/AIInsightCard';
import { generateDailySummary, detectCompliancePatterns } from '@/lib/ai/geminiService';
import { DailySummary } from '@/types';
import { Sparkles, RefreshCw, Calendar, TrendingUp } from 'lucide-react';

export default function InsightsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [patterns, setPatterns] = useState<{ patterns: string[]; recommendations: string[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock elder data - replace with actual data from Firebase
  const elderName = 'John Smith';

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      // Mock data for development
      // In production, fetch actual logs from Firebase
      const mockData = {
        medicationLogs: [
          { status: 'taken', medicationName: 'Lisinopril', time: '8:00 AM' },
          { status: 'taken', medicationName: 'Metformin', time: '8:00 AM' },
          { status: 'taken', medicationName: 'Aspirin', time: '6:00 PM' },
          { status: 'missed', medicationName: 'Vitamin D', time: '8:00 AM' },
        ],
        supplementLogs: [
          { status: 'taken', supplementName: 'Omega-3', time: '8:00 AM' },
          { status: 'taken', supplementName: 'Calcium', time: '8:00 AM' },
        ],
        dietEntries: [
          { meal: 'breakfast', items: ['oatmeal', 'banana', 'coffee'] },
          { meal: 'lunch', items: ['chicken', 'salad', 'water'] },
          { meal: 'dinner', items: ['salmon', 'vegetables', 'rice'] },
        ],
        elderName
      };

      // Generate AI summary
      const summary = await generateDailySummary(mockData);
      setDailySummary(summary);

      // Detect compliance patterns
      const compliancePatterns = await detectCompliancePatterns(mockData.medicationLogs);
      setPatterns(compliancePatterns);

    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [selectedDate]);

  return (
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
        <Button onClick={loadInsights} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh Insights'}
        </Button>
      </div>

      {/* Date Selector */}
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

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AIInsightCard
          type="positive"
          title="Excellent Medication Compliance"
          description="John has maintained 90%+ medication compliance this week. Great job!"
        />
        <AIInsightCard
          type="info"
          title="Diet Pattern Detected"
          description="Regular meal times observed. Breakfast consistently logged at 8:00 AM."
        />
        <AIInsightCard
          type="warning"
          title="Weekend Compliance Dip"
          description="Compliance drops by 15% on weekends. Consider setting weekend reminders."
          actionLabel="Set Reminder"
          onAction={() => console.log('Navigate to reminders')}
        />
        <AIInsightCard
          type="insight"
          title="Hydration Opportunity"
          description="AI suggests tracking water intake to ensure adequate hydration throughout the day."
          actionLabel="Learn More"
          onAction={() => console.log('Learn more about hydration')}
        />
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
          <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Important:</strong> AI insights are for informational purposes only and do not constitute medical advice.
              The AI does not provide dosage recommendations, diagnose conditions, or suggest medication changes.
              Always consult healthcare professionals for medical decisions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
