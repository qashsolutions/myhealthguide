'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertCircle, Activity, Award } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendsData } from '@/lib/utils/trendsCalculation';
import { useState } from 'react';

interface WeeklyTrendsDashboardProps {
  trendsData: TrendsData;
  elderName: string;
  onWeeksChange?: (weeks: number) => void;
}

export function WeeklyTrendsDashboard({
  trendsData,
  elderName,
  onWeeksChange
}: WeeklyTrendsDashboardProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<string>('12');

  // Defensive null check - return null if trendsData is undefined or missing required fields
  if (!trendsData || typeof trendsData.overallCompliance !== 'number' || !Array.isArray(trendsData.weeks)) {
    return null;
  }

  const handleWeeksChange = (value: string) => {
    setSelectedWeeks(value);
    if (onWeeksChange) {
      onWeeksChange(parseInt(value));
    }
  };

  // Prepare chart data
  const chartData = trendsData.weeks.map(week => ({
    week: week.weekLabel,
    compliance: week.complianceRate.toFixed(1),
    missed: week.missedDoses,
    diet: week.dietEntries
  }));

  return (
    <div className="space-y-6">
      {/* Header with Week Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Weekly Health Trends - {elderName}
              </CardTitle>
              <CardDescription>
                Track patterns and changes over time
              </CardDescription>
            </div>
            <Select value={selectedWeeks} onValueChange={handleWeeksChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Last 4 weeks</SelectItem>
                <SelectItem value="8">Last 8 weeks</SelectItem>
                <SelectItem value="12">Last 12 weeks</SelectItem>
                <SelectItem value="24">Last 24 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Compliance */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Overall Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">
                {trendsData.overallCompliance.toFixed(1)}%
              </span>
              {trendsData.overallCompliance >= 90 ? (
                <Award className="w-5 h-5 text-yellow-500" />
              ) : null}
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              {trendsData.overallCompliance >= 90
                ? 'Excellent adherence!'
                : trendsData.overallCompliance >= 75
                ? 'Good adherence'
                : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        {/* Total Missed Doses */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Total Missed Doses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {trendsData.totalMissedDoses}
            </div>
            <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
              Across all weeks
            </p>
          </CardContent>
        </Card>

        {/* Average Diet Entries */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Avg Meals/Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {trendsData.averageDietEntriesPerWeek.toFixed(1)}
            </div>
            <p className="text-xs text-green-800 dark:text-green-200 mt-1">
              Meal logging frequency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Significant Changes Alert */}
      {trendsData.significantChanges.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            {trendsData.significantChanges.length} Significant Change
            {trendsData.significantChanges.length > 1 ? 's' : ''} Detected
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <ul className="mt-2 space-y-1">
              {trendsData.significantChanges.slice(0, 3).map((change, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {change.direction === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {change.weekLabel.split('\n')[0]}:{' '}
                    {change.type === 'compliance'
                      ? `Compliance ${change.direction === 'up' ? 'improved' : 'declined'} by ${change.change.toFixed(0)}%`
                      : change.type === 'diet'
                      ? `Diet entries ${change.direction === 'up' ? 'increased' : 'decreased'} by ${change.change.toFixed(0)}%`
                      : `${change.change} more missed doses`}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Medication Compliance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Medication Compliance Trend</CardTitle>
          <CardDescription>Weekly compliance percentage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                interval={chartData.length > 12 ? 1 : 0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Compliance %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" label="Target 90%" />
              <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="3 3" label="Minimum 75%" />
              <Line
                type="monotone"
                dataKey="compliance"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Compliance %"
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Missed Doses Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Missed Doses Trend</CardTitle>
          <CardDescription>Number of missed doses per week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                interval={chartData.length > 12 ? 1 : 0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="missed"
                stroke="#ef4444"
                strokeWidth={2}
                name="Missed Doses"
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Diet Entries Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Meal Logging Trend</CardTitle>
          <CardDescription>Number of meals logged per week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                interval={chartData.length > 12 ? 1 : 0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="diet"
                stroke="#22c55e"
                strokeWidth={2}
                name="Meals Logged"
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
