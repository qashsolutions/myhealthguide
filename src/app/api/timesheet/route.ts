/**
 * Timesheet API
 * Uses Admin SDK for shift session queries and timesheet submission
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { TimesheetSubmission, TimesheetSubmissionStatus } from '@/types/timesheet';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get('viewMode') || 'caregiver'; // 'caregiver' or 'elder'
    const elderId = searchParams.get('elderId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = getAdminDb();

    let shiftsQuery;

    if (viewMode === 'caregiver') {
      // Show all shifts for this caregiver - query without orderBy
      shiftsQuery = db.collection('shiftSessions')
        .where('caregiverId', '==', authResult.userId)
        .where('status', '==', 'completed');
    } else if (elderId) {
      // Show all shifts for this elder (all caregivers) - query without orderBy
      shiftsQuery = db.collection('shiftSessions')
        .where('elderId', '==', elderId)
        .where('status', '==', 'completed');
    } else {
      return NextResponse.json({ success: true, shifts: [] });
    }

    const snapshot = await shiftsQuery.get();

    let shifts = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate(),
          endTime: data.endTime?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      })
      .sort((a, b) => {
        const dateA = a.startTime?.getTime() || 0;
        const dateB = b.startTime?.getTime() || 0;
        return dateB - dateA; // desc
      });

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      shifts = shifts.filter(shift => {
        if (!shift.startTime) return false;
        return shift.startTime >= start && shift.startTime <= end;
      });
    }

    return NextResponse.json({ success: true, shifts });

  } catch (error) {
    console.error('Error in timesheet API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timesheet
 * Submit a weekly timesheet for approval
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, weekStartDate, agencyId, caregiverName } = body;

    const db = getAdminDb();

    if (action === 'submit') {
      // Validate required fields
      if (!weekStartDate || !agencyId) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      // Check if already submitted
      const existingQuery = await db.collection('timesheetSubmissions')
        .where('caregiverId', '==', authResult.userId)
        .where('weekStartDate', '==', Timestamp.fromDate(weekStart))
        .where('status', 'in', ['submitted', 'approved'])
        .get();

      if (!existingQuery.empty) {
        return NextResponse.json({ success: false, error: 'Timesheet already submitted for this week' }, { status: 400 });
      }

      // Get all completed shifts for this week
      const shiftsQuery = await db.collection('shiftSessions')
        .where('caregiverId', '==', authResult.userId)
        .where('status', '==', 'completed')
        .get();

      interface ShiftData {
        id: string;
        startTime: Date | null;
        endTime: Date | null;
        actualDuration?: number;
        clockInVerified?: boolean;
        clockInOverride?: string;
        clockOutOverride?: string;
      }

      const weekShifts: ShiftData[] = shiftsQuery.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            startTime: data.startTime?.toDate() || null,
            endTime: data.endTime?.toDate() || null,
            actualDuration: data.actualDuration,
            clockInVerified: data.clockInVerified,
            clockInOverride: data.clockInOverride,
            clockOutOverride: data.clockOutOverride,
          };
        })
        .filter(shift => {
          if (!shift.startTime) return false;
          return shift.startTime >= weekStart && shift.startTime <= weekEnd;
        });

      if (weekShifts.length === 0) {
        return NextResponse.json({ success: false, error: 'No completed shifts found for this week' }, { status: 400 });
      }

      // Calculate totals
      let totalHours = 0;
      let verifiedShifts = 0;
      let overrideShifts = 0;

      for (const shift of weekShifts) {
        if (shift.actualDuration) {
          totalHours += shift.actualDuration / 60; // Convert minutes to hours
        } else if (shift.startTime && shift.endTime) {
          const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }

        if (shift.clockInVerified) {
          verifiedShifts++;
        }
        if (shift.clockInOverride || shift.clockOutOverride) {
          overrideShifts++;
        }
      }

      // Create submission
      const submission: Omit<TimesheetSubmission, 'id'> = {
        caregiverId: authResult.userId,
        caregiverName: caregiverName || 'Caregiver',
        agencyId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        totalHours: Math.round(totalHours * 100) / 100,
        totalShifts: weekShifts.length,
        verifiedShifts,
        overrideShifts,
        entryIds: weekShifts.map(s => s.id),
        status: 'submitted' as TimesheetSubmissionStatus,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await db.collection('timesheetSubmissions').add({
        ...submission,
        weekStartDate: Timestamp.fromDate(submission.weekStartDate),
        weekEndDate: Timestamp.fromDate(submission.weekEndDate),
        submittedAt: Timestamp.fromDate(submission.submittedAt!),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        submissionId: docRef.id,
        submission: { ...submission, id: docRef.id }
      });
    }

    if (action === 'getSubmissions') {
      // Get all submissions for this caregiver
      const submissionsQuery = await db.collection('timesheetSubmissions')
        .where('caregiverId', '==', authResult.userId)
        .orderBy('weekStartDate', 'desc')
        .limit(10)
        .get();

      const submissions = submissionsQuery.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          weekStartDate: data.weekStartDate?.toDate(),
          weekEndDate: data.weekEndDate?.toDate(),
          submittedAt: data.submittedAt?.toDate(),
          reviewedAt: data.reviewedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      });

      return NextResponse.json({ success: true, submissions });
    }

    // ============= SUPER ADMIN APPROVAL ACTIONS =============

    if (action === 'getPendingApprovals') {
      // Get pending submissions for this agency (super admin only)
      const { agencyId: reqAgencyId } = body;
      if (!reqAgencyId) {
        return NextResponse.json({ success: false, error: 'Agency ID required' }, { status: 400 });
      }

      // Verify user is super admin of this agency
      const userDoc = await db.collection('users').doc(authResult.userId).get();
      const userData = userDoc.data();
      const userAgency = userData?.agencies?.find((a: any) => a.agencyId === reqAgencyId);

      if (!userAgency || (userAgency.role !== 'super_admin' && userAgency.role !== 'caregiver_admin')) {
        return NextResponse.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 403 });
      }

      // Get pending submissions for this agency
      // Note: Using separate queries to avoid needing a composite index
      // Query by agencyId first, then filter by status in memory
      const submissionsQuery = await db.collection('timesheetSubmissions')
        .where('agencyId', '==', reqAgencyId)
        .get();

      const pendingSubmissions = submissionsQuery.docs
        .filter(doc => doc.data().status === 'submitted')
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            weekStartDate: data.weekStartDate?.toDate(),
            weekEndDate: data.weekEndDate?.toDate(),
            submittedAt: data.submittedAt?.toDate(),
            reviewedAt: data.reviewedAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          };
        })
        // Sort by submittedAt descending (most recent first)
        .sort((a, b) => {
          const aTime = a.submittedAt?.getTime() || 0;
          const bTime = b.submittedAt?.getTime() || 0;
          return bTime - aTime;
        });

      return NextResponse.json({ success: true, submissions: pendingSubmissions });
    }

    if (action === 'approve' || action === 'reject') {
      const { submissionId, notes, reviewerName } = body;

      if (!submissionId) {
        return NextResponse.json({ success: false, error: 'Submission ID required' }, { status: 400 });
      }

      // Get the submission
      const submissionDoc = await db.collection('timesheetSubmissions').doc(submissionId).get();
      if (!submissionDoc.exists) {
        return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
      }

      const submissionData = submissionDoc.data();

      // Verify user is super admin of this agency
      const userDoc = await db.collection('users').doc(authResult.userId).get();
      const userData = userDoc.data();
      const userAgency = userData?.agencies?.find((a: any) => a.agencyId === submissionData?.agencyId);

      if (!userAgency || (userAgency.role !== 'super_admin' && userAgency.role !== 'caregiver_admin')) {
        return NextResponse.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 403 });
      }

      // Check submission is in submitted status
      if (submissionData?.status !== 'submitted') {
        return NextResponse.json({ success: false, error: `Cannot ${action} - submission is ${submissionData?.status}` }, { status: 400 });
      }

      // Update submission
      const newStatus: TimesheetSubmissionStatus = action === 'approve' ? 'approved' : 'rejected';
      await db.collection('timesheetSubmissions').doc(submissionId).update({
        status: newStatus,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: authResult.userId,
        reviewerName: reviewerName || userData?.firstName || 'Admin',
        reviewNotes: notes || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // TODO: Send notification to caregiver about approval/rejection

      return NextResponse.json({
        success: true,
        message: `Timesheet ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        submissionId,
        newStatus
      });
    }

    // ============= ADMIN TESTING ACTION (Reset approved to submitted) =============
    if (action === 'resetForTesting') {
      const { submissionId: resetSubmissionId } = body;

      // Verify user is super admin
      const userDoc = await db.collection('users').doc(authResult.userId).get();
      const userData = userDoc.data();
      const isSuperAdmin = userData?.agencies?.some((a: any) => a.role === 'super_admin');

      if (!isSuperAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized - Super admin only' }, { status: 403 });
      }

      // If no submissionId provided, find the most recent approved submission
      let targetSubmissionId = resetSubmissionId;
      if (!targetSubmissionId) {
        const approvedQuery = await db.collection('timesheetSubmissions')
          .where('status', '==', 'approved')
          .limit(10)
          .get();

        if (approvedQuery.empty) {
          return NextResponse.json({ success: false, error: 'No approved submissions found' }, { status: 404 });
        }

        // Find most recent by submittedAt
        const sortedDocs = approvedQuery.docs.sort((a, b) => {
          const aTime = a.data().submittedAt?.toDate()?.getTime() || 0;
          const bTime = b.data().submittedAt?.toDate()?.getTime() || 0;
          return bTime - aTime;
        });
        targetSubmissionId = sortedDocs[0].id;
      }

      // Reset to submitted status
      await db.collection('timesheetSubmissions').doc(targetSubmissionId).update({
        status: 'submitted',
        reviewedAt: null,
        reviewedBy: null,
        reviewerName: null,
        reviewNotes: null,
      });

      return NextResponse.json({
        success: true,
        message: 'Submission reset to submitted status for testing',
        submissionId: targetSubmissionId
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in timesheet submission API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
