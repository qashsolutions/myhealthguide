/**
 * POST /api/shift-offer/decline
 * Caregiver declines a cascade shift offer; escalates to next candidate or marks unfilled
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

    const { shiftId, reason } = await request.json();
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 });
    }

    console.log('[shift-offer/decline] Starting decline for shiftId:', shiftId, 'userId:', auth.userId);

    const adminDb = getAdminDb();
    const shiftRef = adminDb.collection('scheduledShifts').doc(shiftId);

    let cascadeResult: { nextCaregiverId?: string; status: string } = { status: 'unknown' };

    await adminDb.runTransaction(async (transaction) => {
      const shiftDoc = await transaction.get(shiftRef);
      if (!shiftDoc.exists) {
        throw new Error('Shift not found');
      }

      const shift = shiftDoc.data()!;
      console.log('[shift-offer/decline] Shift status:', shift.status, 'caregiverId:', shift.caregiverId);

      // 2. Verify shift is in 'offered' status
      if (shift.status !== 'offered') {
        throw new Error('Shift is no longer in offered status');
      }

      const cascadeState = shift.cascadeState;
      if (!cascadeState) {
        throw new Error('Shift has no cascade state');
      }

      // 3. Verify caller is current offeree
      const currentIndex = cascadeState.currentOfferIndex;
      const currentCandidate = cascadeState.rankedCandidates[currentIndex];

      console.log('[shift-offer/decline] currentIndex:', currentIndex,
        'currentCandidate:', currentCandidate?.caregiverId,
        'auth.userId:', auth.userId,
        'totalCandidates:', cascadeState.rankedCandidates?.length);

      if (!currentCandidate || currentCandidate.caregiverId !== auth.userId) {
        console.error('[shift-offer/decline] Auth mismatch! currentCandidate.caregiverId:',
          currentCandidate?.caregiverId, 'auth.userId:', auth.userId);
        throw new Error('You are not the current offer recipient');
      }

      // 4. Mark current offer as declined
      const updatedOfferHistory = [...(cascadeState.offerHistory || [])];
      const historyIndex = updatedOfferHistory.findIndex(
        (h: any) => h.caregiverId === auth.userId && h.response === 'pending'
      );
      if (historyIndex >= 0) {
        updatedOfferHistory[historyIndex] = {
          ...updatedOfferHistory[historyIndex],
          response: 'declined',
          respondedAt: new Date()
        };
      }

      const nextIndex = currentIndex + 1;
      const nextCandidate = cascadeState.rankedCandidates[nextIndex];

      console.log('[shift-offer/decline] nextIndex:', nextIndex,
        'nextCandidate:', nextCandidate ? { id: nextCandidate.caregiverId, name: nextCandidate.caregiverName } : 'NONE');

      if (nextCandidate) {
        // 5a. Offer to next candidate
        const offerExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

        updatedOfferHistory.push({
          caregiverId: nextCandidate.caregiverId,
          response: 'pending'
        });

        console.log('[shift-offer/decline] Creating notification for next caregiver:', nextCandidate.caregiverId);
        cascadeResult = { nextCaregiverId: nextCandidate.caregiverId, status: 'cascaded' };

        transaction.update(shiftRef, {
          caregiverId: nextCandidate.caregiverId,
          caregiverName: nextCandidate.caregiverName,
          'cascadeState.currentOfferIndex': nextIndex,
          'cascadeState.currentOfferExpiresAt': offerExpiresAt,
          'cascadeState.offerHistory': updatedOfferHistory,
          updatedAt: FieldValue.serverTimestamp()
        });

        // Send notification to next candidate
        const shiftDate = shift.date?.toDate ? shift.date.toDate() : new Date(shift.date);
        const notifRef = adminDb.collection('user_notifications').doc();
        transaction.set(notifRef, {
          userId: nextCandidate.caregiverId,
          groupId: shift.groupId,
          elderId: shift.elderId,
          type: 'shift_offer',
          title: 'Shift Available',
          message: `A shift with ${shift.elderName} on ${shiftDate.toLocaleDateString()} (${shift.startTime}–${shift.endTime}) is available. Accept within 30 minutes.`,
          priority: 'high',
          actionUrl: '/dashboard/calendar',
          sourceCollection: 'scheduledShifts',
          sourceId: shiftId,
          data: {
            shiftId,
            offerExpiresAt: offerExpiresAt.toISOString(),
            elderName: shift.elderName,
            startTime: shift.startTime,
            endTime: shift.endTime
          },
          read: false,
          dismissed: false,
          actionRequired: true,
          expiresAt: offerExpiresAt,
          createdAt: FieldValue.serverTimestamp()
        });
      } else {
        // 5b. All candidates exhausted → mark unfilled
        console.log('[shift-offer/decline] No more candidates, marking shift as unfilled');
        cascadeResult = { status: 'unfilled' };

        transaction.update(shiftRef, {
          status: 'unfilled',
          caregiverId: '',
          caregiverName: '',
          'cascadeState.currentOfferIndex': nextIndex,
          'cascadeState.currentOfferExpiresAt': null,
          'cascadeState.offerHistory': updatedOfferHistory,
          updatedAt: FieldValue.serverTimestamp()
        });

        // Notify owner
        const shiftDate = shift.date?.toDate ? shift.date.toDate() : new Date(shift.date);
        const ownerNotifRef = adminDb.collection('user_notifications').doc();
        transaction.set(ownerNotifRef, {
          userId: shift.createdBy,
          groupId: shift.groupId,
          elderId: shift.elderId,
          type: 'shift_unfilled',
          title: 'Shift Unfilled',
          message: `No caregiver accepted the shift with ${shift.elderName} on ${shiftDate.toLocaleDateString()} (${shift.startTime}–${shift.endTime}). Please assign manually.`,
          priority: 'high',
          actionUrl: '/dashboard/schedule',
          sourceCollection: 'scheduledShifts',
          sourceId: shiftId,
          data: { shiftId },
          read: false,
          dismissed: false,
          actionRequired: true,
          expiresAt: null,
          createdAt: FieldValue.serverTimestamp()
        });
      }
    });

    console.log('[shift-offer/decline] SUCCESS - cascadeResult:', cascadeResult);
    return NextResponse.json({ success: true, ...cascadeResult });
  } catch (error: any) {
    console.error('Error declining shift offer:', error);
    const status = error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: error.message || 'Failed to decline shift offer' }, { status });
  }
}
