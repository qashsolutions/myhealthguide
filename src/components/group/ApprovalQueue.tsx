'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GroupService } from '@/lib/firebase/groups';
import { PendingApproval } from '@/types';
import { CheckCircle, XCircle, Clock, UserPlus, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid } from 'date-fns';

/**
 * Safely format a date, handling Firestore Timestamps and invalid dates
 */
function safeFormatDate(date: any, formatStr: string, fallback: string = 'Unknown'): string {
  try {
    if (!date) return fallback;

    // Handle Firestore Timestamp
    let dateObj: Date;
    if (typeof date === 'object' && 'seconds' in date) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return fallback;
    }

    if (!isValid(dateObj)) return fallback;
    return format(dateObj, formatStr);
  } catch {
    return fallback;
  }
}

interface ApprovalQueueProps {
  groupId: string;
  adminId: string;
}

export function ApprovalQueue({ groupId, adminId }: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const pendingApprovals = await GroupService.getPendingApprovals(groupId);
      setApprovals(pendingApprovals);
    } catch (err) {
      console.error('Error loading approvals:', err);
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: PendingApproval) => {
    try {
      setProcessingId(approval.id!);
      await GroupService.approveJoinRequest(
        groupId,
        approval.id!,
        adminId,
        approval.userId
      );

      // Refresh the list
      await loadApprovals();
    } catch (err) {
      console.error('Error approving request:', err);
      setError('Failed to approve request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approval: PendingApproval) => {
    try {
      setProcessingId(approval.id!);
      await GroupService.rejectJoinRequest(
        groupId,
        approval.id!,
        adminId,
        'Rejected by admin'
      );

      // Refresh the list
      await loadApprovals();
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Pending Join Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Clock className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Pending Join Requests
              {approvals.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {approvals.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Review and approve or reject requests to join your group
            </CardDescription>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {approvals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No pending join requests
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              New join requests will appear here for your approval
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {approval.userName}
                      </h3>
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {approval.userEmail && (
                        <p className="flex items-center gap-1">
                          <span className="font-medium">Email:</span>
                          {approval.userEmail}
                        </p>
                      )}
                      {approval.userPhone && (
                        <p className="flex items-center gap-1">
                          <span className="font-medium">Phone:</span>
                          {approval.userPhone}
                        </p>
                      )}
                      <p className="flex items-center gap-1">
                        <span className="font-medium">Requested:</span>
                        {safeFormatDate(approval.requestedAt, 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(approval)}
                      disabled={processingId === approval.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(approval)}
                      disabled={processingId === approval.id}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong className="text-blue-700 dark:text-blue-400">Note:</strong> Approved members will be added as Viewers (read-only access). Caregivers are added separately via Agency Management.
          </p>
        </div>
      </CardContent>
      )}
    </Card>
  );
}
