'use client';

import { Users, Heart, DollarSign, CheckCircle2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AgencyQuickStatsProps {
  caregiverCount: number;
  elderCount: number;
  maxCaregivers: number;
  maxElders: number;
  revenue: number;
  maxRevenue: number;
  loading: boolean;
}

export function AgencyQuickStats({
  caregiverCount,
  elderCount,
  maxCaregivers,
  maxElders,
  revenue,
  maxRevenue,
  loading,
}: AgencyQuickStatsProps) {
  const caregiverFull = caregiverCount >= maxCaregivers;
  const elderFull = elderCount >= maxElders;
  const caregiverGap = maxCaregivers - caregiverCount;
  const elderGap = maxElders - elderCount;

  const statCards = [
    {
      label: 'Caregivers',
      value: `${caregiverCount}/${maxCaregivers}`,
      icon: caregiverFull ? CheckCircle2 : Users,
      isFull: caregiverFull,
      gap: caregiverGap,
      progressPct: (caregiverCount / maxCaregivers) * 100,
    },
    {
      label: 'Loved Ones',
      value: `${elderCount}/${maxElders}`,
      icon: elderFull ? CheckCircle2 : Heart,
      isFull: elderFull,
      gap: elderGap,
      progressPct: (elderCount / maxElders) * 100,
    },
    {
      label: 'Revenue',
      value: `$${revenue.toLocaleString()}`,
      subValue: `/ $${maxRevenue.toLocaleString()}`,
      icon: DollarSign,
      isFull: revenue >= maxRevenue,
      gap: 0,
      progressPct: (revenue / maxRevenue) * 100,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-3 relative overflow-hidden">
            {/* Progress bar background */}
            <div
              className={cn(
                'absolute bottom-0 left-0 h-1 transition-all',
                stat.isFull ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-200 dark:bg-blue-800'
              )}
              style={{ width: `${Math.min(stat.progressPct, 100)}%` }}
            />

            <div className="flex items-start justify-between mb-1">
              <Icon
                className={cn(
                  'w-4 h-4',
                  stat.isFull
                    ? 'text-green-500 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              />
              {stat.isFull && (
                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/40 px-1.5 py-0.5 rounded">
                  Full
                </span>
              )}
            </div>

            <div className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                stat.value
              )}
            </div>

            {!loading && stat.subValue && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500">
                {stat.subValue}
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {stat.label}
            </div>

            {!loading && !stat.isFull && stat.gap > 0 && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                {stat.gap} slot{stat.gap !== 1 ? 's' : ''} open
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
