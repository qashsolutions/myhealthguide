'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, AlertCircle } from 'lucide-react';
import type { ScheduleCoverageStats } from '@/lib/firebase/agencyAnalytics';

interface ScheduleCoverageChartProps {
  data: ScheduleCoverageStats[];
  loading?: boolean;
}

export function ScheduleCoverageChart({ data, loading }: ScheduleCoverageChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule Coverage</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const averageCoverage = data.length > 0
    ? data.reduce((sum, day) => sum + day.coverageRate, 0) / data.length
    : 0;

  const lowCoverageDays = data.filter(d => d.coverageRate < 80);

  const getBarColor = (rate: number) => {
    if (rate >= 90) return '#10b981'; // Green
    if (rate >= 80) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Coverage
            </CardTitle>
            <CardDescription>Fill rate by day of week (this week)</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {Math.round(averageCoverage)}%
            </div>
            <div className="text-sm text-gray-500">Avg Coverage</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dayOfWeek" />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value: number) => `${value}%`}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="coverageRate" name="Coverage %">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.coverageRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs">Total Shifts</div>
            <div className="text-xl font-bold">
              {data.reduce((sum, d) => sum + d.totalShifts, 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Filled</div>
            <div className="text-xl font-bold text-green-600">
              {data.reduce((sum, d) => sum + d.filledShifts, 0)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Open</div>
            <div className="text-xl font-bold text-red-600">
              {data.reduce((sum, d) => sum + (d.totalShifts - d.filledShifts), 0)}
            </div>
          </div>
        </div>

        {lowCoverageDays.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>
                {lowCoverageDays.map(d => d.dayOfWeek).join(', ')} {lowCoverageDays.length > 1 ? 'have' : 'has'} low coverage (&lt;80%)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
