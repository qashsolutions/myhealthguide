'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, DollarSign, Clock, UserX, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MULTI_AGENCY_PRICE_PER_ELDER = 55;

interface NeedsAttentionListProps {
  elderCount: number;
  maxElders: number;
  noShowCount: number;
  unconfirmedCount: number;
  overtimeCount: number;
  idleCaregiverCount: number;
  replacementNeededCount: number;
  loading: boolean;
}

interface AttentionItem {
  id: string;
  message: string;
  impact?: string;
  type: 'urgent' | 'warning' | 'info';
  icon: typeof AlertTriangle;
  href: string;
}

export function NeedsAttentionList({
  elderCount,
  maxElders,
  noShowCount,
  unconfirmedCount,
  overtimeCount,
  idleCaregiverCount,
  replacementNeededCount,
  loading,
}: NeedsAttentionListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Build items ordered by revenue impact priority
  const items: AttentionItem[] = [];

  // Priority 1: Unfilled elder slots (direct revenue loss)
  const unfilledElders = maxElders - elderCount;
  if (unfilledElders > 0) {
    const lostRevenue = unfilledElders * MULTI_AGENCY_PRICE_PER_ELDER;
    items.push({
      id: 'unfilled-slots',
      message: `${unfilledElders} elder slot${unfilledElders !== 1 ? 's' : ''} unfilled`,
      impact: `$${lostRevenue.toLocaleString()}/mo potential`,
      type: 'urgent',
      icon: DollarSign,
      href: '/dashboard/agency?tab=assignments',
    });
  }

  // Priority 2: No-shows today (client satisfaction risk)
  if (noShowCount > 0) {
    items.push({
      id: 'no-shows',
      message: `${noShowCount} shift${noShowCount !== 1 ? 's' : ''} with no-show today`,
      impact: 'Client satisfaction risk',
      type: 'urgent',
      icon: UserX,
      href: '/dashboard/agency?tab=scheduling',
    });
  }

  // Priority 3: Unconfirmed shifts today (coverage gap risk)
  // Only show unconfirmed that aren't already counted as no-shows
  const pureUnconfirmed = unconfirmedCount - noShowCount;
  if (pureUnconfirmed > 0) {
    items.push({
      id: 'unconfirmed',
      message: `${pureUnconfirmed} shift${pureUnconfirmed !== 1 ? 's' : ''} unconfirmed today`,
      impact: 'Coverage gap risk',
      type: 'warning',
      icon: AlertCircle,
      href: '/dashboard/agency?tab=scheduling',
    });
  }

  // Priority 4: Overtime shifts (cost overrun)
  if (overtimeCount > 0) {
    items.push({
      id: 'overtime',
      message: `${overtimeCount} shift${overtimeCount !== 1 ? 's' : ''} running overtime`,
      impact: 'Cost overrun',
      type: 'warning',
      icon: Clock,
      href: '/dashboard/care-management',
    });
  }

  // Priority 5: Idle caregivers (underutilization)
  if (idleCaregiverCount > 0) {
    items.push({
      id: 'idle-caregivers',
      message: `${idleCaregiverCount} caregiver${idleCaregiverCount !== 1 ? 's' : ''} with no shifts this week`,
      impact: 'Underutilization',
      type: 'info',
      icon: AlertTriangle,
      href: '/dashboard/agency?tab=scheduling',
    });
  }

  // Priority 6: Replacement needed tomorrow
  if (replacementNeededCount > 0) {
    items.push({
      id: 'replacement-needed',
      message: `${replacementNeededCount} cancelled shift${replacementNeededCount !== 1 ? 's' : ''} need replacement tomorrow`,
      impact: 'Coverage gap',
      type: 'warning',
      icon: AlertTriangle,
      href: '/dashboard/agency?tab=scheduling',
    });
  }

  // All good state
  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Needs Attention</h2>
        <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              All good! Full capacity, all shifts confirmed.
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Needs Attention</h2>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className={cn(
                'p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                item.type === 'urgent' && 'border-red-200 dark:border-red-800',
                item.type === 'warning' && 'border-amber-200 dark:border-amber-800'
              )}
              onClick={() => router.push(item.href)}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    item.type === 'urgent' && 'text-red-500 dark:text-red-400',
                    item.type === 'warning' && 'text-amber-500 dark:text-amber-400',
                    item.type === 'info' && 'text-blue-500 dark:text-blue-400'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300 block">
                    {item.message}
                  </span>
                  {item.impact && (
                    <span className={cn(
                      'text-[11px] font-medium',
                      item.type === 'urgent' && 'text-red-600 dark:text-red-400',
                      item.type === 'warning' && 'text-amber-600 dark:text-amber-400',
                      item.type === 'info' && 'text-blue-600 dark:text-blue-400'
                    )}>
                      {item.impact}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
