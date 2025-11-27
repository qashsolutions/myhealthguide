'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Verification Banner
 *
 * Shows a banner prompting users to verify their email and/or phone.
 * All verification actions redirect to /verify which is the single
 * source of truth for verification flows.
 */
export function VerificationBanner() {
  const router = useRouter();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (user && (!user.emailVerified || !user.phoneVerified)) {
      const dismissedTime = localStorage.getItem('verificationBannerDismissed');
      if (dismissedTime) {
        const dismissedDate = new Date(dismissedTime);
        const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceDismissed < 24) {
          setDismissed(true);
          return;
        }
      }
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('verificationBannerDismissed', new Date().toISOString());
    setDismissed(true);
    setShowBanner(false);
  };

  const handleVerify = () => {
    router.push('/verify');
  };

  if (!showBanner || dismissed || !user) {
    return null;
  }

  const needsEmail = !user.emailVerified;
  const needsPhone = !user.phoneVerified;

  // Determine the message to show
  let title = '';
  let subtitle = '';

  if (needsEmail && needsPhone) {
    title = 'Please verify your email and phone number';
    subtitle = 'Required for account security, emergency alerts, and legal notices';
  } else if (needsEmail) {
    title = 'Please verify your email address';
    subtitle = 'Required for account recovery and legal notices';
  } else if (needsPhone) {
    title = 'Please verify your phone number';
    subtitle = 'Required for emergency alerts and prescription reminders';
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {title}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleVerify}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Verify now
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
