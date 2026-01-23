'use client';

import { AlertTriangle, Activity, Shield, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AgencyQuickStatsProps {
  burnoutRiskCount: number;
  careQualityPct: number;
  coverageRatePct: number;
  caregiverCount: number;
  loading: boolean;
}

export function AgencyQuickStats({
  burnoutRiskCount,
  careQualityPct,
  coverageRatePct,
  caregiverCount,
  loading,
}: AgencyQuickStatsProps) {
  const burnoutOk = burnoutRiskCount === 0;
  const qualityGood = careQualityPct >= 90;
  const coverageGood = coverageRatePct >= 80;

  const statCards = [
    {
      label: 'Burnout Risk',
      value: burnoutOk ? 'None' : `${burnoutRiskCount} at risk`,
      subValue: burnoutOk ? `${caregiverCount} caregivers healthy` : `of ${caregiverCount} caregivers`,
      icon: AlertTriangle,
      status: burnoutOk ? 'good' : 'bad',
    },
    {
      label: 'Care Quality',
      value: `${careQualityPct}%`,
      subValue: 'Med adherence (7d)',
      icon: Activity,
      status: qualityGood ? 'good' : careQualityPct >= 75 ? 'warn' : 'bad',
    },
    {
      label: 'Coverage',
      value: `${coverageRatePct}%`,
      subValue: 'Shifts covered (week)',
      icon: Shield,
      status: coverageGood ? 'good' : coverageRatePct >= 50 ? 'warn' : 'bad',
    },
  ];

  const statusColors = {
    good: {
      icon: 'text-green-500 dark:text-green-400',
      value: 'text-green-700 dark:text-green-300',
      bar: 'bg-green-400 dark:bg-green-500',
    },
    warn: {
      icon: 'text-amber-500 dark:text-amber-400',
      value: 'text-amber-700 dark:text-amber-300',
      bar: 'bg-amber-400 dark:bg-amber-500',
    },
    bad: {
      icon: 'text-red-500 dark:text-red-400',
      value: 'text-red-700 dark:text-red-300',
      bar: 'bg-red-400 dark:bg-red-500',
    },
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const colors = statusColors[stat.status as keyof typeof statusColors];
        return (
          <Card key={stat.label} className="p-3 relative overflow-hidden">
            <div className="flex items-start justify-between mb-1">
              <Icon className={cn('w-4 h-4', colors.icon)} />
            </div>

            <div className={cn('text-lg font-bold leading-tight', colors.value)}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                stat.value
              )}
            </div>

            {!loading && stat.subValue && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {stat.subValue}
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {stat.label}
            </div>

            {/* Status bar */}
            <div className={cn('absolute bottom-0 left-0 w-full h-1', colors.bar)} />
          </Card>
        );
      })}
    </div>
  );
}
