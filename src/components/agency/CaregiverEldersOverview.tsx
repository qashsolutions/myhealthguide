'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Users, AlertCircle } from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { Elder, CaregiverAssignment } from '@/types';
import { CaregiverEldersCard } from './CaregiverEldersCard';
import { UnassignedEldersSection } from './UnassignedEldersSection';
import { AssignElderDialog } from './AssignElderDialog';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface CaregiverWithElders {
  id: string;
  name: string;
  role: 'caregiver_admin' | 'caregiver';
  elders: Elder[];
  elderCount: number;
}

interface CaregiverEldersOverviewProps {
  agencyId: string;
  groupId: string;
  userId: string;
  maxEldersPerCaregiver?: number;
  isSuperAdmin: boolean;
}

export function CaregiverEldersOverview({
  agencyId,
  groupId,
  userId,
  maxEldersPerCaregiver = 3,
  isSuperAdmin
}: CaregiverEldersOverviewProps) {
  const [caregiversWithElders, setCaregiversWithElders] = useState<CaregiverWithElders[]>([]);
  const [unassignedElders, setUnassignedElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedElder, setSelectedElder] = useState<{ id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Get assignments and elders grouped by caregiver
      const [assignments, { caregiverElders, unassignedElders: unassigned }] = await Promise.all([
        AgencyService.getAgencyAssignments(agencyId),
        AgencyService.getEldersByCaregiver(agencyId)
      ]);

      // Fetch ALL caregiver profiles for this agency (not just those with assignments)
      // This ensures newly approved caregivers appear in the dropdown
      const profilesQuery = query(
        collection(db, 'caregiver_profiles'),
        where('agencyId', '==', agencyId)
      );
      const profilesSnapshot = await getDocs(profilesQuery);

      // Build caregiver data from ALL profiles (not just those with assignments)
      const caregiversData: CaregiverWithElders[] = [];

      for (const profileDoc of profilesSnapshot.docs) {
        const profileData = profileDoc.data();
        const caregiverId = profileData.userId;

        // Only include active/approved caregivers (not pending, suspended, or revoked)
        const status = profileData.status || 'active';
        if (status !== 'active' && status !== 'pending_approval') {
          continue;
        }

        // Skip pending_approval - they need to be approved first
        if (status === 'pending_approval') {
          continue;
        }

        const name = profileData.fullName || 'Unknown';

        // Get role from assignment if exists, otherwise default to caregiver
        const assignment = assignments.find(a => a.caregiverId === caregiverId && a.active);
        const role = assignment?.role || 'caregiver';

        // Get elders for this caregiver (from assignments)
        const elders = caregiverElders.get(caregiverId) || [];

        caregiversData.push({
          id: caregiverId,
          name,
          role: role as 'caregiver_admin' | 'caregiver',
          elders,
          elderCount: elders.length
        });
      }

      setCaregiversWithElders(caregiversData);
      setUnassignedElders(unassigned);
    } catch (err: any) {
      console.error('Error loading caregiver-elder data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleAssignElder = (elderId: string, elderName: string) => {
    setSelectedElder({ id: elderId, name: elderName });
    setDialogOpen(true);
  };

  const handleAssignSuccess = () => {
    loadData();
  };

  // Build caregiver options for the dialog
  const caregiverOptions = caregiversWithElders.map(c => ({
    id: c.id,
    name: c.name,
    elderCount: c.elderCount,
    maxElders: maxEldersPerCaregiver
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-5 h-5" />
            Error Loading Data
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Caregiver Assignments
              </CardTitle>
              <CardDescription>
                View elders assigned to each caregiver ({maxEldersPerCaregiver} max per caregiver)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {caregiversWithElders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No caregivers assigned yet</p>
              <p className="text-sm mt-1">Invite caregivers to your agency to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caregiversWithElders.map((caregiver) => (
                <CaregiverEldersCard
                  key={caregiver.id}
                  caregiverId={caregiver.id}
                  caregiverName={caregiver.name}
                  role={caregiver.role}
                  elders={caregiver.elders}
                  maxElders={maxEldersPerCaregiver}
                  onAssignMore={isSuperAdmin ? () => handleAssignElder('', '') : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Elders Section */}
      {isSuperAdmin && (
        <UnassignedEldersSection
          elders={unassignedElders}
          onAssign={handleAssignElder}
        />
      )}

      {/* Assignment Dialog */}
      <AssignElderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        elderId={selectedElder?.id || ''}
        elderName={selectedElder?.name || ''}
        agencyId={agencyId}
        groupId={groupId}
        userId={userId}
        caregivers={caregiverOptions}
        onSuccess={handleAssignSuccess}
        availableElders={unassignedElders.map(e => ({
          id: e.id,
          name: e.preferredName || e.name
        }))}
      />
    </div>
  );
}
