'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, DollarSign, Clock, UserX, AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MULTI_AGENCY_PRICE_PER_ELDER = 55;

interface NeedsAttentionListProps {
  elderCount: number;
  maxElders: number;
  caregiverCount: number;
  noShowCount: number;
  unconfirmedCount: number;
  overtimeCount: number;
  idleCaregiverCount: number;
  replacementNeededCount: number;
  burnoutRiskCount: number;
  careQualityPct: number;
  coverageRatePct: number;
  loading: boolean;
}

type RootCause = 'scheduling' | 'burnout' | 'capacity' | 'quality';

interface AttentionItem {
  id: string;
  message: string;
  impact?: string;
  type: 'urgent' | 'warning' | 'info';
  icon: typeof AlertTriangle;
  href: string;
  ctaLabel: string;
  rootCause: RootCause;
}

export function NeedsAttentionList({
  elderCount,
  maxElders,
  caregiverCount,
  noShowCount,
  unconfirmedCount,
  overtimeCount,
  idleCaregiverCount,
  replacementNeededCount,
  burnoutRiskCount,
  careQualityPct,
  coverageRatePct,
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

  // Build items ordered by impact priority
  const items: AttentionItem[] = [];

  // Priority 0: Burnout Risk (staff retention — highest cost)
  if (burnoutRiskCount > 0) {
    items.push({
      id: 'burnout-risk',
      message: `${burnoutRiskCount} caregiver${burnoutRiskCount !== 1 ? 's' : ''} at burnout risk`,
      impact: 'Retention risk — review workload',
      type: 'urgent',
      icon: AlertTriangle,
      href: '/dashboard/care-management',
      ctaLabel: 'Review Workload',
      rootCause: 'burnout',
    });
  }

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
      ctaLabel: 'Assign Elders',
      rootCause: 'capacity',
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
      href: '/dashboard/agency/schedule',
      ctaLabel: 'View Schedule',
      rootCause: 'scheduling',
    });
  }

  // Priority 3: Unconfirmed shifts today (coverage gap risk)
  const pureUnconfirmed = unconfirmedCount - noShowCount;
  if (pureUnconfirmed > 0) {
    items.push({
      id: 'unconfirmed',
      message: `${pureUnconfirmed} shift${pureUnconfirmed !== 1 ? 's' : ''} unconfirmed today`,
      impact: 'Coverage gap risk',
      type: 'warning',
      icon: AlertCircle,
      href: '/dashboard/agency/schedule',
      ctaLabel: 'Confirm Shifts',
      rootCause: 'scheduling',
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
      ctaLabel: 'View Shifts',
      rootCause: 'burnout',
    });
  }

  // Priority 4b: Care Quality declining
  if (careQualityPct < 90) {
    items.push({
      id: 'care-quality',
      message: `Care quality at ${careQualityPct}% — medication adherence dropping`,
      impact: careQualityPct < 75 ? 'Client safety concern' : 'Service quality declining',
      type: careQualityPct < 75 ? 'urgent' : 'warning',
      icon: AlertCircle,
      href: '/dashboard/medications',
      ctaLabel: 'View Adherence',
      rootCause: 'quality',
    });
  }

  // Priority 4c: Coverage gaps this week
  if (coverageRatePct < 80) {
    items.push({
      id: 'coverage-gap',
      message: `Coverage at ${coverageRatePct}% — shifts not confirmed (7d)`,
      impact: coverageRatePct < 50 ? 'Critical coverage gap' : 'Coverage below target',
      type: coverageRatePct < 50 ? 'urgent' : 'warning',
      icon: AlertCircle,
      href: '/dashboard/agency/schedule',
      ctaLabel: 'Fix Coverage',
      rootCause: 'scheduling',
    });
  }

  // Priority 5: Idle caregivers (underutilization)
  // Red (urgent) when >= 20% of caregivers idle AND elders are assigned
  if (idleCaregiverCount > 0) {
    const idlePct = caregiverCount > 0 ? (idleCaregiverCount / caregiverCount) * 100 : 0;
    const isUrgent = idlePct >= 20 && elderCount > 0;
    items.push({
      id: 'idle-caregivers',
      message: `${idleCaregiverCount} caregiver${idleCaregiverCount !== 1 ? 's' : ''} with no shifts (7d)`,
      impact: isUrgent ? 'Revenue at risk — schedule now' : 'Underutilization',
      type: isUrgent ? 'urgent' : 'info',
      icon: AlertTriangle,
      href: '/dashboard/agency/schedule',
      ctaLabel: 'Create Schedule',
      rootCause: 'scheduling',
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
      href: '/dashboard/agency/schedule',
      ctaLabel: 'Find Replacement',
      rootCause: 'scheduling',
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

  // Priority CTA Banner — shows the #1 highest priority action
  const topItem = items[0];
  const TopIcon = topItem.icon;

  // Smart dedup: suppress items sharing the same root cause as the CTA
  const remainingItems = items.slice(1).filter(item => item.rootCause !== topItem.rootCause);

  return (
    <div>
      {/* Priority CTA Banner */}
      <Card
        className={cn(
          'p-4 mb-4 cursor-pointer transition-colors',
          topItem.type === 'urgent'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
        )}
        onClick={() => router.push(topItem.href)}
      >
        <div className="flex items-center gap-3">
          <TopIcon
            className={cn(
              'w-5 h-5 shrink-0',
              topItem.type === 'urgent' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
            )}
          />
          <div className="flex-1 min-w-0">
            <span className={cn(
              'text-sm font-semibold block',
              topItem.type === 'urgent' ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'
            )}>
              {topItem.message}
            </span>
            {topItem.impact && (
              <span className={cn(
                'text-xs',
                topItem.type === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              )}>
                {topItem.impact}
              </span>
            )}
          </div>
          <span className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 whitespace-nowrap',
            topItem.type === 'urgent'
              ? 'bg-red-600 text-white'
              : 'bg-amber-600 text-white'
          )}>
            {topItem.ctaLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Card>

      {/* Remaining alerts (deduped — same root cause as CTA suppressed) */}
      {remainingItems.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Needs Attention</h2>
          <div className="space-y-2">
            {remainingItems.map((item) => {
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
        </>
      )}
    </div>
  );
}
