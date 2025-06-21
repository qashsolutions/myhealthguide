'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { withAuth, useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

/**
 * User dashboard page with feature cards
 * Protected route requiring authentication
 */
function DashboardPage() {
  const router = useRouter();
  const { user, disclaimerAccepted } = useAuth();

  // Check if user needs to accept disclaimer
  React.useEffect(() => {
    if (user && !disclaimerAccepted) {
      router.push(ROUTES.MEDICAL_DISCLAIMER);
    }
  }, [user, disclaimerAccepted, router]);

  const handleFeatureClick = (featureId: string) => {
    switch (featureId) {
      case 'medication-check':
        router.push(ROUTES.MEDICATION_CHECK);
        break;
      case 'health-qa':
        router.push(ROUTES.HEALTH_QA);
        break;
      case 'account':
        router.push(ROUTES.ACCOUNT);
        break;
      default:
        break;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Welcome message */}
      <div className="mb-8">
        <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-3">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-elder-lg text-elder-text-secondary">
          What would you like to do today?
        </p>
      </div>

      {/* Feature cards grid */}
      <DashboardGrid onFeatureClick={handleFeatureClick} />

      {/* Recent activity (future enhancement) */}
      <div className="mt-12 p-6 bg-elder-background-alt rounded-elder-lg">
        <h2 className="text-elder-xl font-semibold mb-4">
          Quick Tips for Today
        </h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-health-safe text-elder-lg">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Remember to take medications with food if recommended by your doctor
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600 text-elder-lg">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Keep a list of all your medications to share with healthcare providers
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-health-warning text-elder-lg">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Set reminders for medications that need to be taken at specific times
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Export with authentication HOC
export default withAuth(DashboardPage, { requireDisclaimer: true });