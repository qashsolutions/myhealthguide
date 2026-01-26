/**
 * API Route: Confirm Shift
 *
 * Allows caregivers to confirm their shift assignment,
 * or owners to manually confirm on behalf of a caregiver.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shiftId, ownerConfirm, note } = body;

    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'Shift ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const shiftRef = db.collection('scheduledShifts').doc(shiftId);
    const shiftDoc = await shiftRef.get();

    if (!shiftDoc.exists) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }

    const shiftData = shiftDoc.data();
    if (!shiftData) {
      return NextResponse.json({ success: false, error: 'Shift data not found' }, { status: 404 });
    }

    const isOwner = ownerConfirm === true;
    const isCaregiver = shiftData.caregiverId === authResult.userId;

    // Verify authorization
    if (isOwner) {
      // Verify user is agency owner
      const agencyDoc = await db.collection('agencies').doc(shiftData.agencyId).get();
      if (!agencyDoc.exists || agencyDoc.data()?.superAdminId !== authResult.userId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    } else if (!isCaregiver) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Check if shift can be confirmed
    const validStatuses = ['pending_confirmation', 'scheduled'];
    if (!validStatuses.includes(shiftData.status)) {
      return NextResponse.json({
        success: false,
        error: `Shift cannot be confirmed (current status: ${shiftData.status})`
      }, { status: 400 });
    }

    // Update shift status
    const updateData: Record<string, any> = {
      status: isOwner ? 'owner_confirmed' : 'confirmed',
      updatedAt: Timestamp.now(),
      'confirmation.respondedAt': Timestamp.now(),
      'confirmation.respondedVia': isOwner ? 'owner_manual' : 'app',
      'confirmation.response': 'confirmed',
    };

    if (isOwner) {
      updateData['confirmation.ownerConfirmedAt'] = Timestamp.now();
      updateData['confirmation.ownerConfirmedBy'] = authResult.userId;
      if (note) {
        updateData['confirmation.ownerConfirmNote'] = note;
      }
    }

    await shiftRef.update(updateData);

    // If caregiver confirmed, notify the owner
    if (!isOwner && shiftData.agencyId) {
      const agencyDoc = await db.collection('agencies').doc(shiftData.agencyId).get();
      const ownerId = agencyDoc.data()?.superAdminId;

      if (ownerId) {
        // Create in-app notification for owner
        await db.collection('user_notifications').add({
          userId: ownerId,
          groupId: shiftData.groupId || '',
          type: 'shift_confirmed',
          title: 'Shift Confirmed',
          message: `${shiftData.caregiverName || 'Caregiver'} confirmed their shift on ${formatDate(shiftData.date)}`,
          priority: 'low',
          actionUrl: '/dashboard/agency/schedule',
          read: false,
          dismissed: false,
          actionRequired: false,
          createdAt: Timestamp.now(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shift confirmed successfully',
      status: isOwner ? 'owner_confirmed' : 'confirmed'
    });

  } catch (error) {
    console.error('[confirm-shift] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to confirm shift' }, { status: 500 });
  }
}

function formatDate(date: any): string {
  if (!date) return 'unknown date';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
