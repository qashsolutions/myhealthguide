'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Shield,
  Loader2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingCaregiver {
  id: string;
  caregiverId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface PendingCaregiversSectionProps {
  agencyId: string;
  userId: string;
}

export function PendingCaregiversSection({ agencyId, userId }: PendingCaregiversSectionProps) {
  const [pendingCaregivers, setPendingCaregivers] = useState<PendingCaregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    caregiver: PendingCaregiver | null;
    action: 'approve' | 'reject';
  }>({ open: false, caregiver: null, action: 'approve' });

  const loadPendingCaregivers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/caregiver/approve?agencyId=${agencyId}&adminUserId=${userId}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load pending caregivers');
      }

      const data = await response.json();
      setPendingCaregivers(
        data.pendingCaregivers.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }))
      );
    } catch (err: any) {
      console.error('Error loading pending caregivers:', err);
      setError(err.message || 'Failed to load pending caregivers');
    } finally {
      setLoading(false);
    }
  }, [agencyId, userId]);

  useEffect(() => {
    loadPendingCaregivers();
  }, [loadPendingCaregivers]);

  const handleAction = async (caregiverId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(caregiverId);

      const response = await fetch('/api/caregiver/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caregiverId,
          agencyId,
          action,
          adminUserId: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} caregiver`);
      }

      // Remove from list
      setPendingCaregivers((prev) =>
        prev.filter((c) => c.caregiverId !== caregiverId)
      );

      setConfirmDialog({ open: false, caregiver: null, action: 'approve' });
    } catch (err: any) {
      console.error(`Error ${action}ing caregiver:`, err);
      setError(err.message || `Failed to ${action} caregiver`);
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirmDialog = (caregiver: PendingCaregiver, action: 'approve' | 'reject') => {
    setConfirmDialog({ open: true, caregiver, action });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
            Error Loading Pending Caregivers
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={loadPendingCaregivers}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (pendingCaregivers.length === 0) {
    return null; // Don't show section if no pending caregivers
  }

  return (
    <>
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-yellow-800 dark:text-yellow-200">
                Pending Approvals
              </CardTitle>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                {pendingCaregivers.length}
              </Badge>
            </div>
          </div>
          <CardDescription className="text-yellow-700 dark:text-yellow-300">
            Review and approve caregivers who have completed signup verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingCaregivers.map((caregiver) => (
            <div
              key={caregiver.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium">{caregiver.fullName || 'Name not provided'}</span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span>{caregiver.email || 'No email'}</span>
                    {caregiver.emailVerified ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{caregiver.phoneNumber || 'No phone'}</span>
                    {caregiver.phoneVerified ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {caregiver.emailVerified && caregiver.phoneVerified ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <Shield className="w-3 h-3 mr-1" />
                      Fully Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Partial Verification
                    </Badge>
                  )}

                  <span className="text-xs text-gray-500">
                    Requested {caregiver.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openConfirmDialog(caregiver, 'reject')}
                  disabled={processingId === caregiver.caregiverId}
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {processingId === caregiver.caregiverId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={() => openConfirmDialog(caregiver, 'approve')}
                  disabled={processingId === caregiver.caregiverId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processingId === caregiver.caregiverId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'} Caregiver?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'approve' ? (
                <>
                  This will grant <strong>{confirmDialog.caregiver?.fullName}</strong> access to
                  view and manage elder information in your agency. They will be able to see assigned
                  elders and their health data.
                </>
              ) : (
                <>
                  This will reject <strong>{confirmDialog.caregiver?.fullName}&apos;s</strong> request
                  to join your agency. They will not be able to access any elder information.
                  They would need a new invite to try again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog.caregiver &&
                handleAction(confirmDialog.caregiver.caregiverId, confirmDialog.action)
              }
              className={
                confirmDialog.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
