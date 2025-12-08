/**
 * Shift Handoff API
 * Uses Admin SDK for shift sessions and handoff notes
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
    const elderId = searchParams.get('elderId');
    const type = searchParams.get('type'); // 'active', 'handoffs', 'scheduled'

    if (!elderId) {
      return NextResponse.json({ success: false, error: 'elderId is required' }, { status: 400 });
    }

    const db = getAdminDb();

    if (type === 'active') {
      // Get active shift for this caregiver and elder - query without orderBy, sort in memory
      const shiftsSnap = await db.collection('shiftSessions')
        .where('caregiverId', '==', authResult.userId)
        .where('elderId', '==', elderId)
        .where('status', '==', 'active')
        .get();

      if (shiftsSnap.empty) {
        return NextResponse.json({ success: true, activeShift: null });
      }

      // Sort by startTime desc and get the first one
      const shifts = shiftsSnap.docs
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

      const activeShift = shifts[0] || null;

      return NextResponse.json({ success: true, activeShift });
    }

    if (type === 'handoffs') {
      // Get recent handoff notes - query without orderBy, sort in memory
      const handoffsSnap = await db.collection('shiftHandoffNotes')
        .where('elderId', '==', elderId)
        .get();

      const handoffs = handoffsSnap.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            generatedAt: data.generatedAt?.toDate(),
            shiftPeriod: {
              start: data.shiftPeriod?.start?.toDate(),
              end: data.shiftPeriod?.end?.toDate()
            }
          };
        })
        .sort((a, b) => {
          const dateA = a.generatedAt?.getTime() || 0;
          const dateB = b.generatedAt?.getTime() || 0;
          return dateB - dateA; // desc
        })
        .slice(0, 5);

      return NextResponse.json({ success: true, handoffs });
    }

    if (type === 'scheduled') {
      // Find scheduled shift for clock-in
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Query scheduled shifts
      const shiftsSnap = await db.collection('scheduledShifts')
        .where('caregiverId', '==', authResult.userId)
        .where('elderId', '==', elderId)
        .where('status', '==', 'scheduled')
        .get();

      // Filter by time window in memory
      const scheduledShifts = shiftsSnap.docs
        .map(doc => {
          const data = doc.data();
          // Parse time string to today's date
          const [hours, minutes] = (data.startTime || '09:00').split(':').map(Number);
          const shiftStartTime = new Date();
          shiftStartTime.setHours(hours, minutes, 0, 0);

          return {
            id: doc.id,
            ...data,
            parsedStartTime: shiftStartTime
          };
        })
        .filter(shift => {
          return shift.parsedStartTime >= twoHoursAgo && shift.parsedStartTime <= twoHoursFromNow;
        });

      const scheduledShift = scheduledShifts.length > 0 ? scheduledShifts[0] : null;

      return NextResponse.json({ success: true, scheduledShift });
    }

    return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });

  } catch (error) {
    console.error('Error in shift handoff API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
