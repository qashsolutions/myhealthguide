'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import type { BillableHoursData } from '@/lib/firebase/agencyAnalytics';

interface BillableHoursChartProps {
  data: BillableHoursData[];
  loading?: boolean;
}

export function BillableHoursChart({ data, loading }: BillableHoursChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billable Hours Trend</CardTitle>
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

  const latestMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  const percentChange = previousMonth
    ? ((latestMonth.totalHours - previousMonth.totalHours) / previousMonth.totalHours) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Billable Hours Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <DollarSign className="w-5 h-5 text-green-600" />
              ${latestMonth?.projectedRevenue.toLocaleString() || 0}
            </div>
            <div className={`text-sm flex items-center gap-1 ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 ${percentChange < 0 ? 'rotate-180' : ''}`} />
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}% vs last month
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'projectedRevenue') return `$${value.toLocaleString()}`;
                return `${value.toFixed(1)} hrs`;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalHours"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Hours"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="projectedRevenue"
              stroke="#10b981"
              strokeWidth={2}
              name="Revenue ($)"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
