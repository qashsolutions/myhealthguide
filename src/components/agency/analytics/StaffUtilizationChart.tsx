'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, AlertTriangle } from 'lucide-react';
import type { StaffUtilizationMetrics } from '@/lib/firebase/agencyAnalytics';

interface StaffUtilizationChartProps {
  data: StaffUtilizationMetrics[];
  loading?: boolean;
}

export function StaffUtilizationChart({ data, loading }: StaffUtilizationChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Utilization</CardTitle>
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

  const averageUtilization = data.length > 0
    ? data.reduce((sum, item) => sum + item.utilizationRate, 0) / data.length
    : 0;

  const getBarColor = (rate: number) => {
    if (rate >= 90) return '#ef4444'; // Red - overutilized
    if (rate >= 70) return '#10b981'; // Green - good
    if (rate >= 50) return '#f59e0b'; // Orange - moderate
    return '#6b7280'; // Gray - underutilized
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Utilization
            </CardTitle>
            <CardDescription>Hours worked / Available hours this week</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {Math.round(averageUtilization)}%
            </div>
            <div className="text-sm text-gray-500">Avg Utilization</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="caregiverName" />
            <Tooltip
              formatter={(value: number) => `${value}%`}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="utilizationRate" name="Utilization %">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.utilizationRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>≥90% (Overutilized)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>70-89% (Good)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>50-69% (Moderate)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>&lt;50% (Low)</span>
          </div>
        </div>

        {data.some(d => d.utilizationRate >= 90) && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {data.filter(d => d.utilizationRate >= 90).length} caregiver(s) are overutilized - risk of burnout
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
