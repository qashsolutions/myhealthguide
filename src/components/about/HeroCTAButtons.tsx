'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function HeroCTAButtons() {
  const { user, loading } = useAuth();

  // Check if user is subscribed (has stripeSubscriptionId or is in active trial with subscription)
  const isSubscribed = user && (
    user.subscriptionStatus === 'active' ||
    (user.subscriptionStatus === 'trial' && user.stripeSubscriptionId)
  );

  if (loading) {
    // Show skeleton while loading
    return (
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (isSubscribed) {
    // User is subscribed - show dashboard button
    return (
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link
          href="/dashboard"
          className="rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/dashboard/settings"
          className="text-base font-semibold leading-6 text-gray-900 dark:text-white hover:text-blue-600"
        >
          Manage Subscription <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (user) {
    // User is logged in but not subscribed - show centered dashboard button
    // (Subscribe option is available in the pricing section below)
    return (
      <div className="mt-10 flex justify-center">
        <Link
          href="/dashboard"
          className="rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // User is not logged in - show trial/signup buttons
  return (
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Link
        href="/signup"
        className="rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
      >
        Start Your 45-Day Free Trial
      </Link>
      <Link
        href="/pricing"
        className="text-base font-semibold leading-6 text-gray-900 dark:text-white hover:text-blue-600"
      >
        View Plans <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
