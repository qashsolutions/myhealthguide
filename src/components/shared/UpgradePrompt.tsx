'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpCircle, Lock, Sparkles } from 'lucide-react';
import {
  FeatureName,
  PlanTier,
  getUpgradePrompt,
  getPlanConfig,
} from '@/lib/subscription';

export type UpgradePromptVariant = 'dialog' | 'inline' | 'banner' | 'card';

interface UpgradePromptProps {
  feature: FeatureName;
  currentTier: PlanTier | null;
  variant?: UpgradePromptVariant;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Reusable upgrade prompt component that can be displayed as a dialog, inline message, banner, or card
 */
export function UpgradePrompt({
  feature,
  currentTier,
  variant = 'inline',
  isOpen = false,
  onOpenChange,
  onUpgrade,
  className = '',
}: UpgradePromptProps) {
  const router = useRouter();
  const promptInfo = getUpgradePrompt(currentTier, feature);
  const targetPlanConfig = getPlanConfig(promptInfo.targetPlan);

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/dashboard/settings?tab=subscription');
    }
    onOpenChange?.(false);
  };

  // Dialog variant
  if (variant === 'dialog') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <DialogTitle>{promptInfo.title}</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {promptInfo.message}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {targetPlanConfig.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {targetPlanConfig.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${targetPlanConfig.price}
                  </p>
                  <p className="text-xs text-gray-500">{targetPlanConfig.priceNote}</p>
                </div>
              </div>

              {targetPlanConfig.extras.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 mb-2">Includes:</p>
                  <ul className="space-y-1">
                    {targetPlanConfig.extras.slice(0, 3).map((extra, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        {extra}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Maybe Later
            </Button>
            <Button onClick={handleUpgradeClick} className="gap-2">
              <ArrowUpCircle className="w-4 h-4" />
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <Alert className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800 ${className}`}>
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          {promptInfo.title}
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
          <span className="text-blue-700 dark:text-blue-300">
            {promptInfo.message}
          </span>
          <Button
            size="sm"
            onClick={handleUpgradeClick}
            className="gap-2 whitespace-nowrap"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Upgrade to {targetPlanConfig.name}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <Card className={`border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{promptInfo.title}</CardTitle>
              <CardDescription>{promptInfo.message}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">{targetPlanConfig.name}</p>
              <p className="text-sm text-gray-500">{targetPlanConfig.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">${targetPlanConfig.price}</p>
              <p className="text-xs text-gray-500">{targetPlanConfig.priceNote}</p>
            </div>
          </div>

          {targetPlanConfig.extras.length > 0 && (
            <ul className="space-y-1 mb-4">
              {targetPlanConfig.extras.map((extra, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                >
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  {extra}
                </li>
              ))}
            </ul>
          )}

          <Button onClick={handleUpgradeClick} className="w-full gap-2">
            <ArrowUpCircle className="w-4 h-4" />
            Upgrade Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inline variant (default)
  return (
    <div className={`flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full flex-shrink-0">
        <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white text-sm">
          {promptInfo.title}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Upgrade to {targetPlanConfig.name} (${targetPlanConfig.price}{targetPlanConfig.priceNote})
        </p>
      </div>
      <Button size="sm" onClick={handleUpgradeClick} className="flex-shrink-0 gap-1">
        <ArrowUpCircle className="w-3 h-3" />
        Upgrade
      </Button>
    </div>
  );
}

export default UpgradePrompt;
