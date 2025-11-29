'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserPlus, X, AlertCircle, Users, Crown, UserCog } from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { GroupService } from '@/lib/firebase/groups';
import { ElderAssignmentService, AssignmentConflict } from '@/lib/firebase/elderAssignment';
import { CaregiverAssignment, Elder, GroupMember } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { PrimaryCaregiverTransferDialog } from './PrimaryCaregiverTransferDialog';

interface CaregiverAssignmentManagerProps {
  agencyId: string;
  groupId: string;
  userId: string;
}

export function CaregiverAssignmentManager({
  agencyId,
  groupId,
  userId
}: CaregiverAssignmentManagerProps) {
  const [assignments, setAssignments] = useState<CaregiverAssignment[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Assignment dialog state
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedElders, setSelectedElders] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<'caregiver' | 'caregiver_admin'>('caregiver');
  const [assignAsPrimary, setAssignAsPrimary] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<AssignmentConflict[]>([]);

  useEffect(() => {
    loadData();
  }, [agencyId, groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assignmentsData, group] = await Promise.all([
        AgencyService.getAgencyAssignments(agencyId),
        GroupService.getGroup(groupId)
      ]);

      if (!group) {
        setError('Group not found');
        return;
      }

      setAssignments(assignmentsData.filter(a => a.groupId === groupId));
      setElders(group.elders);
      setGroupMembers(group.members.filter(m => m.userId !== group.adminId)); // Exclude admin
    } catch (err: any) {
      console.error('Error loading assignment data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCaregiver = async (forceTransfer: boolean = false) => {
    if (!selectedCaregiver || selectedElders.length === 0) {
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      const result = await AgencyService.assignCaregiverToElders(
        agencyId,
        selectedCaregiver,
        selectedElders,
        groupId,
        userId,
        selectedRole,
        undefined,
        assignAsPrimary,
        forceTransfer
      );

      // Check if there are conflicts that need user confirmation
      if (result.conflicts && result.conflicts.length > 0) {
        setPendingConflicts(result.conflicts);
        setTransferDialogOpen(true);
        setAssigning(false);
        return;
      }

      // Reload data
      await loadData();

      // Reset form
      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error assigning caregiver:', err);
      setError(err.message || 'Failed to assign caregiver');
    } finally {
      setAssigning(false);
    }
  };

  const handleConfirmTransfer = async (transferElderIds: string[]) => {
    try {
      setAssigning(true);

      // Re-run assignment with forceTransfer=true for selected elders
      // First, filter selectedElders to only include those being transferred
      const eldersToTransfer = selectedElders.filter(id => transferElderIds.includes(id));
      const eldersToKeepCurrent = selectedElders.filter(id => !transferElderIds.includes(id));

      // Assign with transfer for selected
      if (eldersToTransfer.length > 0) {
        await AgencyService.assignCaregiverToElders(
          agencyId,
          selectedCaregiver,
          eldersToTransfer,
          groupId,
          userId,
          selectedRole,
          undefined,
          true, // assignAsPrimary
          true  // forceTransfer
        );
      }

      // Assign without primary for the rest
      if (eldersToKeepCurrent.length > 0) {
        await AgencyService.assignCaregiverToElders(
          agencyId,
          selectedCaregiver,
          eldersToKeepCurrent,
          groupId,
          userId,
          selectedRole,
          undefined,
          false, // assignAsPrimary
          false  // forceTransfer
        );
      }

      // Reload data
      await loadData();
      resetForm();
      setTransferDialogOpen(false);
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error during transfer:', err);
      setError(err.message || 'Failed to transfer primary caregiver');
    } finally {
      setAssigning(false);
    }
  };

  const handleKeepCurrentPrimary = async () => {
    // Assign as regular caregiver (not primary)
    try {
      setAssigning(true);

      await AgencyService.assignCaregiverToElders(
        agencyId,
        selectedCaregiver,
        selectedElders,
        groupId,
        userId,
        selectedRole,
        undefined,
        false, // not as primary
        false
      );

      await loadData();
      resetForm();
      setTransferDialogOpen(false);
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error assigning caregiver:', err);
      setError(err.message || 'Failed to assign caregiver');
    } finally {
      setAssigning(false);
    }
  };

  const resetForm = () => {
    setSelectedCaregiver('');
    setSelectedElders([]);
    setSelectedRole('caregiver');
    setAssignAsPrimary(false);
    setPendingConflicts([]);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      await AgencyService.removeAssignment(assignmentId);
      await loadData();
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      setError(err.message || 'Failed to remove assignment');
    }
  };

  const toggleElderSelection = (elderId: string) => {
    setSelectedElders(prev =>
      prev.includes(elderId)
        ? prev.filter(id => id !== elderId)
        : [...prev, elderId]
    );
  };

  const getAssignedEldersCount = (caregiverId: string): number => {
    return assignments
      .filter(a => a.caregiverId === caregiverId && a.active)
      .reduce((sum, a) => sum + a.elderIds.length, 0);
  };

  const getCaregiverName = (caregiverId: string): string => {
    const userDoc = groupMembers.find(m => m.userId === caregiverId);
    return userDoc ? `User ${caregiverId.substring(0, 8)}` : 'Unknown';
  };

  const getElderName = (elderId: string): string => {
    const elder = elders.find(e => e.id === elderId);
    return elder ? elder.name : 'Unknown Elder';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="w-5 h-5" />
              Error
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-300">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Caregiver Assignments
              </CardTitle>
              <CardDescription>
                Assign caregivers to specific elders
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Caregiver
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assign Caregiver to Elders</DialogTitle>
                  <DialogDescription>
                    Select a caregiver and the elders they will manage
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Caregiver Selection */}
                  <div className="space-y-2">
                    <Label>Select Caregiver</Label>
                    <Select
                      value={selectedCaregiver}
                      onValueChange={setSelectedCaregiver}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a caregiver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groupMembers.map(member => {
                          const assignedCount = getAssignedEldersCount(member.userId);
                          return (
                            <SelectItem key={member.userId} value={member.userId}>
                              {getCaregiverName(member.userId)} ({assignedCount} elders assigned)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value: any) => setSelectedRole(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caregiver">Caregiver</SelectItem>
                        <SelectItem value="caregiver_admin">Caregiver Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Caregiver Admin can edit medications and schedules for assigned elders
                    </p>
                  </div>

                  {/* Primary Caregiver Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                    <div className="space-y-0.5">
                      <Label htmlFor="primary-toggle" className="flex items-center gap-2 cursor-pointer">
                        <Crown className="w-4 h-4 text-amber-600" />
                        Assign as Primary Caregiver
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Primary caregiver has full admin rights for the elder (manage medications, schedules, invite family)
                      </p>
                    </div>
                    <Switch
                      id="primary-toggle"
                      checked={assignAsPrimary}
                      onCheckedChange={setAssignAsPrimary}
                    />
                  </div>

                  {/* Elder Selection */}
                  <div className="space-y-2">
                    <Label>Select Elders</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {elders.length === 0 ? (
                        <p className="text-sm text-gray-500">No elders available</p>
                      ) : (
                        elders.map(elder => (
                          <div key={elder.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={elder.id}
                                checked={selectedElders.includes(elder.id!)}
                                onCheckedChange={() => toggleElderSelection(elder.id!)}
                              />
                              <label
                                htmlFor={elder.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {elder.name}
                              </label>
                            </div>
                            {elder.primaryCaregiverName && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <Crown className="w-3 h-3" />
                                <span>{elder.primaryCaregiverName}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Selected: {selectedElders.length} elder(s)
                      {assignAsPrimary && selectedElders.some(id =>
                        elders.find(e => e.id === id)?.primaryCaregiverId
                      ) && (
                        <span className="text-amber-600 ml-2">
                          (some elders have existing primary caregivers)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setDialogOpen(false);
                    }}
                    disabled={assigning}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleAssignCaregiver(false)}
                    disabled={!selectedCaregiver || selectedElders.length === 0 || assigning}
                  >
                    {assigning ? 'Assigning...' : assignAsPrimary ? 'Assign as Primary' : 'Assign'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No caregiver assignments yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Click &quot;Assign Caregiver&quot; to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(assignment => {
                // Check if this caregiver is primary for any of the assigned elders
                const primaryForElders = assignment.elderIds.filter(elderId => {
                  const elder = elders.find(e => e.id === elderId);
                  return elder?.primaryCaregiverId === assignment.caregiverId;
                });

                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">
                          {getCaregiverName(assignment.caregiverId)}
                        </h4>
                        <Badge variant={assignment.role === 'caregiver_admin' ? 'default' : 'secondary'}>
                          {assignment.role === 'caregiver_admin' ? 'Admin' : 'Caregiver'}
                        </Badge>
                        {primaryForElders.length > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Crown className="w-3 h-3 mr-1" />
                            Primary ({primaryForElders.length})
                          </Badge>
                        )}
                        {!assignment.active && (
                          <Badge variant="outline" className="text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignment.elderIds.map(elderId => {
                          const isPrimary = primaryForElders.includes(elderId);
                          return (
                            <Badge
                              key={elderId}
                              variant="outline"
                              className={`text-xs ${isPrimary ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''}`}
                            >
                              {isPrimary && <Crown className="w-2.5 h-2.5 mr-1 text-amber-600" />}
                              {getElderName(elderId)}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Assigned on {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {assignment.active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Caregiver Transfer Dialog */}
      <PrimaryCaregiverTransferDialog
        open={transferDialogOpen}
        conflicts={pendingConflicts}
        onConfirmTransfer={handleConfirmTransfer}
        onKeepCurrent={handleKeepCurrentPrimary}
        onCancel={() => {
          setTransferDialogOpen(false);
          setPendingConflicts([]);
        }}
        isLoading={assigning}
      />
    </div>
  );
}
