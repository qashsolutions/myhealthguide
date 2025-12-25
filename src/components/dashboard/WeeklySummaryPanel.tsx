'use client';

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart3, Check, Zap, AlertTriangle, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TimePeriod } from './TimeToggle';

interface SummaryStats {
  medicationsTaken: number;
  medicationsTotal: number;
  supplementsTaken: number;
  supplementsTotal: number;
  mealsLogged: number;
  mealsExpected: number;
  compliancePercentage: number;
  missedDoses: number;
  activityLogs: number;
  safetyAlerts: number;
  careScore: string;
}

interface WeeklySummaryPanelProps {
  period: TimePeriod;
  stats: SummaryStats;
  className?: string;
}

export function WeeklySummaryPanel({ period, stats, className }: WeeklySummaryPanelProps) {
  // Calculate date range
  const today = new Date();
  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  if (period === 'week') {
    startDate = startOfWeek(today, { weekStartsOn: 0 });
    endDate = endOfWeek(today, { weekStartsOn: 0 });
    periodLabel = 'Weekly Summary';
  } else {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
    periodLabel = 'Monthly Summary';
  }

  const dateRangeText = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Panel */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{periodLabel}</h3>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{dateRangeText}</span>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.medicationsTaken}/{stats.medicationsTotal}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Meds Taken</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.supplementsTaken}/{stats.supplementsTotal}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Supplements</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.mealsLogged}/{stats.mealsExpected}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Meals Logged</p>
          </div>
          <div className="text-center">
            <p className={cn(
              "text-2xl font-bold",
              stats.compliancePercentage >= 80
                ? "text-green-600 dark:text-green-400"
                : stats.compliancePercentage >= 60
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
            )}>
              {stats.compliancePercentage}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Compliance</p>
          </div>
        </div>
      </Card>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Missed Doses
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.missedDoses}
              </p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              stats.missedDoses === 0
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}>
              <Check className={cn(
                "w-5 h-5",
                stats.missedDoses === 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Activity Logs
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.activityLogs}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Safety Alerts
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.safetyAlerts}
              </p>
            </div>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              stats.safetyAlerts === 0
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-orange-100 dark:bg-orange-900/30"
            )}>
              <AlertTriangle className={cn(
                "w-5 h-5",
                stats.safetyAlerts === 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-orange-600 dark:text-orange-400"
              )} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Care Score
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.careScore}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
