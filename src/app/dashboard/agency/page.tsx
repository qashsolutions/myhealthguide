'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgencyDashboard } from '@/components/agency/AgencyDashboard';
import { CaregiverAssignmentManager } from '@/components/agency/CaregiverAssignmentManager';
import { AgencyAnalyticsDashboard } from '@/components/agency/analytics/AgencyAnalyticsDashboard';
import { AgencyBillingDashboard } from '@/components/agency/billing/AgencyBillingDashboard';
import { WeekStripSchedule } from '@/components/agency/schedule';
import { Building2, Users, BarChart3, DollarSign, CalendarDays } from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AgencyPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Feature tracking
  useFeatureTracking('agency_management');

  const [userId, setUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMultiAgency, setIsMultiAgency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam && ['overview', 'scheduling', 'assignments', 'analytics', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Get user's agency
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Smart agency selection based on role and subscription tier
          // Priority: 1) Multi-agency where user is super_admin
          //           2) Multi-agency where user is caregiver
          //           3) Personal family agency
          if (userData.agencies && userData.agencies.length > 0) {
            let selectedAgency: any = null;
            let selectedMembership: any = null;

            // Load all agencies to check their tiers
            const agencyPromises = userData.agencies.map(async (membership: any) => {
              const agency = await AgencyService.getAgency(membership.agencyId);
              return { membership, agency };
            });
            const agencyResults = await Promise.all(agencyPromises);

            // Priority 1: Find multi_agency where user is super_admin
            for (const { membership, agency } of agencyResults) {
              if (agency && agency.subscription?.tier === 'multi_agency' && agency.superAdminId === user.uid) {
                selectedAgency = agency;
                selectedMembership = membership;
                break;
              }
            }

            // Priority 2: Find multi_agency where user is caregiver (not super_admin)
            if (!selectedAgency) {
              for (const { membership, agency } of agencyResults) {
                if (agency && agency.subscription?.tier === 'multi_agency' && membership.role === 'caregiver') {
                  selectedAgency = agency;
                  selectedMembership = membership;
                  break;
                }
              }
            }

            // Priority 3: Fall back to first agency (personal family agency)
            if (!selectedAgency) {
              const firstResult = agencyResults[0];
              if (firstResult?.agency) {
                selectedAgency = firstResult.agency;
                selectedMembership = firstResult.membership;
              }
            }

            if (selectedAgency) {
              setAgencyId(selectedAgency.id);
              setIsSuperAdmin(selectedAgency.superAdminId === user.uid);
              setIsMultiAgency(selectedAgency.subscription?.tier === 'multi_agency');

              // Get first group in agency
              if (selectedAgency.groupIds?.length > 0) {
                setGroupId(selectedAgency.groupIds[0]);
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
                  setIsMultiAgency(agency.subscription?.tier === 'multi_agency');
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <WeekStripSchedule
              agencyId={agencyId}
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
