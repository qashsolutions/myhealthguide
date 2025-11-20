'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, CreditCard, Clock, X } from 'lucide-react';

interface TrialExpirationGateProps {
  children: React.ReactNode;
  featureName?: string;
}

/**
 * Trial Expiration Gate Component
 *
 * Blocks access to features when trial has expired.
 * Shows users two options:
 * 1. Subscribe to continue using the app
 * 2. Export data and delete account (48-hour grace period)
 *
 * @param children - The protected content to render if trial is active
 * @param featureName - Optional name of the feature being protected
 */
export function TrialExpirationGate({ children, featureName }: TrialExpirationGateProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [gracePeriodHours, setGracePeriodHours] = useState<number | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login');
    }

    // Calculate grace period remaining hours
    if (user && user.subscriptionStatus === 'expired' && user.gracePeriodEndDate) {
      const calculateHoursRemaining = () => {
        const now = new Date();
        const endDate = new Date(user.gracePeriodEndDate!);
        const diffMs = endDate.getTime() - now.getTime();
        const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
        setGracePeriodHours(hours);
      };

      calculateHoursRemaining();
      // Update every minute
      const interval = setInterval(calculateHoursRemaining, 60000);
      return () => clearInterval(interval);
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Check subscription status
  const isActive = user.subscriptionStatus === 'active';
  const isTrial = user.subscriptionStatus === 'trial';
  const isExpired = user.subscriptionStatus === 'expired';

  // Allow access if active subscription or trial
  if (isActive || isTrial) {
    return <>{children}</>;
  }

  // Trial expired - show payment/export options
  if (isExpired) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-red-900 dark:text-red-100">
                  Your Trial Has Expired
                </CardTitle>
                <CardDescription>
                  Subscribe now to continue using {featureName || 'this feature'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grace Period Countdown */}
            {gracePeriodHours !== null && gracePeriodHours > 0 && (
              <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    {gracePeriodHours} hours remaining
                  </p>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Your data will be permanently deleted after the grace period ends.
                  </p>
                </div>
              </div>
            )}

            {gracePeriodHours === 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Grace period has ended
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Your data is scheduled for deletion. Subscribe immediately to prevent data loss.
                  </p>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Option 1: Subscribe */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Continue with Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Keep all your data and features:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      <li>All elders and medication data</li>
                      <li>Complete history and logs</li>
                      <li>AI-powered insights</li>
                      <li>Unlimited storage</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <p className="text-2xl font-bold text-blue-600 mb-1">$4.99/month</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Family Plan - Up to 2 elders
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/pricing')}
                    className="w-full"
                    size="lg"
                  >
                    Subscribe Now
                  </Button>
                </CardContent>
              </Card>

              {/* Option 2: Export & Delete */}
              <Card className="border-2 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="w-5 h-5 text-gray-600" />
                    Export Data & Delete Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Download all your data:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      <li>Complete health records (JSON)</li>
                      <li>PDF reports for each elder</li>
                      <li>Medication logs and history</li>
                      <li>Diet and supplement records</li>
                    </ul>
                  </div>
                  <div className="pt-2 text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-red-600 dark:text-red-400 mb-1">
                      ⚠️ Warning
                    </p>
                    <p>
                      This will permanently delete your account and all data within {gracePeriodHours || 0} hours.
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/dashboard/export-all')}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Export My Data
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Additional Info */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-4 border-t">
              <p>
                Questions?{' '}
                <a href="mailto:support@myguide.health" className="text-blue-600 hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Canceled or other status - block access
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need an active subscription to access this feature.
          </p>
          <Button onClick={() => router.push('/pricing')} size="lg">
            View Pricing Plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
