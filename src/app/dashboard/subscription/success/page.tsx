'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  // Check if user has active subscription (not trial)
  const isActive = user?.subscriptionStatus === 'active';
  const isOnTrial = user?.subscriptionStatus === 'trial';

  // Poll for subscription status update from Stripe webhook
  const checkSubscriptionStatus = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    // Poll for subscription status update
    // Stripe webhook may take a moment to process
    const pollForUpdate = async () => {
      await checkSubscriptionStatus();

      // If still on trial after refresh, retry a few times
      // (webhook may not have processed yet)
      if (retryCount < maxRetries) {
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000); // Check every 2 seconds
        return () => clearTimeout(timer);
      } else {
        // After max retries, stop loading regardless
        setLoading(false);
      }
    };

    pollForUpdate();
  }, [retryCount, checkSubscriptionStatus]);

  // Stop loading once we detect active subscription
  useEffect(() => {
    if (isActive) {
      setLoading(false);
    }
  }, [isActive]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Activating your subscription...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                This may take a few seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
          <CardTitle className="text-center text-3xl">
            Welcome to MyGuide Health!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Your subscription has been successfully activated.
            </p>
            {isOnTrial ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>🎉 You&apos;re on a 45-day free trial!</strong>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
                  Your trial ends in 45 days. You won&apos;t be charged until then. Cancel anytime
                  during the trial period for a full refund.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  <strong>✓ Your subscription is now active!</strong>
                </p>
                <p className="text-sm text-green-700 dark:text-green-200 mt-2">
                  You have full access to all features. Your subscription will renew automatically each month.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What&apos;s next?</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Add your first elder to start tracking their health
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Invite family members or caregivers to collaborate
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Enable AI health insights and medication tracking
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1"
              size="lg"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => router.push('/dashboard/settings')}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Manage Subscription
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 dark:text-gray-500 pt-2">
            A confirmation email has been sent to your registered email address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
