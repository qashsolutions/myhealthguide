'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Heart } from 'lucide-react';
import type { AssignmentsOverviewData } from '@/lib/firebase/agencyAnalytics';

interface AssignmentsOverviewChartProps {
  data: AssignmentsOverviewData[];
  loading?: boolean;
}

export function AssignmentsOverviewChart({ data, loading }: AssignmentsOverviewChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignments Overview</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assignments Overview</CardTitle>
            <CardDescription>Caregivers and loved ones by month</CardDescription>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold text-blue-600">
                <Users className="w-5 h-5" />
                {latestMonth?.caregiverCount || 0}
              </div>
              <div className="text-sm text-gray-500">Caregivers</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold text-green-600">
                <Heart className="w-5 h-5" />
                {latestMonth?.elderCount || 0}
              </div>
              <div className="text-sm text-gray-500">Loved Ones</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="caregiverCount"
              fill="#3b82f6"
              name="Caregivers"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="elderCount"
              fill="#10b981"
              name="Loved Ones"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
