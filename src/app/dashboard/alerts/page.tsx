'use client';

/**
 * ALERTS PAGE - HIDDEN FOR AGENCY OWNERS (Jan 26, 2026)
 *
 * This page shows group-based alerts using the AlertCenter component.
 * It is NOT shown for multi-agency owners (super admins) because:
 * 1. Agency owners have `user.agencies`, not `user.groups` - so groupId is always undefined
 * 2. The page would just show "No group found" which is not useful
 * 3. Agency owners get notifications via other channels:
 *    - Bell icon in header (user_notifications collection)
 *    - Dashboard Today's Shifts card (shift-related alerts)
 *    - Caregiver Burnout page (team health monitoring)
 *
 * WHO CAN ACCESS:
 * - Family Plan users (Plan A, Plan B) - for their group alerts
 * - Agency caregivers - for their assigned elders' alerts
 *
 * TO RE-ENABLE FOR AGENCY OWNERS:
 * 1. Remove the redirect useEffect below
 * 2. Update care-management/page.tsx to add Alerts back to ownerOnlyFeatures
 * 3. Consider building an agency-wide alerts view that queries by agencyId instead of groupId
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/lib/subscription';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import { AlertCenter } from '@/components/alerts/AlertCenter';
import { Card } from '@/components/ui/card';

export default function AlertsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMultiAgency } = useSubscription();
  const userIsSuperAdmin = isSuperAdmin(user);

  // REDIRECT: Agency owners should use /dashboard/agency instead (Jan 26, 2026)
  // The alerts page uses group-based queries which don't work for agency owners.
  useEffect(() => {
    if (isMultiAgency && userIsSuperAdmin) {
      router.replace('/dashboard/agency');
    }
  }, [isMultiAgency, userIsSuperAdmin, router]);

  // Get active group from user (assuming first group for now)
  const groupId = user?.groups?.[0]?.groupId;

  if (!groupId) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No group found. Please join or create a group first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AlertCenter groupId={groupId} />
    </div>
  );
}
