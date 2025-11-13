'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';

interface CompliancePatternChartProps {
  patterns: string[];
  recommendations: string[];
  complianceData?: {
    weekday: string;
    percentage: number;
  }[];
}

export function CompliancePatternChart({
  patterns,
  recommendations,
  complianceData = []
}: CompliancePatternChartProps) {
  // Mock data if none provided
  const data = complianceData.length > 0 ? complianceData : [
    { weekday: 'Mon', percentage: 90 },
    { weekday: 'Tue', percentage: 85 },
    { weekday: 'Wed', percentage: 95 },
    { weekday: 'Thu', percentage: 80 },
    { weekday: 'Fri', percentage: 75 },
    { weekday: 'Sat', percentage: 70 },
    { weekday: 'Sun', percentage: 85 },
  ];

  const maxPercentage = Math.max(...data.map(d => d.percentage));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Compliance Patterns
        </CardTitle>
        <CardDescription>
          AI-detected patterns in medication adherence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Chart */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4" />
            Weekly Compliance Rate
          </div>
          <div className="flex items-end gap-2 h-40">
            {data.map((day) => (
              <div key={day.weekday} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end flex-1">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      day.percentage >= 90 ? 'bg-green-500' :
                      day.percentage >= 80 ? 'bg-blue-500' :
                      day.percentage >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ height: `${(day.percentage / maxPercentage) * 100}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {day.percentage}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {day.weekday}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detected Patterns */}
        {patterns && patterns.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4" />
              Detected Patterns
            </div>
            <div className="space-y-2">
              {patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {pattern}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-4 h-4 text-green-600" />
              AI Recommendations
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Excellent (90%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">Good (80-89%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">Fair (70-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Needs Attention (&lt;70%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
