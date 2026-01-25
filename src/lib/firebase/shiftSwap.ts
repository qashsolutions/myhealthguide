/**
 * Shift Swap Management Service
 *
 * Allows caregivers to swap shifts with each other:
 * - Request to swap with specific caregiver or anyone available
 * - Accept/reject swap requests
 * - SuperAdmin approval for swaps
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import type { ShiftSwapRequest, ScheduledShift } from '@/types';
import {
  notifyShiftSwapRequest,
  notifyShiftSwapAccepted,
  notifyShiftAssigned,
  notifyShiftCancelled
} from '@/lib/notifications/caregiverNotifications';

/**
 * Create a shift swap request
 */
export async function createShiftSwapRequest(
  agencyId: string,
  requestingCaregiverId: string,
  requestingCaregiverName: string,
  shiftToSwapId: string,
  shiftToSwap: ShiftSwapRequest['shiftToSwap'],
  targetCaregiverId?: string,
  targetCaregiverName?: string,
  offerShiftId?: string,
  offerShift?: ShiftSwapRequest['offerShift'],
  reason?: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const swapRequest: Omit<ShiftSwapRequest, 'id'> = {
      agencyId,
      requestingCaregiverId,
      requestingCaregiverName,
      targetCaregiverId,
      targetCaregiverName,
      shiftToSwapId,
      shiftToSwap,
      offerShiftId,
      offerShift,
      reason,
      status: 'pending',
      requestedAt: new Date()
    };

    const requestRef = await addDoc(collection(db, 'shiftSwapRequests'), swapRequest);

    // Notify target caregiver if specific
    if (targetCaregiverId) {
      await notifyShiftSwapRequest(agencyId, targetCaregiverId, {
        id: requestRef.id,
        ...swapRequest
      });
    }

    return { success: true, requestId: requestRef.id };
  } catch (error: any) {
    console.error('Error creating shift swap request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get swap requests for a caregiver
 */
export async function getSwapRequests(
  caregiverId: string,
  agencyId: string,
  type: 'received' | 'sent' = 'received'
): Promise<ShiftSwapRequest[]> {
  try {
    const mapDocToRequest = (doc: any): ShiftSwapRequest => ({
      id: doc.id,
      ...doc.data(),
      shiftToSwap: {
        ...doc.data().shiftToSwap,
        date: doc.data().shiftToSwap.date?.toDate()
      },
      offerShift: doc.data().offerShift ? {
        ...doc.data().offerShift,
        date: doc.data().offerShift.date?.toDate()
      } : undefined,
      requestedAt: doc.data().requestedAt?.toDate(),
      acceptedAt: doc.data().acceptedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    });

    if (type === 'received') {
      // Run two queries that match Firestore security rules:
      // 1. Requests targeted at this caregiver
      // 2. Open swaps (targetCaregiverId == null) in the agency
      const [targetedSnapshot, openSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'shiftSwapRequests'),
          where('targetCaregiverId', '==', caregiverId),
          where('status', '==', 'pending'),
          orderBy('requestedAt', 'desc')
        )),
        getDocs(query(
          collection(db, 'shiftSwapRequests'),
          where('agencyId', '==', agencyId),
          where('targetCaregiverId', '==', null),
          where('status', '==', 'pending'),
          orderBy('requestedAt', 'desc')
        ))
      ]);

      // Merge results and deduplicate by id
      const requestsMap = new Map<string, ShiftSwapRequest>();
      targetedSnapshot.docs.forEach(doc => requestsMap.set(doc.id, mapDocToRequest(doc)));
      openSnapshot.docs.forEach(doc => {
        if (!requestsMap.has(doc.id)) {
          requestsMap.set(doc.id, mapDocToRequest(doc));
        }
      });

      // Sort by requestedAt descending
      return Array.from(requestsMap.values()).sort(
        (a, b) => (b.requestedAt?.getTime() || 0) - (a.requestedAt?.getTime() || 0)
      );
    } else {
      // Requests this caregiver sent
      const snapshot = await getDocs(query(
        collection(db, 'shiftSwapRequests'),
        where('requestingCaregiverId', '==', caregiverId),
        orderBy('requestedAt', 'desc')
      ));

      return snapshot.docs.map(mapDocToRequest);
    }
  } catch (error) {
    console.warn('Error getting swap requests:', error);
    return [];
  }
}

