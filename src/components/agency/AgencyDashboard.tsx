'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  Settings,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { GroupService } from '@/lib/firebase/groups';
import { Agency, CaregiverAssignment, Group, Elder } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CaregiverInviteManager } from './CaregiverInviteManager';
import { CaregiverEldersOverview } from './CaregiverEldersOverview';
import { PendingCaregiversSection } from './PendingCaregiversSection';
import { ActiveCaregiversSection } from './ActiveCaregiversSection';
import { FeedbackDashboard } from '@/components/feedback/FeedbackDashboard';
import { ShiftTrackingDashboard } from './ShiftTrackingDashboard';
import { FamilyInviteManager } from '@/components/caregiver/FamilyInviteManager';
import { SuperAdminFamilyOverview } from './SuperAdminFamilyOverview';

interface AgencyDashboardProps {
  userId: string;
  agencyId: string;
}

export function AgencyDashboard({ userId, agencyId }: AgencyDashboardProps) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [assignments, setAssignments] = useState<CaregiverAssignment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group editing state
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroupName, setSavingGroupName] = useState(false);

  // Caregiver sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: number } | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadAgencyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [agencyData, assignmentsData, eldersData] = await Promise.all([
        AgencyService.getAgency(agencyId),
        AgencyService.getAgencyAssignments(agencyId),
        AgencyService.getAgencyElders(agencyId)
      ]);

      if (!agencyData) {
        setError('Agency not found');
        return;
      }

      setAgency(agencyData);
      setAssignments(assignmentsData);
      setElders(eldersData);

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

  const handleSaveGroupName = async () => {
    if (!editingGroup || !newGroupName.trim()) return;

    try {
      setSavingGroupName(true);
      await GroupService.updateGroupName(editingGroup.id, newGroupName.trim());

      // Update local state
      setGroups(prev =>
        prev.map(g =>
          g.id === editingGroup.id ? { ...g, name: newGroupName.trim() } : g
        )
      );

      setEditingGroup(null);
      setNewGroupName('');
    } catch (err: any) {
      console.error('Error updating group name:', err);
      setError(err.message || 'Failed to update group name');
    } finally {
      setSavingGroupName(false);
    }
  };

  const handleSyncCaregivers = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setShowToast(false);
      const result = await AgencyService.syncAllCaregiverAssignments(agencyId);
      setSyncResult(result);
      setShowToast(true);

      // Update local agency state with new sync timestamp
      if (agency) {
        setAgency({ ...agency, lastCaregiverSyncAt: result.syncedAt });
      }

      // Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error syncing caregivers:', err);
      setError(err.message || 'Failed to sync caregivers');
    } finally {
      setSyncing(false);
    }
  };

  // Helper to format relative time
  const formatRelativeTime = (date: Date | undefined): string => {
    if (!date) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Convert Firestore Timestamp to Date for lastCaregiverSyncAt
  const getLastSyncDate = (): Date | undefined => {
    if (!agency?.lastCaregiverSyncAt) return undefined;
    const raw = agency.lastCaregiverSyncAt;
    if (typeof raw === 'object' && 'seconds' in raw) {
      return new Date((raw as any).seconds * 1000);
    }
    if (raw instanceof Date) return raw;
    return new Date(raw);
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
  const totalElders = elders.length;
  const activeCaregivers = new Set(assignments.filter(a => a.active).map(a => a.caregiverId)).size;

  const lastSyncDate = getLastSyncDate();

  return (
    <div className="space-y-6">
      {/* Toast Notification - Fixed position */}
      {showToast && syncResult && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            syncResult.errors > 0
              ? 'bg-yellow-50 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100'
              : 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700 text-green-800 dark:text-green-100'
          }`}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">
              {syncResult.synced} caregiver(s) synced
              {syncResult.errors > 0 && `, ${syncResult.errors} error(s)`}
            </span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSyncCaregivers}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                    title="Sync all caregiver permissions"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Sync Permissions
                      </>
                    )}
                  </Button>
                  <Badge variant="default" className="bg-purple-600">
                    Super Admin
                  </Badge>
                </div>
                {lastSyncDate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last synced: {formatRelativeTime(lastSyncDate)}
                  </span>
                )}
              </div>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Elders/Caregiver</p>
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
            {(() => {
              // Determine actual status - if trial expired but has Stripe subscription, it's active
              // Handle Firestore Timestamp conversion
              let trialEndsAt: Date | null = null;
              if (agency.subscription.trialEndsAt) {
                const raw = agency.subscription.trialEndsAt;
                if (typeof raw === 'object' && 'seconds' in raw) {
                  trialEndsAt = new Date((raw as any).seconds * 1000);
                } else if (raw instanceof Date) {
                  trialEndsAt = raw;
                } else {
                  trialEndsAt = new Date(raw);
                }
              }
              const trialExpired = trialEndsAt && trialEndsAt < new Date();
              const hasStripeSubscription = !!agency.subscription.stripeSubscriptionId;
              const actualStatus = (agency.subscription.status === 'trial' && trialExpired && hasStripeSubscription)
                ? 'active'
                : agency.subscription.status;
              const isActive = actualStatus === 'active';

              return (
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
                      variant={isActive ? 'default' : 'secondary'}
                      className={isActive ? 'bg-green-600' : ''}
                    >
                      {actualStatus.toUpperCase()}
                    </Badge>
                  </div>
                  {actualStatus === 'trial' && trialEndsAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Trial Ends</span>
                      <span className="text-sm font-medium">
                        {trialEndsAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {isActive && agency.subscription.currentPeriodEnd && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Renews</span>
                      <span className="text-sm font-medium">
                        {(() => {
                          const raw = agency.subscription.currentPeriodEnd;
                          let date: Date;
                          if (typeof raw === 'object' && 'seconds' in raw) {
                            date = new Date((raw as any).seconds * 1000);
                          } else if (raw instanceof Date) {
                            date = raw;
                          } else {
                            date = new Date(raw);
                          }
                          return date.toLocaleDateString();
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
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
              {groups.map(group => {
                // Count elders for this specific group
                const groupElderCount = elders.filter(e => e.groupId === group.id).length;
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{group.name}</h4>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setEditingGroup(group);
                              setNewGroupName(group.name);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Rename group"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {groupElderCount} {groupElderCount === 1 ? 'elder' : 'elders'} • {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {group.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Group Name Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
            <DialogDescription>
              Enter a new name for this group
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
              disabled={savingGroupName}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingGroup(null)}
              disabled={savingGroupName}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGroupName}
              disabled={savingGroupName || !newGroupName.trim()}
            >
              {savingGroupName ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Caregiver Approvals - Only for Super Admin */}
      {isSuperAdmin && (
        <PendingCaregiversSection
          agencyId={agencyId}
          userId={userId}
        />
      )}

      {/* Active Caregivers Management - Only for Super Admin */}
      {isSuperAdmin && (
        <ActiveCaregiversSection
          agencyId={agencyId}
          userId={userId}
        />
      )}

      {/* Caregiver-Elder Assignments Overview - Only for Super Admin */}
      {isSuperAdmin && groups.length > 0 && (
        <CaregiverEldersOverview
          agencyId={agencyId}
          groupId={groups[0].id}
          userId={userId}
          maxEldersPerCaregiver={agency.maxEldersPerCaregiver}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Family Members Overview - Only for Super Admin */}
      {isSuperAdmin && groups.length > 0 && (
        <SuperAdminFamilyOverview
          agencyId={agencyId}
          groupId={groups[0].id}
        />
      )}

      {/* Caregiver Invite Manager - Only for Super Admin */}
      {isSuperAdmin && (
        <CaregiverInviteManager
          agencyId={agencyId}
          userId={userId}
          currentCaregiverCount={activeCaregivers}
          maxCaregivers={10}
        />
      )}

      {/* Shift Tracking Dashboard - Actual vs Planned */}
      {isSuperAdmin && (
        <ShiftTrackingDashboard agencyId={agencyId} />
      )}

      {/* Smart Feedback Dashboard - Only for Super Admin */}
      {isSuperAdmin && (
        <FeedbackDashboard
          mode="agency"
          agencyId={agencyId}
          defaultOpen={false}
        />
      )}

      {/* Caregiver View - Family Members & Limited Access Notice */}
      {!isSuperAdmin && (
        <>
          {/* Family Invite Manager for Caregivers */}
          {(() => {
            // Find caregiver's assignment
            const myAssignment = assignments.find(a => a.caregiverId === userId && a.active);
            if (myAssignment && myAssignment.permissions?.canInviteMembers) {
              return (
                <FamilyInviteManager
                  groupId={myAssignment.groupId}
                  caregiverId={userId}
                  elderCount={myAssignment.elderIds?.length || 0}
                />
              );
            }
            return null;
          })()}

          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <AlertCircle className="w-5 h-5" />
                Caregiver Access
              </CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-300">
                You have caregiver access to your assigned elders. Contact your agency owner for additional features.
              </CardDescription>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  );
}
