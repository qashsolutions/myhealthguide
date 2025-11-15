'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DailySummary } from '@/types';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Pill, Leaf, Utensils } from 'lucide-react';

interface DailySummaryCardProps {
  summary: DailySummary;
  elderName: string;
  date: Date;
}

export function DailySummaryCard({ summary, elderName, date }: DailySummaryCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Daily Summary for {elderName}
        </CardTitle>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compliance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Medication Compliance */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Pill className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Medications</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Taken</span>
                <span className="font-medium text-green-600">{summary.medicationCompliance.taken}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Missed</span>
                <span className="font-medium text-red-600">{summary.medicationCompliance.missed}</span>
              </div>
              <div className="pt-2 border-t border-blue-300 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Rate</span>
                  <Badge variant={summary.medicationCompliance.percentage >= 80 ? 'default' : 'destructive'}>
                    {summary.medicationCompliance.percentage}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Supplement Compliance */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Supplements</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Taken</span>
                <span className="font-medium text-green-600">{summary.supplementCompliance.taken}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Missed</span>
                <span className="font-medium text-red-600">{summary.supplementCompliance.missed}</span>
              </div>
              <div className="pt-2 border-t border-green-300 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Rate</span>
                  <Badge variant={summary.supplementCompliance.percentage >= 80 ? 'default' : 'destructive'}>
                    {summary.supplementCompliance.percentage}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diet Summary */}
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Diet Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Meals logged:</span>
              <Badge variant="outline">{summary.dietSummary.mealsLogged}</Badge>
            </div>

            {summary.dietSummary.concernsDetected && summary.dietSummary.concernsDetected.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Concerns:</p>
                <ul className="space-y-1">
                  {summary.dietSummary.concernsDetected.map((concern, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.dietSummary.recommendations && summary.dietSummary.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recommendations:</p>
                <ul className="space-y-1">
                  {summary.dietSummary.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Overall Insights */}
        {summary.overallInsights && summary.overallInsights.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Key Insights</h3>
            <ul className="space-y-2">
              {summary.overallInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missed Doses Alert */}
        {summary.missedDoses && summary.missedDoses.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900 dark:text-red-100">Missed Doses</h3>
            </div>
            <ul className="space-y-1">
              {summary.missedDoses.map((dose, idx) => (
                <li key={idx} className="text-sm text-red-800 dark:text-red-200">
                  • {dose.medicationName} at {dose.scheduledTime}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
