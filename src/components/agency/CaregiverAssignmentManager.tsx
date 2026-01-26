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
import { UserPlus, X, AlertCircle, Users, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { db, auth } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { CaregiverAssignment, Elder } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [caregiverIds, setCaregiverIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Assignment dialog state
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedElders, setSelectedElders] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<'caregiver' | 'caregiver_admin'>('caregiver');
  const [assigning, setAssigning] = useState(false);
  const [caregiverNames, setCaregiverNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get agency to find all group IDs
      const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
      if (!agencyDoc.exists()) {
        setError('Agency not found');
        return;
      }
      const agencyData = agencyDoc.data();
      const groupIds: string[] = agencyData?.groupIds || [];

      // Get all assignments for the agency
      const assignmentsData = await AgencyService.getAgencyAssignments(agencyId);
      setAssignments(assignmentsData); // Don't filter by groupId - show ALL assignments

      // Query elders from the elders collection for ALL groups (not embedded group.elders)
      const allElders: Elder[] = [];
      for (const gId of groupIds) {
        const elderQuery = query(
          collection(db, 'elders'),
          where('groupId', '==', gId)
        );
        const snap = await getDocs(elderQuery);
        snap.docs.forEach((d) => {
          const data = d.data();
          if (!data.archived) {
            allElders.push({
              id: d.id,
              groupId: gId,
              name: data.name || data.preferredName || 'Unknown',
              dateOfBirth: data.dateOfBirth?.toDate?.() || undefined,
              approximateAge: data.approximateAge,
              userId: data.userId,
              profileImage: data.profileImage,
              notes: data.notes || '',
              createdAt: data.createdAt?.toDate?.() || new Date(),
              preferredName: data.preferredName,
              gender: data.gender,
              biologicalSex: data.biologicalSex,
              primaryCaregiverId: data.primaryCaregiverId,
              primaryCaregiverName: data.primaryCaregiverName,
              primaryCaregiverAssignedAt: data.primaryCaregiverAssignedAt?.toDate?.(),
              primaryCaregiverAssignedBy: data.primaryCaregiverAssignedBy,
            } as Elder);
          }
        });
      }
      setElders(allElders);

      // Get caregivers from agency and fetch names via API (same as Scheduling tab)
      const agencyCaregiverIds: string[] = agencyData?.caregiverIds || [];
      setCaregiverIds(agencyCaregiverIds);

      if (agencyCaregiverIds.length > 0) {
        // Fetch names via API
        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch('/api/agency/caregiver-names', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userIds: agencyCaregiverIds, agencyId }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.names) {
              setCaregiverNames(data.names);
            }
          }
        } catch (e) {
          console.error('Error fetching caregiver names:', e);
        }
      }
    } catch (err: any) {
      console.error('Error loading assignment data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCaregiver = async () => {
    if (!selectedCaregiver || selectedElders.length === 0) {
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      await AgencyService.assignCaregiverToElders(
        agencyId,
        selectedCaregiver,
        selectedElders,
        groupId,
        userId,
        selectedRole,
        undefined,
        false, // assignAsPrimary - not used
        false  // forceTransfer - not used
      );

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

  const resetForm = () => {
    setSelectedCaregiver('');
    setSelectedElders([]);
    setSelectedRole('caregiver');
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
    return caregiverNames[caregiverId] || 'Caregiver';
  };

  const getElderName = (elderId: string): string => {
    const elder = elders.find(e => e.id === elderId);
    return elder ? elder.name : 'Unknown Loved One';
  };

  // Compute assigned elder IDs (from active assignments)
  const assignedElderIds = new Set<string>();
  assignments.filter(a => a.active).forEach(a => {
    a.elderIds.forEach(id => assignedElderIds.add(id));
  });

  // Compute unassigned elders
  const unassignedElders = elders.filter(e => e.id && !assignedElderIds.has(e.id));

  // Stats
  const totalElders = elders.length;
  const assignedCount = assignedElderIds.size;
  const unassignedCount = unassignedElders.length;
  const activeCaregiversCount = new Set(
    assignments.filter(a => a.active).map(a => a.caregiverId)
  ).size;

  // Handle quick assign for unassigned elders (opens dialog with elder pre-selected)
  const handleQuickAssign = (elderIds: string[]) => {
    setSelectedElders(elderIds);
    setDialogOpen(true);
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

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={unassignedCount === 0 ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                unassignedCount === 0
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {unassignedCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {assignedCount}/{totalElders}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loved Ones Assigned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={unassignedCount > 0 ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                unassignedCount > 0
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  unassignedCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-400'
                }`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  unassignedCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {unassignedCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Need Caregiver
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCaregiversCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Active Caregivers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention: Unassigned Elders */}
      {unassignedCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-amber-800 dark:text-amber-200">
                    Needs Attention: {unassignedCount} Loved One{unassignedCount !== 1 ? 's' : ''} Without Caregiver
                  </CardTitle>
                  <CardDescription className="text-amber-600 dark:text-amber-400">
                    These loved ones have not been assigned to any caregiver yet
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => handleQuickAssign(unassignedElders.map(e => e.id!))}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedElders.slice(0, 10).map(elder => (
                <Badge
                  key={elder.id}
                  variant="outline"
                  className="border-amber-300 bg-white dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  onClick={() => handleQuickAssign([elder.id!])}
                >
                  {elder.name}
                </Badge>
              ))}
              {unassignedElders.length > 10 && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-white dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                >
                  +{unassignedElders.length - 10} more
                </Badge>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              Click on a name to assign individually, or use &quot;Assign All&quot; for bulk assignment
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Current Assignments
              </CardTitle>
              <CardDescription>
                {assignments.length > 0
                  ? `${assignedCount} loved one${assignedCount !== 1 ? 's' : ''} assigned to ${activeCaregiversCount} caregiver${activeCaregiversCount !== 1 ? 's' : ''}`
                  : 'No assignments yet - use the button to assign caregivers'
                }
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
                  <DialogTitle>Assign Caregiver to Loved Ones</DialogTitle>
                  <DialogDescription>
                    Select a caregiver and the loved ones they will manage
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
                        {caregiverIds.map(id => {
                          const assignedCount = getAssignedEldersCount(id);
                          return (
                            <SelectItem key={id} value={id}>
                              {getCaregiverName(id)} ({assignedCount} loved ones assigned)
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
                      Caregiver Admin can edit medications and schedules for assigned loved ones
                    </p>
                  </div>

                  {/* Elder Selection */}
                  <div className="space-y-2">
                    <Label>Select Loved Ones</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {elders.length === 0 ? (
                        <p className="text-sm text-gray-500">No loved ones available</p>
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
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Selected: {selectedElders.length} loved one(s)
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
                    onClick={() => handleAssignCaregiver()}
                    disabled={!selectedCaregiver || selectedElders.length === 0 || assigning}
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
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
                {unassignedCount > 0
                  ? `You have ${unassignedCount} loved one${unassignedCount !== 1 ? 's' : ''} waiting to be assigned`
                  : 'Click "Assign Caregiver" to get started'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(assignment => (
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
                        {!assignment.active && (
                          <Badge variant="outline" className="text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignment.elderIds.map(elderId => (
                            <Badge
                              key={elderId}
                              variant="outline"
                              className="text-xs"
                            >
                              {getElderName(elderId)}
                            </Badge>
                          ))}
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
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
