'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  MoreVertical,
  AlertTriangle,
  Ban,
  UserCheck,
  RefreshCw,
  Mail,
  Phone,
  Clock,
  Shield,
  Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ManageCaregiverDialog } from './ManageCaregiverDialog';
import { EditCaregiverDialog } from './EditCaregiverDialog';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AgencyService } from '@/lib/firebase/agencies';
import { formatDistanceToNow } from 'date-fns';

interface CaregiverInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended' | 'revoked' | 'pending_approval';
  role: 'caregiver' | 'caregiver_admin';
  elderCount: number;
  joinedAt?: Date;
  suspendExpiresAt?: Date;
  lastStatusChangeAt?: Date;
}

interface ActiveCaregiversSectionProps {
  agencyId: string;
  userId: string;
}

export function ActiveCaregiversSection({ agencyId, userId }: ActiveCaregiversSectionProps) {
  const [caregivers, setCaregivers] = useState<CaregiverInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manageDialog, setManageDialog] = useState<{
    open: boolean;
    caregiver: CaregiverInfo | null;
  }>({ open: false, caregiver: null });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    caregiver: CaregiverInfo | null;
  }>({ open: false, caregiver: null });

  const loadCaregivers = useCallback(async () => {
    try {
      setError(null);

      // Get agency assignments (super admin can read these)
      const assignments = await AgencyService.getAgencyAssignments(agencyId);

      // Get caregiver profiles for this agency (super admin can read these)
      const profilesQuery = query(
        collection(db, 'caregiver_profiles'),
        where('agencyId', '==', agencyId)
      );
      const profilesSnapshot = await getDocs(profilesQuery);

      const caregiversData: CaregiverInfo[] = [];
      const processedCaregiverIds = new Set<string>();

      // Build caregiver info from profiles (which super admin CAN read)
      for (const profileDoc of profilesSnapshot.docs) {
        const profileData = profileDoc.data();
        const caregiverId = profileData.userId;

        // Find assignment for this caregiver
        const assignment = assignments.find(a => a.caregiverId === caregiverId);

        // Determine status from profile
        const status = profileData.status || 'active';

        processedCaregiverIds.add(caregiverId);

        caregiversData.push({
          id: caregiverId,
          name: profileData.fullName || 'Unknown',
          email: profileData.email || '',
          phone: profileData.phoneNumber || '',
          status: status as 'active' | 'suspended' | 'revoked' | 'pending_approval',
          role: assignment?.role || 'caregiver',
          elderCount: assignment?.elderIds?.length || 0,
          joinedAt: profileData.createdAt?.toDate ? profileData.createdAt.toDate() : undefined,
          suspendExpiresAt: profileData.suspendExpiresAt?.toDate ? profileData.suspendExpiresAt.toDate() : undefined,
          lastStatusChangeAt: profileData.updatedAt?.toDate ? profileData.updatedAt.toDate() : undefined
        });
      }

      // Also add caregivers from assignments who don't have profiles yet
      // This ensures we show all assigned caregivers even without profile documents
      for (const assignment of assignments) {
        if (!processedCaregiverIds.has(assignment.caregiverId) && assignment.active) {
          // Try to get basic user info from the users collection
          let userName = 'Unknown';
          let userEmail = '';
          let userPhone = '';

          try {
            const userDoc = await getDoc(doc(db, 'users', assignment.caregiverId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userName = userData.displayName || userData.name || `Caregiver`;
              userEmail = userData.email || '';
              userPhone = userData.phoneNumber || userData.phone || '';
            }
          } catch {
            // If we can't read user doc, use generic name
            userName = `Caregiver`;
          }

          processedCaregiverIds.add(assignment.caregiverId);

          caregiversData.push({
            id: assignment.caregiverId,
            name: userName,
            email: userEmail,
            phone: userPhone,
            status: 'active',
            role: assignment.role || 'caregiver',
            elderCount: assignment.elderIds?.length || 0,
            joinedAt: assignment.assignedAt instanceof Date ? assignment.assignedAt : undefined,
          });
        }
      }

      // Sort: active first, then suspended, then revoked
      caregiversData.sort((a, b) => {
        const statusOrder = { active: 0, suspended: 1, revoked: 2, pending_approval: 3 };
        return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
      });

      setCaregivers(caregiversData);
    } catch (err: any) {
      console.error('Error loading caregivers:', err);
      setError(err.message || 'Failed to load caregivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadCaregivers();
  }, [loadCaregivers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCaregivers();
  };

  const handleManageClick = (caregiver: CaregiverInfo) => {
    setManageDialog({ open: true, caregiver });
  };

  const handleEditClick = (caregiver: CaregiverInfo) => {
    setEditDialog({ open: true, caregiver });
  };

  const handleManageSuccess = () => {
    loadCaregivers();
  };

  const handleEditSuccess = () => {
    loadCaregivers();
  };

  const getStatusBadge = (status: string, suspendExpiresAt?: Date) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'suspended':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-amber-500 hover:bg-amber-600">Suspended</Badge>
            {suspendExpiresAt && (
              <span className="text-xs text-gray-500">
                until {suspendExpiresAt.toLocaleDateString()}
              </span>
            )}
          </div>
        );
      case 'revoked':
        return <Badge className="bg-red-500 hover:bg-red-600">Revoked</Badge>;
      case 'pending_approval':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
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
            <AlertTriangle className="w-5 h-5" />
            Error Loading Caregivers
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

  const activeCaregivers = caregivers.filter(c => c.status === 'active');
  const inactiveCaregivers = caregivers.filter(c => c.status !== 'active');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Caregivers ({caregivers.length})
              </CardTitle>
              <CardDescription>
                Manage caregiver access and permissions
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
          {caregivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No caregivers yet</p>
              <p className="text-sm mt-1">Invite caregivers to join your agency</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Caregivers */}
              {activeCaregivers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active ({activeCaregivers.length})
                  </h4>
                  <div className="space-y-2">
                    {activeCaregivers.map((caregiver) => (
                      <CaregiverRow
                        key={caregiver.id}
                        caregiver={caregiver}
                        onManage={handleManageClick}
                        onEdit={handleEditClick}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Caregivers (Suspended/Revoked) */}
              {inactiveCaregivers.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Inactive ({inactiveCaregivers.length})
                  </h4>
                  <div className="space-y-2">
                    {inactiveCaregivers.map((caregiver) => (
                      <CaregiverRow
                        key={caregiver.id}
                        caregiver={caregiver}
                        onManage={handleManageClick}
                        onEdit={handleEditClick}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Dialog */}
      {manageDialog.caregiver && (
        <ManageCaregiverDialog
          open={manageDialog.open}
          onOpenChange={(open) => setManageDialog({ ...manageDialog, open })}
          caregiverId={manageDialog.caregiver.id}
          caregiverName={manageDialog.caregiver.name}
          caregiverEmail={manageDialog.caregiver.email}
          caregiverPhone={manageDialog.caregiver.phone}
          elderCount={manageDialog.caregiver.elderCount}
          joinedAt={manageDialog.caregiver.joinedAt}
          currentStatus={manageDialog.caregiver.status}
          agencyId={agencyId}
          userId={userId}
          onSuccess={handleManageSuccess}
        />
      )}

      {/* Edit Profile Dialog */}
      {editDialog.caregiver && (
        <EditCaregiverDialog
          open={editDialog.open}
          onOpenChange={(open) => setEditDialog({ ...editDialog, open })}
          caregiverId={editDialog.caregiver.id}
          caregiverName={editDialog.caregiver.name}
          caregiverEmail={editDialog.caregiver.email}
          caregiverPhone={editDialog.caregiver.phone?.replace(/^\+1/, '')}
          elderCount={editDialog.caregiver.elderCount}
          joinedAt={editDialog.caregiver.joinedAt}
          currentStatus={editDialog.caregiver.status}
          agencyId={agencyId}
          userId={userId}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}

// Caregiver Row Component
interface CaregiverRowProps {
  caregiver: CaregiverInfo;
  onManage: (caregiver: CaregiverInfo) => void;
  onEdit?: (caregiver: CaregiverInfo) => void;
  getStatusBadge: (status: string, suspendExpiresAt?: Date) => React.ReactNode;
}

function CaregiverRow({ caregiver, onManage, onEdit, getStatusBadge }: CaregiverRowProps) {
  return (
    <div
      onClick={() => onManage(caregiver)}
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
      caregiver.status === 'active'
        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
        : caregiver.status === 'suspended'
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 hover:border-amber-400'
          : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 hover:border-red-400'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          caregiver.status === 'active'
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          <span className={`text-sm font-medium ${
            caregiver.status === 'active'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-gray-500'
          }`}>
            {caregiver.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {caregiver.name}
            </p>
            {caregiver.role === 'caregiver_admin' && (
              <Badge variant="outline" className="text-xs">Admin</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {caregiver.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {caregiver.email}
              </span>
            )}
            {caregiver.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {caregiver.phone}
              </span>
            )}
            {caregiver.elderCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {caregiver.elderCount} loved one{caregiver.elderCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {getStatusBadge(caregiver.status, caregiver.suspendExpiresAt)}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(caregiver); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManage(caregiver); }}>
              <Shield className="w-4 h-4 mr-2" />
              Manage Access
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {caregiver.status === 'active' ? (
              <>
                <DropdownMenuItem
                  onClick={() => onManage(caregiver)}
                  className="text-amber-600 focus:text-amber-600"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onManage(caregiver)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Revoke
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => onManage(caregiver)}
                className="text-green-600 focus:text-green-600"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Reactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
