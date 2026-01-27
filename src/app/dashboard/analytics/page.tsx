'use client';

/**
 * ANALYTICS PAGE - DISABLED (Jan 27, 2026)
 *
 * This page has been disabled because it was redundant with /dashboard/insights.
 *
 * REASON FOR DISABLING:
 * - Analytics was a "navigation hub" that just linked to other pages
 * - All functionality is now available directly in /dashboard/insights:
 *   - Health Trends tab: Shows compliance charts, weekly summaries, AI insights
 *   - Clinical Notes tab: Generates doctor visit preparation documents
 *   - Reports tab: Unified medication adherence + nutrition analysis in one report
 * - The Smart Feedback dashboard (only unique feature) was rarely used
 *
 * WHAT WAS IN ANALYTICS:
 * - Overview tab: Links to medication adherence, nutrition, health trends
 * - Medication Adherence tab: Link to /medication-adherence page
 * - Nutrition tab: Link to /nutrition-analysis page
 * - Health Trends tab: Link to /insights page
 * - Smart Feedback tab: FeedbackDashboard component
 *
 * TO RE-ENABLE:
 * 1. Restore the commented code below
 * 2. Add nav items back in:
 *    - src/components/navigation/IconRail.tsx
 *    - src/components/navigation/MoreMenuDrawer.tsx
 * 3. Update CLAUDE.md to remove from Disabled Features section
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all users to Insights page
    router.replace('/dashboard/insights');
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

/*
 * ============================================================================
 * ORIGINAL ANALYTICS PAGE CODE (DISABLED Jan 27, 2026)
 * ============================================================================
 *
 * Preserved below for reference. See comments above for reason.
 *

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { useTabTracking } from '@/hooks/useFeatureTracking';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Pill,
  Apple,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronRight,
  Calendar,
  MessageSquareText,
} from 'lucide-react';
import { FeedbackDashboard } from '@/components/feedback/FeedbackDashboard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type TabType = 'overview' | 'adherence' | 'nutrition' | 'trends' | 'feedback';

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder, availableElders, isLoading: eldersLoading } = useElder();
  const { isMultiAgency } = useSubscription();
  const userIsSuperAdmin = isSuperAdmin(user);

  useEffect(() => {
    if (isMultiAgency && userIsSuperAdmin) {
      router.replace('/dashboard/agency');
    }
  }, [isMultiAgency, userIsSuperAdmin, router]);

  const activeTab = (searchParams.get('tab') as TabType) || 'overview';

  useTabTracking('analytics', activeTab, {
    overview: 'analytics',
    adherence: 'analytics_adherence',
    nutrition: 'analytics_nutrition',
    trends: 'analytics_trends',
    feedback: 'analytics',
  });

  const [loading, setLoading] = useState(false);

  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/analytics?tab=${tab}`, { scroll: false });
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'adherence', label: 'Medication Adherence', icon: Pill },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'trends', label: 'Health Trends', icon: TrendingUp },
    { id: 'feedback', label: 'Smart Feedback', icon: MessageSquareText },
  ];

  if (eldersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedElder) {
    const hasNoElders = availableElders.length === 0;
    const isCaregiverRole = user?.agencies?.[0]?.role === 'caregiver' || user?.agencies?.[0]?.role === 'caregiver_admin';

    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        {hasNoElders && isCaregiverRole ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Loved Ones Assigned Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Your agency administrator will assign loved ones to you.
            </p>
          </>
        ) : hasNoElders ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Loved Ones Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Add a loved one to your care group to start tracking their health analytics.
            </p>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            Please select a loved one from the header to view analytics.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Health trends and compliance analytics for {selectedElder.name}
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      // ... Tab content was here (Overview, Adherence, Nutrition, Trends, Feedback)
      // All this functionality is now in /dashboard/insights
    </div>
  );
}

function AnalyticsCard({ title, description, icon: Icon, linkHref, color }) {
  // Card component for linking to other pages
  // No longer needed - insights page shows data inline
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin" />}>
      <AnalyticsContent />
    </Suspense>
  );
}

*/
