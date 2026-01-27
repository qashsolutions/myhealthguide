'use client';

/**
 * SAFETY ALERTS PAGE - DISABLED FOR FAMILY PLAN A/B (Jan 27, 2026)
 *
 * This page has been disabled for Family Plan A and Family Plan B users.
 *
 * REASON FOR DISABLING:
 * Safety Alerts features (Drug Interactions, Schedule Conflicts, Incident Reports,
 * Dementia Screening) are designed for professional caregiving contexts:
 *
 * 1. Drug Interactions - Requires FDA database integration and pharmacist-level review.
 *    Family members caring for 1 loved one should consult their pharmacist directly.
 *
 * 2. Schedule Conflicts - Relevant when multiple caregivers coordinate shifts.
 *    Family Plan A/B has only 1 caregiver (the admin), no scheduling conflicts possible.
 *
 * 3. Incident Reports - Professional documentation for agency compliance/liability.
 *    Family members don't need formal incident tracking for home care.
 *
 * 4. Dementia Screening - Requires clinical protocols and professional interpretation.
 *    Family members should use their healthcare provider's assessments.
 *
 * WHO CAN ACCESS:
 * - Multi-Agency caregivers (Plan C) - managing 3 elders/day with professional oversight
 *
 * WHO IS REDIRECTED:
 * - Family Plan A users → /dashboard/insights
 * - Family Plan B users → /dashboard/insights
 * - Agency owners → /dashboard/agency (already hidden - different reason)
 *
 * WHAT FAMILY PLAN USERS HAVE INSTEAD:
 * - /dashboard/insights - Health Trends, Clinical Notes, unified Health Reports
 * - /dashboard/medications - Medication management with reminders
 * - Daily email reports with health summaries
 *
 * TO RE-ENABLE FOR FAMILY PLANS:
 * 1. Remove the redirect useEffect for !isMultiAgency below
 * 2. Add nav items back in IconRail.tsx and MoreMenuDrawer.tsx
 * 3. Update CLAUDE.md to remove from Disabled Features section
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function SafetyAlertsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();
  const userIsSuperAdmin = isSuperAdmin(user);

  useEffect(() => {
    // Family Plan A/B users: redirect to Insights (Jan 27, 2026)
    // Safety Alerts features are not relevant for simple family care scenarios
    if (!isMultiAgency) {
      router.replace('/dashboard/insights');
      return;
    }

    // Agency owners: redirect to Agency dashboard (Jan 26, 2026)
    // Per-elder safety monitoring is caregiver's responsibility, not owner's
    if (isMultiAgency && userIsSuperAdmin) {
      router.replace('/dashboard/agency');
      return;
    }

    // Multi-Agency caregivers: can access this page (no redirect)
  }, [isMultiAgency, userIsSuperAdmin, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

/*
 * ============================================================================
 * ORIGINAL SAFETY ALERTS PAGE CODE (DISABLED Jan 27, 2026)
 * ============================================================================
 *
 * Preserved below for reference. See comments above for reason.
 * This code was functional for Multi-Agency caregivers managing multiple elders.
 *

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { useTabTracking } from '@/hooks/useFeatureTracking';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Pill,
  Clock,
  Brain,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type TabType = 'all' | 'interactions' | 'conflicts' | 'incidents' | 'screening';

function SafetyAlertsContent() {
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

  const activeTab = (searchParams.get('tab') as TabType) || 'all';

  useTabTracking('safety_alerts', activeTab, {
    all: 'safety_alerts',
    interactions: 'safety_alerts_interactions',
    conflicts: 'safety_alerts_conflicts',
    incidents: 'safety_alerts_incidents',
    screening: 'safety_alerts_screening',
  });

  const [loading, setLoading] = useState(false);

  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/safety-alerts?tab=${tab}`, { scroll: false });
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Alerts', icon: AlertTriangle },
    { id: 'interactions', label: 'Drug Interactions', icon: Pill },
    { id: 'conflicts', label: 'Schedule Conflicts', icon: Clock },
    { id: 'incidents', label: 'Incidents', icon: FileText },
    { id: 'screening', label: 'Screening', icon: Brain },
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
    const isCaregiverRole = user?.agencies?.[0]?.role === 'caregiver';

    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        {hasNoElders && isCaregiverRole ? (
          <>
            <h3 className="text-lg font-semibold mb-2">No Loved Ones Assigned Yet</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Your agency administrator will assign loved ones to you.
            </p>
          </>
        ) : hasNoElders ? (
          <>
            <h3 className="text-lg font-semibold mb-2">No Loved Ones Found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Add a loved one to your care group to start monitoring safety alerts.
            </p>
          </>
        ) : (
          <p className="text-gray-600">
            Please select a loved one from the header to view safety alerts.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Safety Alerts</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor drug interactions, schedule conflicts, incidents, and cognitive screening for {selectedElder.name}
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
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      // ... AlertSection components for Drug Interactions, Schedule Conflicts,
      // Incident Reports, and Dementia Screening were rendered here.
      // Each linked to their respective detail pages.

      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Important:</strong> Safety alerts are automatically generated based on logged data
            and FDA information. Always consult with healthcare professionals for medical decisions.
          </div>
        </div>
      </Card>
    </div>
  );
}

function AlertSection({ title, icon: Icon, description, linkHref, linkText, color }) {
  // Card component for each alert type
  // Displayed: Drug Interactions, Schedule Conflicts, Incident Reports, Dementia Screening
}

export default function SafetyAlertsPage() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin" />}>
      <SafetyAlertsContent />
    </Suspense>
  );
}

*/