/**
 * Accept a shift swap request
 */
export async function acceptShiftSwapRequest(
  swapRequestId: string,
  acceptingCaregiverId: string,
  acceptingCaregiverName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the swap request
    const swapRequestRef = doc(db, 'shiftSwapRequests', swapRequestId);
    const swapRequestSnap = await getDoc(swapRequestRef);

    if (!swapRequestSnap.exists()) {
      return { success: false, error: 'Swap request not found' };
    }

    const swapRequest = {
      id: swapRequestSnap.id,
      ...swapRequestSnap.data(),
      shiftToSwap: {
        ...swapRequestSnap.data().shiftToSwap,
        date: swapRequestSnap.data().shiftToSwap.date?.toDate()
      },
      requestedAt: swapRequestSnap.data().requestedAt?.toDate()
    } as ShiftSwapRequest;

    // Get the shift to swap
    const shiftRef = doc(db, 'scheduledShifts', swapRequest.shiftToSwapId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      return { success: false, error: 'Shift not found' };
    }

    const shift = {
      id: shiftSnap.id,
      ...shiftSnap.data(),
      date: shiftSnap.data().date?.toDate()
    } as ScheduledShift;

    // Update shift to new caregiver
    await updateDoc(shiftRef, {
      caregiverId: acceptingCaregiverId,
      caregiverName: acceptingCaregiverName,
      updatedAt: new Date()
    });

    // Update swap request status
    await updateDoc(swapRequestRef, {
      status: 'accepted',
      acceptedBy: acceptingCaregiverId,
      acceptedAt: new Date()
    });

    // Notify requesting caregiver
    await notifyShiftSwapAccepted(
      swapRequest.agencyId,
      swapRequest.requestingCaregiverId,
      swapRequest,
      acceptingCaregiverName
    );

    // Notify accepting caregiver of new shift
    await notifyShiftAssigned(swapRequest.agencyId, acceptingCaregiverId, {
      ...shift,
      caregiverId: acceptingCaregiverId,
      caregiverName: acceptingCaregiverName
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error accepting swap request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a shift swap request
 */
export async function rejectShiftSwapRequest(
  swapRequestId: string,
  rejectingCaregiverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const swapRequestRef = doc(db, 'shiftSwapRequests', swapRequestId);
    await updateDoc(swapRequestRef, {
      status: 'rejected',
      reviewedBy: rejectingCaregiverId,
      reviewedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting swap request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a shift swap request (by requester)
 */
export async function cancelShiftSwapRequest(
  swapRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const swapRequestRef = doc(db, 'shiftSwapRequests', swapRequestId);
    await updateDoc(swapRequestRef, {
      status: 'cancelled',
      reviewedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling swap request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all swap requests for admin review
 */
export async function getAllSwapRequests(
  agencyId: string
): Promise<ShiftSwapRequest[]> {
  try {
    const swapRequestsQuery = query(
      collection(db, 'shiftSwapRequests'),
      where('agencyId', '==', agencyId),
      orderBy('requestedAt', 'desc')
    );

    const snapshot = await getDocs(swapRequestsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      shiftToSwap: {
        ...doc.data().shiftToSwap,
        date: doc.data().shiftToSwap.date?.toDate()
      },
      offerShift: doc.data().offerShift ? {
        ...doc.data().offerShift,
        date: doc.data().offerShift.date?.toDate()
      } : undefined,
      requestedAt: doc.data().requestedAt?.toDate(),
      acceptedAt: doc.data().acceptedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    })) as ShiftSwapRequest[];
  } catch (error) {
    console.error('Error getting all swap requests:', error);
    return [];
  }
}
