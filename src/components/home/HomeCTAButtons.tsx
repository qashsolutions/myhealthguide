'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeCTAButtons() {
  const { user, loading } = useAuth();

  // Check if user is subscribed (has stripeSubscriptionId or is in active trial with subscription)
  const isSubscribed = user && (
    user.subscriptionStatus === 'active' ||
    (user.subscriptionStatus === 'trial' && user.stripeSubscriptionId)
  );

  if (loading) {
    // Show skeleton while loading
    return (
      <>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <div className="h-12 w-52 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No credit card required • Cancel anytime • US-based support
        </p>
      </>
    );
  }

  if (isSubscribed) {
    // User is subscribed - show dashboard button
    return (
      <>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8">
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="outline" size="lg" className="text-lg px-8">
              Manage Subscription
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-green-600 dark:text-green-400">
          You&apos;re subscribed! Thank you for being a member.
        </p>
      </>
    );
  }

  if (user) {
    // User is logged in but not subscribed (free trial without payment)
    return (
      <>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/pricing">
            <Button size="lg" className="text-lg px-8">
              Subscribe Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="text-lg px-8">
              Go to Dashboard
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          You&apos;re on a free trial • Subscribe to unlock all features
        </p>
      </>
    );
  }

  // User is not logged in - show trial/signup buttons
  return (
    <>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link href="/signup">
          <Button size="lg" className="text-lg px-8">
            Start 15-Day Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link href="/features">
          <Button variant="outline" size="lg" className="text-lg px-8">
            Learn More
          </Button>
        </Link>
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        No credit card required • Cancel anytime • US-based support
      </p>
    </>
  );
}
