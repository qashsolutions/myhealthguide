'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgencyDashboard } from '@/components/agency/AgencyDashboard';
import { CaregiverAssignmentManager } from '@/components/agency/CaregiverAssignmentManager';
import { AgencyAnalyticsDashboard } from '@/components/agency/analytics/AgencyAnalyticsDashboard';
import { AgencyBillingDashboard } from '@/components/agency/billing/AgencyBillingDashboard';
import { ShiftSchedulingCalendar } from '@/components/agency/scheduling';
import { Building2, Users, BarChart3, DollarSign, CalendarDays } from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AgencyPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMultiAgency, setIsMultiAgency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Get user's agency
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check subscription tier
          const subscriptionTier = userData.subscriptionTier || 'family';
          setIsMultiAgency(subscriptionTier === 'multi_agency');

          // Get first agency (user might belong to multiple)
          if (userData.agencies && userData.agencies.length > 0) {
            const agencyMembership = userData.agencies[0];
            setAgencyId(agencyMembership.agencyId);

            // Check if super admin
            const agency = await AgencyService.getAgency(agencyMembership.agencyId);
            if (agency) {
              setIsSuperAdmin(agency.superAdminId === user.uid);

              // Get first group in agency
              if (agency.groupIds.length > 0) {
                setGroupId(agency.groupIds[0]);
              }
            }
          } else if (userData.groups && userData.groups.length > 0) {
            // Fallback: get agency from group
            const groupMembership = userData.groups[0];
            setGroupId(groupMembership.groupId);

            const groupDoc = await getDoc(doc(db, 'groups', groupMembership.groupId));
            if (groupDoc.exists()) {
              const groupData = groupDoc.data();
              if (groupData.agencyId) {
                setAgencyId(groupData.agencyId);

                const agency = await AgencyService.getAgency(groupData.agencyId);
                if (agency) {
                  setIsSuperAdmin(agency.superAdminId === user.uid);
                }
              }
            }
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading agency...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Signed In</CardTitle>
          <CardDescription>Please sign in to access the agency dashboard</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!agencyId || !groupId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Agency Found</CardTitle>
          <CardDescription>
            You are not part of any agency yet. Create your first group to get started.
          </CardDescription>
        </CardHeader>
        <div className="p-6">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          Agency Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isSuperAdmin ? 'Manage your agency, caregivers, and assignments' : 'View your agency information and assignments'}
        </p>
      </div>

      {isSuperAdmin ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full ${isMultiAgency ? 'grid-cols-5' : 'grid-cols-3'} lg:w-auto`}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Scheduling</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            {isMultiAgency && (
              <>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Billing</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AgencyDashboard userId={userId} agencyId={agencyId} />
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <ShiftSchedulingCalendar
              agencyId={agencyId}
              groupId={groupId}
              userId={userId}
            />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <CaregiverAssignmentManager
              agencyId={agencyId}
              groupId={groupId}
              userId={userId}
            />
          </TabsContent>

          {isMultiAgency && (
            <>
              <TabsContent value="analytics" className="space-y-6">
                <AgencyAnalyticsDashboard agencyId={agencyId} />
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <AgencyBillingDashboard agencyId={agencyId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      ) : (
        <AgencyDashboard userId={userId} agencyId={agencyId} />
      )}
    </div>
  );
}
