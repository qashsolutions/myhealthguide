'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CreditCard, Download, X } from 'lucide-react';

/**
 * Trial Expiration Banner
 *
 * Shows warning messages when trial is expiring:
 * - 3 days before: Gentle reminder
 * - 1 day before: Urgent warning
 * - Day of expiration: Critical alert
 * - During grace period: Final countdown
 */
export function TrialExpirationBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [gracePeriodHours, setGracePeriodHours] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Calculate days remaining in trial
    if (user.subscriptionStatus === 'trial' && user.trialEndDate) {
      const calculateDays = () => {
        const now = new Date();
        const endDate = new Date(user.trialEndDate!);
        const diffMs = endDate.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, days));
      };

      calculateDays();
      const interval = setInterval(calculateDays, 60000); // Update every minute
      return () => clearInterval(interval);
    }

    // Calculate grace period hours remaining
    if (user.subscriptionStatus === 'expired' && user.gracePeriodEndDate) {
      const calculateHours = () => {
        const now = new Date();
        const endDate = new Date(user.gracePeriodEndDate!);
        const diffMs = endDate.getTime() - now.getTime();
        const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
        setGracePeriodHours(hours);
      };

      calculateHours();
      const interval = setInterval(calculateHours, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;
  if (dismissed) return null;
  if (user.subscriptionStatus === 'active') return null;

  // Grace period - critical alert
  if (user.subscriptionStatus === 'expired' && gracePeriodHours !== null) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-300 dark:border-red-700">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Your trial has expired - {gracePeriodHours} hours remaining
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  All your data will be permanently deleted when the grace period ends.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => router.push('/dashboard/settings?tab=subscription')}
                size="sm"
                variant="destructive"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Subscribe
              </Button>
              <Button
                onClick={() => router.push('/dashboard/export-all')}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expiring - show warnings based on days remaining
  if (user.subscriptionStatus === 'trial' && daysRemaining !== null) {
    // Only show warnings at 3 days, 1 day, and 0 days
    if (daysRemaining > 3) return null;

    let severity: 'warning' | 'urgent' | 'critical' = 'warning';
    let Icon = Clock;
    let bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
    let borderColor = 'border-b border-yellow-300 dark:border-yellow-700';
    let textColor = 'text-yellow-900 dark:text-yellow-100';
    let subTextColor = 'text-yellow-700 dark:text-yellow-300';
    let title = '';
    let message = '';

    if (daysRemaining === 0) {
      severity = 'critical';
      Icon = AlertTriangle;
      bgColor = 'bg-orange-50 dark:bg-orange-900/20';
      borderColor = 'border-b border-orange-300 dark:border-orange-700';
      textColor = 'text-orange-900 dark:text-orange-100';
      subTextColor = 'text-orange-700 dark:text-orange-300';
      title = 'Your trial expires tonight at midnight!';
      message = 'Subscribe now or export your data. It will be deleted 48 hours after expiration.';
    } else if (daysRemaining === 1) {
      severity = 'urgent';
      Icon = AlertTriangle;
      bgColor = 'bg-orange-50 dark:bg-orange-900/20';
      borderColor = 'border-b border-orange-300 dark:border-orange-700';
      textColor = 'text-orange-900 dark:text-orange-100';
      subTextColor = 'text-orange-700 dark:text-orange-300';
      title = 'Your trial ends tomorrow!';
      message = 'Subscribe now to keep all your health data and continue using all features.';
    } else if (daysRemaining <= 3) {
      severity = 'warning';
      title = `Your trial ends in ${daysRemaining} days`;
      message = 'Subscribe now to continue tracking your health and accessing AI features.';
    }

    return (
      <div className={`${bgColor} ${borderColor}`}>
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={`w-5 h-5 ${textColor} flex-shrink-0`} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${textColor}`}>{title}</p>
                <p className={`text-xs ${subTextColor} mt-0.5`}>{message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => router.push('/dashboard/settings?tab=subscription')}
                size="sm"
                variant={severity === 'critical' ? 'destructive' : 'default'}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Subscribe
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className={`p-1 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors`}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
