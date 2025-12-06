'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Settings,
  BarChart3,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { GroupService } from '@/lib/firebase/groups';
import { Agency, CaregiverAssignment, Group } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface AgencyDashboardProps {
  userId: string;
  agencyId: string;
}

export function AgencyDashboard({ userId, agencyId }: AgencyDashboardProps) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [assignments, setAssignments] = useState<CaregiverAssignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgencyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [agencyData, assignmentsData] = await Promise.all([
        AgencyService.getAgency(agencyId),
        AgencyService.getAgencyAssignments(agencyId)
      ]);

      if (!agencyData) {
        setError('Agency not found');
        return;
      }

      setAgency(agencyData);
      setAssignments(assignmentsData);

      // Load groups
      const groupsData = await Promise.all(
        agencyData.groupIds.map(groupId => GroupService.getGroup(groupId))
      );
      setGroups(groupsData.filter(g => g !== null) as Group[]);
    } catch (err: any) {
      console.error('Error loading agency data:', err);
      setError(err.message || 'Failed to load agency data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !agency) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-5 h-5" />
            Error Loading Agency
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {error || 'Agency not found'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isSuperAdmin = agency.superAdminId === userId;
  const totalElders = groups.reduce((sum, group) => sum + group.elders.length, 0);
  const activeCaregivers = new Set(assignments.filter(a => a.active).map(a => a.caregiverId)).size;

  return (
    <div className="space-y-6">
      {/* Agency Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{agency.name}</CardTitle>
              <CardDescription className="mt-1">
                {agency.type === 'individual' ? 'Individual Family' : 'Professional Agency'}
              </CardDescription>
            </div>
            {isSuperAdmin && (
              <Badge variant="default" className="bg-purple-600">
                Super Admin
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Caregivers</p>
                <p className="text-2xl font-bold">{activeCaregivers}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Elders</p>
                <p className="text-2xl font-bold">{totalElders}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Groups</p>
                <p className="text-2xl font-bold">{agency.groupIds.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Elder Limit</p>
                <p className="text-2xl font-bold">{agency.maxEldersPerCaregiver}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignment Status</CardTitle>
            <CardDescription>Caregiver assignments overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Assignments</span>
                <Badge variant="default" className="bg-green-600">
                  {assignments.filter(a => a.active).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Inactive Assignments</span>
                <Badge variant="secondary">
                  {assignments.filter(a => !a.active).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Assignments</span>
                <Badge variant="outline">
                  {assignments.length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
            <CardDescription>Current plan and billing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
                <Badge variant="default">
                  {agency.subscription.tier.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <Badge
                  variant={agency.subscription.status === 'active' ? 'default' : 'secondary'}
                  className={agency.subscription.status === 'active' ? 'bg-green-600' : ''}
                >
                  {agency.subscription.status.toUpperCase()}
                </Badge>
              </div>
              {agency.subscription.status === 'trial' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Trial Ends</span>
                  <span className="text-sm font-medium">
                    {new Date(agency.subscription.trialEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      {groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>
              All groups under this agency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{group.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {group.elders.length} {group.elders.length === 1 ? 'elder' : 'elders'} • {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {group.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSuperAdmin && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <AlertCircle className="w-5 h-5" />
              Limited Access
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              You have caregiver access. Contact your agency super admin for full management features.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
