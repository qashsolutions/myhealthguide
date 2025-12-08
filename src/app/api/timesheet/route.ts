/**
 * Timesheet API
 * Uses Admin SDK for shift session queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';

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
      // Show all shifts for this caregiver
      shiftsQuery = db.collection('shiftSessions')
        .where('caregiverId', '==', authResult.userId)
        .where('status', '==', 'completed')
        .orderBy('startTime', 'desc');
    } else if (elderId) {
      // Show all shifts for this elder (all caregivers)
      shiftsQuery = db.collection('shiftSessions')
        .where('elderId', '==', elderId)
        .where('status', '==', 'completed')
        .orderBy('startTime', 'desc');
    } else {
      return NextResponse.json({ success: true, shifts: [] });
    }

    const snapshot = await shiftsQuery.get();

    let shifts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate(),
        endTime: data.endTime?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
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
