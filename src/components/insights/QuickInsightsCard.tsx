'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Pill,
  Apple,
  Utensils,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import type { QuickInsightsData } from '@/lib/utils/complianceCalculation';

interface QuickInsightsCardProps {
  insights: QuickInsightsData;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showCollapsible?: boolean;
  compact?: boolean;
}

export function QuickInsightsCard({
  insights,
  isOpen = true,
  onOpenChange,
  showCollapsible = true,
  compact = false
}: QuickInsightsCardProps) {
  // Defensive null check - return null if insights is undefined or missing required fields
  if (!insights || typeof insights.overallCompliance !== 'number') {
    return null;
  }

  const content = (
    <div className={`grid ${compact ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
      {/* Medications */}
      <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <Pill className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Medications</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Taken</span>
            <span className="font-medium">{insights.medications.taken}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-yellow-600">Pending</span>
            <span className="font-medium">{insights.medications.pending}</span>
          </div>
          {insights.medications.missed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Missed</span>
              <span className="font-medium">{insights.medications.missed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Supplements */}
      <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-2">
          <Apple className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Supplements</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Taken</span>
            <span className="font-medium">{insights.supplements.taken}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-yellow-600">Pending</span>
            <span className="font-medium">{insights.supplements.pending}</span>
          </div>
          {insights.supplements.missed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Missed</span>
              <span className="font-medium">{insights.supplements.missed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Meals */}
      <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2 mb-2">
          <Utensils className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Meals</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {insights.mealsLogged}
        </div>
        <div className="text-xs text-gray-500">logged today</div>
      </div>

      {/* Status */}
      <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</span>
        </div>
        {(() => {
          const totalMissed = insights.medications.missed + insights.supplements.missed;
          const compliance = insights.overallCompliance;

          // Critical: compliance < 50% or multiple missed
          if (compliance < 50 || totalMissed >= 3) {
            return (
              <>
                <div className="flex items-center gap-1">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Needs Attention</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{totalMissed} missed today</div>
              </>
            );
          }

          // Warning: compliance < 80% or has missed items
          if (compliance < 80 || totalMissed > 0) {
            return (
              <>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Keep Going</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalMissed > 0 ? `${totalMissed} missed` : `${insights.pendingItems} pending`}
                </div>
              </>
            );
          }

          // Pending items but good compliance so far
          if (insights.pendingItems > 0) {
            return (
              <>
                <div className="text-2xl font-bold text-yellow-600">
                  {insights.pendingItems}
                </div>
                <div className="text-xs text-gray-500">items pending</div>
              </>
            );
          }

          // All done with good compliance
          return (
            <>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">All done!</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Great job today</div>
            </>
          );
        })()}
      </div>
    </div>
  );

  if (!showCollapsible) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Quick Insights
            </div>
            <Badge
              variant={insights.overallCompliance >= 80 ? 'default' : 'destructive'}
              className="text-xs"
            >
              {insights.overallCompliance}% Compliance
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors rounded-t-lg">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Quick Insights
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={insights.overallCompliance >= 80 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {insights.overallCompliance}% Compliance
                </Badge>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {content}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
