'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
      <Alert className="mb-4 bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <AlertDescription className="text-red-900 dark:text-red-100">
              <strong className="font-bold">
                ⚠️ Your trial has expired - {gracePeriodHours} hours remaining
              </strong>
              <p className="mt-1 text-sm">
                All your data will be permanently deleted when the grace period ends.
                Subscribe now to keep your data or export it before it's deleted.
              </p>
            </AlertDescription>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={() => router.push('/pricing')}
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
              Export Data
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // Trial expiring - show warnings based on days remaining
  if (user.subscriptionStatus === 'trial' && daysRemaining !== null) {
    // Only show warnings at 3 days, 1 day, and 0 days
    if (daysRemaining > 3) return null;

    let severity: 'warning' | 'urgent' | 'critical' = 'warning';
    let Icon = Clock;
    let bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
    let borderColor = 'border-yellow-300 dark:border-yellow-700';
    let textColor = 'text-yellow-900 dark:text-yellow-100';
    let title = '';
    let message = '';

    if (daysRemaining === 0) {
      severity = 'critical';
      Icon = AlertTriangle;
      bgColor = 'bg-orange-50 dark:bg-orange-900/20';
      borderColor = 'border-orange-300 dark:border-orange-700';
      textColor = 'text-orange-900 dark:text-orange-100';
      title = '🚨 Your trial expires tonight at midnight!';
      message = 'Subscribe now or export your data. It will be deleted 48 hours after expiration.';
    } else if (daysRemaining === 1) {
      severity = 'urgent';
      Icon = AlertTriangle;
      bgColor = 'bg-orange-50 dark:bg-orange-900/20';
      borderColor = 'border-orange-300 dark:border-orange-700';
      textColor = 'text-orange-900 dark:text-orange-100';
      title = '⚠️ Your trial ends tomorrow!';
      message = 'Subscribe now to keep all your health data and continue using all features.';
    } else if (daysRemaining <= 3) {
      severity = 'warning';
      title = `⏰ Your trial ends in ${daysRemaining} days`;
      message = 'Subscribe now to continue tracking your health and accessing AI features.';
    }

    return (
      <Alert className={`mb-4 ${bgColor} ${borderColor}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${textColor.replace('text-', 'text-').replace('dark:', '')} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <AlertDescription className={textColor}>
              <strong className="font-bold">{title}</strong>
              <p className="mt-1 text-sm">{message}</p>
            </AlertDescription>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={() => router.push('/pricing')}
              size="sm"
              variant={severity === 'critical' ? 'destructive' : 'default'}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Subscribe
            </Button>
            <Button
              onClick={() => setDismissed(true)}
              size="sm"
              variant="ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
}
