/**
 * Shift Offer Timeout Handler
 * Runs every 10 minutes to escalate expired cascade shift offers
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Process expired shift offers:
 * - Query shifts where status == 'offered' AND cascadeState.currentOfferExpiresAt <= now
 * - For each: mark current offer as timed_out, escalate to next candidate or set unfilled
 */
export const processShiftOfferTimeouts = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();

    try {
      // Query shifts that are in 'offered' status with expired offers
      const expiredQuery = db.collection('scheduledShifts')
        .where('status', '==', 'offered')
        .where('cascadeState.currentOfferExpiresAt', '<=', now);

      const snapshot = await expiredQuery.get();

      if (snapshot.empty) {
        console.log('No expired shift offers to process');
        return;
      }

      console.log(`Processing ${snapshot.size} expired shift offer(s)`);

      for (const shiftDoc of snapshot.docs) {
        const shiftRef = db.collection('scheduledShifts').doc(shiftDoc.id);

        try {
          await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(shiftRef);
            if (!freshDoc.exists) return;

            const shift = freshDoc.data()!;

            // Double-check status to prevent double-processing
            if (shift.status !== 'offered') return;

            const cascadeState = shift.cascadeState;
            if (!cascadeState) return;

            const expiresAt = cascadeState.currentOfferExpiresAt?.toDate
              ? cascadeState.currentOfferExpiresAt.toDate()
              : new Date(cascadeState.currentOfferExpiresAt);

            if (expiresAt > now) return; // Not actually expired

            // Mark current offer as timed_out
            const updatedHistory = [...(cascadeState.offerHistory || [])];
            const currentIndex = cascadeState.currentOfferIndex;
            const currentCandidate = cascadeState.rankedCandidates[currentIndex];

            if (currentCandidate) {
              const historyIndex = updatedHistory.findIndex(
                (h: any) => h.caregiverId === currentCandidate.caregiverId && h.response === 'pending'
              );
              if (historyIndex >= 0) {
                updatedHistory[historyIndex] = {
                  ...updatedHistory[historyIndex],
                  response: 'timed_out',
                  respondedAt: now
                };
              }
            }

            const nextIndex = currentIndex + 1;
            const nextCandidate = cascadeState.rankedCandidates[nextIndex];

            if (nextCandidate) {
              // Escalate to next candidate
              const offerExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);

              updatedHistory.push({
                caregiverId: nextCandidate.caregiverId,
                response: 'pending'
              });

              transaction.update(shiftRef, {
                caregiverId: nextCandidate.caregiverId,
                caregiverName: nextCandidate.caregiverName,
                'cascadeState.currentOfferIndex': nextIndex,
                'cascadeState.currentOfferExpiresAt': offerExpiresAt,
                'cascadeState.offerHistory': updatedHistory,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

              // Notify next candidate
              const shiftDate = shift.date?.toDate ? shift.date.toDate() : new Date(shift.date);
              const notifRef = db.collection('user_notifications').doc();
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
                sourceId: shiftDoc.id,
                data: {
                  shiftId: shiftDoc.id,
                  offerExpiresAt: offerExpiresAt.toISOString(),
                  elderName: shift.elderName,
                  startTime: shift.startTime,
                  endTime: shift.endTime
                },
                read: false,
                dismissed: false,
                actionRequired: true,
                expiresAt: offerExpiresAt,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              console.log(`Shift ${shiftDoc.id}: escalated to candidate #${nextIndex} (${nextCandidate.caregiverName})`);
            } else {
              // All exhausted → mark unfilled
              transaction.update(shiftRef, {
                status: 'unfilled',
                caregiverId: '',
                caregiverName: '',
                'cascadeState.currentOfferIndex': nextIndex,
                'cascadeState.currentOfferExpiresAt': null,
                'cascadeState.offerHistory': updatedHistory,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });

              // Notify owner
              const shiftDate = shift.date?.toDate ? shift.date.toDate() : new Date(shift.date);
              const ownerNotifRef = db.collection('user_notifications').doc();
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
                sourceId: shiftDoc.id,
                data: { shiftId: shiftDoc.id },
                read: false,
                dismissed: false,
                actionRequired: true,
                expiresAt: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              });

              console.log(`Shift ${shiftDoc.id}: all candidates exhausted, marked unfilled`);
            }
          });
        } catch (err) {
          console.error(`Error processing timeout for shift ${shiftDoc.id}:`, err);
        }
      }

      console.log('Shift offer timeout processing complete');
    } catch (error) {
      console.error('Error in processShiftOfferTimeouts:', error);
    }
  });
