'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute Component
 *
 * Protects dashboard routes by checking:
 * 1. User is authenticated (logged in)
 * 2. User has active trial OR valid subscription
 * 3. If trial expired and no subscription -> redirect to upgrade
 *
 * Usage: Wrap around dashboard layout
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check while still loading auth state
    if (loading) return;

    // User not authenticated -> redirect to login
    if (!user) {
      // Save the intended destination to redirect back after login
      const returnUrl = encodeURIComponent(pathname || '/dashboard');
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // Check trial and subscription status
    const subscriptionStatus = user.subscriptionStatus;
    const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
    const now = new Date();

    console.log('🔒 [PROTECTED-ROUTE] Checking access for user:', user.id);
    console.log('🔒 [PROTECTED-ROUTE] Subscription status:', subscriptionStatus);
    console.log('🔒 [PROTECTED-ROUTE] Trial end date (raw):', user.trialEndDate);
    console.log('🔒 [PROTECTED-ROUTE] Trial end date (converted):', trialEndDate);
    console.log('🔒 [PROTECTED-ROUTE] Current time:', now);

    // Calculate if trial is still active
    const isTrialActive = trialEndDate && trialEndDate > now;

    // User has active subscription
    const hasActiveSubscription = subscriptionStatus === 'active';

    // Check if user has access
    const hasAccess = isTrialActive || hasActiveSubscription;

    console.log('🔒 [PROTECTED-ROUTE] Is trial active?', isTrialActive);
    console.log('🔒 [PROTECTED-ROUTE] Has active subscription?', hasActiveSubscription);
    console.log('🔒 [PROTECTED-ROUTE] Has access?', hasAccess);

    if (!hasAccess) {
      // Trial expired and no subscription -> redirect to upgrade/pricing
      if (subscriptionStatus === 'expired' || subscriptionStatus === 'canceled') {
        router.push('/pricing?upgrade=true&reason=trial_expired');
        return;
      }

      // No trial and no subscription (shouldn't happen, but handle it)
      router.push('/pricing?upgrade=true&reason=no_access');
      return;
    }

    // User has access - do nothing, let them through
  }, [user, loading, router, pathname]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> show loading while redirecting
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check trial/subscription
  const subscriptionStatus = user.subscriptionStatus;
  const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
  const now = new Date();
  const isTrialActive = trialEndDate && trialEndDate > now;
  const hasActiveSubscription = subscriptionStatus === 'active';
  const hasAccess = isTrialActive || hasActiveSubscription;

  // No access -> show loading while redirecting
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to upgrade...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and has access -> render children
  return <>{children}</>;
}
