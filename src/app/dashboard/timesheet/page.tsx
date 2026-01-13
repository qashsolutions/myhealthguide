'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Download, Calendar, Send, CheckCircle, XCircle, Clock3, AlertCircle, Lock } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { ShiftSession } from '@/types';
import type { TimesheetSubmission } from '@/types/timesheet';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';

type TimeRange = 'week' | 'month' | 'all';

export default function TimesheetPage() {
  const { user } = useAuth();
  const { selectedElder, availableElders } = useElder();
  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'caregiver' | 'elder'>('caregiver');
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Check if user is agency caregiver, admin, or family member
  const userAgencyRole = user?.agencies?.[0]?.role;
  const isFamilyMember = userAgencyRole === 'family_member';
  const isAgencyAdmin = userAgencyRole === 'super_admin' || userAgencyRole === 'caregiver_admin';
  const isAgencyCaregiver = user?.agencies && user.agencies.length > 0 && !isFamilyMember;
  const agencyId = user?.agencies?.[0]?.agencyId;

  // Admin-specific state
  const [pendingApprovals, setPendingApprovals] = useState<TimesheetSubmission[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadShifts();
    if (isAgencyCaregiver && !isAgencyAdmin) {
      loadSubmissions();
    }
    if (isAgencyAdmin && agencyId) {
      loadPendingApprovals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedElder, timeRange, viewMode]);

  const loadPendingApprovals = async () => {
    if (!user || !agencyId || !isAgencyAdmin) return;

    setLoadingApprovals(true);
    try {
      const response = await authenticatedFetch('/api/timesheet', {
        method: 'POST',
        body: JSON.stringify({ action: 'getPendingApprovals', agencyId })
      });
      const data = await response.json();

      if (data.success) {
        const approvals = data.submissions.map((s: any) => ({
          ...s,
          weekStartDate: s.weekStartDate ? new Date(s.weekStartDate) : null,
          weekEndDate: s.weekEndDate ? new Date(s.weekEndDate) : null,
          submittedAt: s.submittedAt ? new Date(s.submittedAt) : null,
          reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
        })) as TimesheetSubmission[];
        setPendingApprovals(approvals);
      }
    } catch (err: any) {
      console.error('Error loading pending approvals:', err);
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleApproveReject = async (submissionId: string, action: 'approve' | 'reject', notes?: string) => {
    if (!user) return;

    setProcessingId(submissionId);
    try {
      const response = await authenticatedFetch('/api/timesheet', {
        method: 'POST',
        body: JSON.stringify({
          action,
          submissionId,
          notes,
          reviewerName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin'
        })
      });
      const data = await response.json();

      if (data.success) {
        // Reload pending approvals
        loadPendingApprovals();
      } else {
        console.error('Error processing submission:', data.error);
      }
    } catch (err: any) {
      console.error('Error processing submission:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const loadShifts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(timeRange);

      const params = new URLSearchParams({
        viewMode,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (viewMode === 'elder' && selectedElder) {
        params.set('elderId', selectedElder.id);
      }

      const response = await authenticatedFetch(`/api/timesheet?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const allShifts = data.shifts.map((s: any) => ({
          ...s,
          startTime: s.startTime ? new Date(s.startTime) : null,
          endTime: s.endTime ? new Date(s.endTime) : null,
          createdAt: s.createdAt ? new Date(s.createdAt) : null,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : null
        })) as ShiftSession[];

        setShifts(allShifts);
      } else {
        console.error('Error loading shifts:', data.error);
        setShifts([]);
      }
    } catch (err: any) {
      console.error('Error loading shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!user || !isAgencyCaregiver) return;

    try {
      const response = await authenticatedFetch('/api/timesheet', {
        method: 'POST',
        body: JSON.stringify({ action: 'getSubmissions' })
      });
      const data = await response.json();

      if (data.success) {
        const subs = data.submissions.map((s: any) => ({
          ...s,
          weekStartDate: s.weekStartDate ? new Date(s.weekStartDate) : null,
          weekEndDate: s.weekEndDate ? new Date(s.weekEndDate) : null,
          submittedAt: s.submittedAt ? new Date(s.submittedAt) : null,
          reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
        })) as TimesheetSubmission[];
        setSubmissions(subs);
      }
    } catch (err: any) {
      console.error('Error loading submissions:', err);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!user || !agencyId) return;

    const { startDate } = getDateRange('week');
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await authenticatedFetch('/api/timesheet', {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit',
          weekStartDate: weekStart.toISOString(),
          agencyId,
          caregiverName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
        })
      });
      const data = await response.json();

      if (data.success) {
        setSubmitSuccess('Timesheet submitted successfully!');
        loadSubmissions();
      } else {
        setSubmitError(data.error || 'Failed to submit timesheet');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit timesheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if current week has been submitted
  const getCurrentWeekSubmission = () => {
    if (!submissions.length) return null;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return submissions.find(s => {
      if (!s.weekStartDate) return false;
      const subStart = new Date(s.weekStartDate);
      return subStart.getTime() === weekStart.getTime();
    });
  };

  const currentWeekSubmission = getCurrentWeekSubmission();

  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    let startDate, endDate;

    if (range === 'week') {
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
    } else if (range === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      // All time - last 90 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      endDate = now;
    }

    return { startDate, endDate };
  };

  const calculateTotalHours = () => {
    return shifts.reduce((total, shift) => {
      if (shift.actualDuration) {
        return total + shift.actualDuration;
      } else if (shift.startTime && shift.endTime) {
        const minutes = differenceInMinutes(shift.endTime, shift.startTime);
        return total + minutes;
      }
      return total;
    }, 0);
  };

  const totalMinutes = calculateTotalHours();
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const exportTimesheet = () => {
    // Create CSV
    const headers = ['Date', 'Start Time', 'End Time', 'Duration (hours)', 'Loved One', 'Caregiver'];
    const rows = shifts.map(shift => [
      format(shift.startTime, 'yyyy-MM-dd'),
      format(shift.startTime, 'HH:mm'),
      shift.endTime ? format(shift.endTime, 'HH:mm') : 'N/A',
      shift.actualDuration ? (shift.actualDuration / 60).toFixed(2) : '0',
      shift.elderId,
      shift.caregiverId
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Block access for family members
  if (isFamilyMember) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Caregiver Access Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This feature is only available to agency caregivers and administrators.
                Caregivers use this to track and submit their work hours.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  If you believe you should have access, please contact your agency administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isAgencyAdmin ? 'Timesheet Management' : 'Timesheet'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAgencyAdmin ? 'Review and approve caregiver timesheets' : 'View and export shift hours'}
          </p>
        </div>
        <Button onClick={exportTimesheet} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Admin: Pending Approvals Section */}
      {isAgencyAdmin && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-blue-600" />
              Pending Timesheet Approvals
              {pendingApprovals.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">
                  {pendingApprovals.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingApprovals ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">All timesheets have been reviewed!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {submission.caregiverName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Week of {submission.weekStartDate ? format(submission.weekStartDate, 'MMM d') : ''} - {submission.weekEndDate ? format(submission.weekEndDate, 'MMM d, yyyy') : ''}
                      </p>
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span><strong>{submission.totalShifts}</strong> shifts</span>
                        <span><strong>{submission.totalHours}</strong> hours</span>
                        {submission.verifiedShifts !== undefined && submission.verifiedShifts > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {submission.verifiedShifts} verified
                          </span>
                        )}
                        {submission.overrideShifts !== undefined && submission.overrideShifts > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {submission.overrideShifts} with overrides
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Submitted {submission.submittedAt ? format(submission.submittedAt, 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        onClick={() => handleApproveReject(submission.id!, 'reject')}
                        disabled={processingId === submission.id}
                      >
                        {processingId === submission.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApproveReject(submission.id!, 'approve')}
                        disabled={processingId === submission.id}
                      >
                        {processingId === submission.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'caregiver' ? 'default' : 'outline'}
                onClick={() => setViewMode('caregiver')}
                size="sm"
              >
                My Shifts
              </Button>
              <Button
                variant={viewMode === 'elder' ? 'default' : 'outline'}
                onClick={() => setViewMode('elder')}
                size="sm"
                disabled={!selectedElder}
              >
                Elder Shifts
              </Button>
            </div>

            {/* Time Range */}
            <div className="flex gap-2">
              <Button
                variant={timeRange === 'week' ? 'default' : 'outline'}
                onClick={() => setTimeRange('week')}
                size="sm"
              >
                This Week
              </Button>
              <Button
                variant={timeRange === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeRange('month')}
                size="sm"
              >
                This Month
              </Button>
              <Button
                variant={timeRange === 'all' ? 'default' : 'outline'}
                onClick={() => setTimeRange('all')}
                size="sm"
              >
                Last 90 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{shifts.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalHours}h {remainingMinutes}m
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Shift</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {shifts.length > 0 ? (totalMinutes / shifts.length / 60).toFixed(1) : '0'}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Timesheet Card - Agency Caregivers Only */}
      {isAgencyCaregiver && timeRange === 'week' && viewMode === 'caregiver' && (
        <Card className={currentWeekSubmission ? 'border-green-200 dark:border-green-800' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Submit Weekly Timesheet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Submit messages */}
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{submitError}</p>
                </div>
              </div>
            )}
            {submitSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <p className="text-sm">{submitSuccess}</p>
                </div>
              </div>
            )}

            {/* Current submission status */}
            {currentWeekSubmission ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {currentWeekSubmission.status === 'submitted' && (
                    <>
                      <Clock3 className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">Pending Review</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Submitted {currentWeekSubmission.submittedAt ? format(currentWeekSubmission.submittedAt, 'MMM d, h:mm a') : ''}
                        </p>
                      </div>
                    </>
                  )}
                  {currentWeekSubmission.status === 'approved' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Approved</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {currentWeekSubmission.reviewerName && `By ${currentWeekSubmission.reviewerName}`}
                          {currentWeekSubmission.reviewedAt && ` on ${format(currentWeekSubmission.reviewedAt, 'MMM d')}`}
                        </p>
                      </div>
                    </>
                  )}
                  {currentWeekSubmission.status === 'rejected' && (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-100">Rejected</p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {currentWeekSubmission.reviewNotes || 'Please contact your supervisor'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Hours:</span>
                      <span className="ml-2 font-medium">{currentWeekSubmission.totalHours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Shifts:</span>
                      <span className="ml-2 font-medium">{currentWeekSubmission.totalShifts}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Submit your timesheet for this week ({format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}) for supervisor approval.
                </p>
                {shifts.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No completed shifts to submit for this week.
                  </p>
                ) : (
                  <Button
                    onClick={handleSubmitTimesheet}
                    disabled={submitting || shifts.length === 0}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit {shifts.length} Shift{shifts.length !== 1 ? 's' : ''} ({totalHours}h {remainingMinutes}m)
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Shift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No shifts found for selected period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b dark:border-gray-700">
                  <tr className="text-left">
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Start</th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">End</th>
                    <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Duration</th>
                    {viewMode === 'elder' && (
                      <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Caregiver</th>
                    )}
                    {viewMode === 'caregiver' && (
                      <th className="pb-3 text-sm font-semibold text-gray-900 dark:text-white">Loved One</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {shifts.map((shift) => {
                    const duration = shift.actualDuration
                      ? shift.actualDuration
                      : shift.endTime && shift.startTime
                      ? differenceInMinutes(shift.endTime, shift.startTime)
                      : 0;
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;

                    return (
                      <tr key={shift.id}>
                        <td className="py-3 text-sm text-gray-900 dark:text-white">
                          {format(shift.startTime, 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          {format(shift.startTime, 'h:mm a')}
                        </td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                          {shift.endTime ? format(shift.endTime, 'h:mm a') : 'N/A'}
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {hours}h {minutes}m
                        </td>
                        {viewMode === 'elder' && (
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {shift.caregiverId}
                          </td>
                        )}
                        {viewMode === 'caregiver' && (
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                            {availableElders.find(e => e.id === shift.elderId)?.name || shift.elderId}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
