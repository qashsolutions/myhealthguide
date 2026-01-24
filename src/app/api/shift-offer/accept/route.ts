/**
 * POST /api/shift-offer/accept
 * Caregiver accepts a cascade shift offer
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await verifyAuthToken(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { shiftId } = await request.json();
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const shiftRef = adminDb.collection('scheduledShifts').doc(shiftId);

    // Use a transaction to prevent race conditions
    await adminDb.runTransaction(async (transaction) => {
      const shiftDoc = await transaction.get(shiftRef);
      if (!shiftDoc.exists) {
        throw new Error('Shift not found');
      }

      const shift = shiftDoc.data()!;

      // 2. Verify shift is in 'offered' status
      if (shift.status !== 'offered') {
        throw new Error('Shift is no longer available for acceptance');
      }

      // 3. Verify caller is the current offeree
      const cascadeState = shift.cascadeState;
      if (!cascadeState) {
        throw new Error('Shift has no cascade state');
      }

      const currentIndex = cascadeState.currentOfferIndex;
      const currentCandidate = cascadeState.rankedCandidates[currentIndex];

      if (!currentCandidate || currentCandidate.caregiverId !== auth.userId) {
        throw new Error('You are not the current offer recipient');
      }

      // 4. Verify not expired
      const expiresAt = cascadeState.currentOfferExpiresAt?.toDate
        ? cascadeState.currentOfferExpiresAt.toDate()
        : new Date(cascadeState.currentOfferExpiresAt);

      if (expiresAt && expiresAt < new Date()) {
        throw new Error('This offer has expired');
      }

      // 5. Accept: update shift status and lock caregiver
      const updatedOfferHistory = [...(cascadeState.offerHistory || [])];
      const historyIndex = updatedOfferHistory.findIndex(
        (h: any) => h.caregiverId === auth.userId && h.response === 'pending'
      );
      if (historyIndex >= 0) {
        updatedOfferHistory[historyIndex] = {
          ...updatedOfferHistory[historyIndex],
          response: 'accepted',
          respondedAt: new Date()
        };
      }

      transaction.update(shiftRef, {
        status: 'scheduled',
        caregiverId: currentCandidate.caregiverId,
        caregiverName: currentCandidate.caregiverName,
        'cascadeState.offerHistory': updatedOfferHistory,
        'cascadeState.currentOfferExpiresAt': null,
        updatedAt: FieldValue.serverTimestamp()
      });

      // 6. Create a shift_assigned notification for the caregiver
      const notifRef = adminDb.collection('user_notifications').doc();
      const shiftDate = shift.date?.toDate ? shift.date.toDate() : new Date(shift.date);
      transaction.set(notifRef, {
        userId: auth.userId,
        groupId: shift.groupId,
        elderId: shift.elderId,
        type: 'shift_assigned',
        title: 'Shift Confirmed',
        message: `Your shift with ${shift.elderName} on ${shiftDate.toLocaleDateString()} (${shift.startTime}–${shift.endTime}) has been confirmed.`,
        priority: 'medium',
        actionUrl: '/dashboard/calendar',
        sourceCollection: 'scheduledShifts',
        sourceId: shiftId,
        data: { shiftId },
        read: false,
        dismissed: false,
        actionRequired: false,
        expiresAt: null,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error accepting shift offer:', error);
    const status = error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to accept shift offer' }, { status });
  }
}
