'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  MapPin,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { TimesheetSubmission } from '@/types/timesheet';
import { format } from 'date-fns';

interface TimesheetApprovalDashboardProps {
  agencyId: string;
  reviewerName: string;
}

export function TimesheetApprovalDashboard({ agencyId, reviewerName }: TimesheetApprovalDashboardProps) {
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    submission: TimesheetSubmission | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, submission: null, action: null });
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/timesheet', {
        method: 'POST',
        body: JSON.stringify({
          action: 'getPendingApprovals',
          agencyId
        })
      });

      const data = await response.json();

      if (data.success) {
        const subs = data.submissions.map((s: any) => ({
          ...s,
          weekStartDate: s.weekStartDate ? new Date(s.weekStartDate) : null,
          weekEndDate: s.weekEndDate ? new Date(s.weekEndDate) : null,
          submittedAt: s.submittedAt ? new Date(s.submittedAt) : null,
        })) as TimesheetSubmission[];
        setSubmissions(subs);
      } else {
        setError(data.error || 'Failed to load pending approvals');
      }
    } catch (err: any) {
      console.error('Error loading pending approvals:', err);
      setError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog.submission || !actionDialog.action) return;

    setProcessing(true);
    setActionError(null);

    try {
      const response = await authenticatedFetch('/api/timesheet', {
        method: 'POST',
        body: JSON.stringify({
          action: actionDialog.action,
          submissionId: actionDialog.submission.id,
          notes: actionNotes,
          reviewerName
        })
      });

      const data = await response.json();

      if (data.success) {
        // Close dialog and refresh list
        setActionDialog({ open: false, submission: null, action: null });
        setActionNotes('');
        await loadPendingApprovals();
      } else {
        setActionError(data.error || `Failed to ${actionDialog.action} timesheet`);
      }
    } catch (err: any) {
      console.error(`Error ${actionDialog.action}ing timesheet:`, err);
      setActionError(err.message || `Failed to ${actionDialog.action} timesheet`);
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (submission: TimesheetSubmission, action: 'approve' | 'reject') => {
    setActionDialog({ open: true, submission, action });
    setActionNotes('');
    setActionError(null);
  };

  const getVerificationBadge = (submission: TimesheetSubmission) => {
    const verified = submission.verifiedShifts || 0;
    const total = submission.totalShifts || 0;
    const overrides = submission.overrideShifts || 0;

    if (overrides > 0) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {overrides} override{overrides !== 1 ? 's' : ''}
        </Badge>
      );
    }

    if (verified === total && total > 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <MapPin className="w-3 h-3 mr-1" />
          All verified
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-gray-600">
        {verified}/{total} verified
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Timesheet Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Timesheet Approvals
                {submissions.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {submissions.length} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve caregiver timesheets
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  loadPendingApprovals();
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No pending timesheet submissions
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Submitted timesheets will appear here for your review
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Submission Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {submission.caregiverName}
                          </h3>
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          {getVerificationBadge(submission)}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Week</p>
                            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {submission.weekStartDate ? format(submission.weekStartDate, 'MMM d') : '--'}
                              {' - '}
                              {submission.weekEndDate ? format(submission.weekEndDate, 'MMM d') : '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Total Hours</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {submission.totalHours?.toFixed(1) || 0}h
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Shifts</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {submission.totalShifts || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Submitted</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {submission.submittedAt ? format(submission.submittedAt, 'MMM d, h:mm a') : '--'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 sm:flex-col">
                        <Button
                          size="sm"
                          onClick={() => openActionDialog(submission, 'approve')}
                          className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(submission, 'reject')}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1 sm:flex-none"
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
          </CardContent>
        )}
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, submission: null, action: null });
          setActionNotes('');
          setActionError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.action === 'approve' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Approve Timesheet
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject Timesheet
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve'
                ? 'Confirm approval of this timesheet submission.'
                : 'Provide a reason for rejecting this timesheet.'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.submission && (
            <div className="space-y-4 py-4">
              {/* Submission Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{actionDialog.submission.caregiverName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    Week: {actionDialog.submission.weekStartDate ? format(actionDialog.submission.weekStartDate, 'MMM d') : '--'} - {actionDialog.submission.weekEndDate ? format(actionDialog.submission.weekEndDate, 'MMM d') : '--'}
                  </div>
                  <div>Hours: {actionDialog.submission.totalHours?.toFixed(1) || 0}h</div>
                  <div>Shifts: {actionDialog.submission.totalShifts || 0}</div>
                  <div>Verified: {actionDialog.submission.verifiedShifts || 0}</div>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  {actionDialog.action === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
                </label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionDialog.action === 'approve'
                    ? 'Add any notes about this approval...'
                    : 'Please explain why this timesheet is being rejected...'}
                  rows={3}
                  required={actionDialog.action === 'reject'}
                />
              </div>

              {/* Error Message */}
              {actionError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">{actionError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, submission: null, action: null })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionDialog.action === 'reject' && !actionNotes.trim())}
              className={actionDialog.action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionDialog.action === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
