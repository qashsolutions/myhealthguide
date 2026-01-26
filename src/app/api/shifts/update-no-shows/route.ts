/**
 * API Route: Update No-Show Statuses
 *
 * Automatically updates shift statuses from 'scheduled' to 'no_show'
 * when the current time exceeds shift start time + grace period.
 *
 * Called by the agency owner dashboard to ensure consistent status display.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { Timestamp } from 'firebase-admin/firestore';

// Grace period in minutes before marking as no-show
const NO_SHOW_GRACE_PERIOD_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agencyId } = body;

    if (!agencyId) {
      return NextResponse.json({ success: false, error: 'Agency ID is required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify user is super_admin of this agency
    const agencyDoc = await db.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agencyDoc.data();
    if (agencyData?.superAdminId !== authResult.userId) {
      return NextResponse.json({ success: false, error: 'Access denied - Super Admin only' }, { status: 403 });
    }

    // Get today's date range
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Query today's scheduled shifts
    const shiftsRef = db.collection('scheduledShifts');
    const shiftsSnapshot = await shiftsRef
      .where('agencyId', '==', agencyId)
      .where('status', '==', 'scheduled')
      .get();

    let updatedCount = 0;
    const batch = db.batch();

    shiftsSnapshot.docs.forEach(doc => {
      const data = doc.data();

      // Get shift date
      let shiftDate: Date;
      if (data.date instanceof Timestamp) {
        shiftDate = data.date.toDate();
      } else if (data.date?._seconds) {
        shiftDate = new Date(data.date._seconds * 1000);
      } else {
        shiftDate = new Date(data.date);
      }

      // Only process today's shifts
      if (shiftDate >= today && shiftDate < tomorrow) {
        // Parse start time
        const startTime = data.startTime || '09:00';
        const [startH, startM] = startTime.split(':').map(Number);

        // Calculate shift start + grace period
        const shiftStart = new Date(today);
        shiftStart.setHours(startH, startM, 0, 0);
        const graceEnd = new Date(shiftStart.getTime() + NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000);

        // If current time is past grace period, mark as no_show
        if (now > graceEnd) {
          batch.update(doc.ref, {
            status: 'no_show',
            noShowMarkedAt: Timestamp.now(),
            noShowReason: 'auto_detected'
          });
          updatedCount++;
        }
      }
    });

    // Commit batch update if there are any
    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: updatedCount > 0
        ? `Updated ${updatedCount} shift(s) to no_show status`
        : 'No shifts needed updating'
    });

  } catch (error) {
    console.error('[update-no-shows] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update no-show statuses' },
      { status: 500 }
    );
  }
}
