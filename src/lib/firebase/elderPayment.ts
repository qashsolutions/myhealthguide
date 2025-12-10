/**
 * Elder Payment Service
 *
 * Manages the payment gate for elder visibility:
 * - SuperAdmin pays for each elder ($30/month)
 * - Caregiver can only see/monitor elders that are paid for
 * - Handles elder subscription lifecycle
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { ElderPaymentStatus } from '@/types';

const ELDER_MONTHLY_RATE = 30; // $30 per elder per month

export class ElderPaymentService {
  /**
   * Get payment status for an elder
   */
  static async getElderPaymentStatus(
    elderId: string,
    agencyId: string
  ): Promise<ElderPaymentStatus | null> {
    try {
      const paymentDoc = await getDoc(
        doc(db, 'elder_payment_status', `${agencyId}_${elderId}`)
      );

      if (!paymentDoc.exists()) {
        return null;
      }

      const data = paymentDoc.data();
      return {
        elderId: data.elderId,
        agencyId: data.agencyId,
        paymentStatus: data.paymentStatus,
        activatedAt: data.activatedAt?.toDate?.() || undefined,
        stripeSubscriptionId: data.stripeSubscriptionId,
        monthlyRate: data.monthlyRate || ELDER_MONTHLY_RATE,
        nextBillingDate: data.nextBillingDate?.toDate?.() || undefined,
      };
    } catch (error) {
      console.error('Error getting elder payment status:', error);
      return null;
    }
  }

  /**
   * Get all paid elders for an agency
   */
  static async getPaidElders(agencyId: string): Promise<string[]> {
    try {
      const paymentsQuery = query(
        collection(db, 'elder_payment_status'),
        where('agencyId', '==', agencyId),
        where('paymentStatus', '==', 'active')
      );

      const snapshot = await getDocs(paymentsQuery);
      return snapshot.docs.map(doc => doc.data().elderId);
    } catch (error) {
      console.error('Error getting paid elders:', error);
      return [];
    }
  }

  /**
   * Check if a caregiver can access an elder (payment check)
   */
  static async canCaregiverAccessElder(
    caregiverId: string,
    elderId: string,
    agencyId: string
  ): Promise<{ canAccess: boolean; reason?: string }> {
    try {
      // First check if caregiver is assigned to this elder
      const assignmentsQuery = query(
        collection(db, 'caregiver_assignments'),
        where('agencyId', '==', agencyId),
        where('caregiverId', '==', caregiverId),
        where('active', '==', true)
      );

      const assignmentSnapshot = await getDocs(assignmentsQuery);
      const isAssigned = assignmentSnapshot.docs.some(doc => {
        const data = doc.data();
        return (data.elderIds || []).includes(elderId);
      });

      if (!isAssigned) {
        return { canAccess: false, reason: 'Not assigned to this elder' };
      }

      // Check payment status
      const paymentStatus = await this.getElderPaymentStatus(elderId, agencyId);

      if (!paymentStatus) {
        return { canAccess: false, reason: 'Payment not set up for this elder' };
      }

      if (paymentStatus.paymentStatus !== 'active') {
        return {
          canAccess: false,
          reason: `Elder payment status: ${paymentStatus.paymentStatus}`,
        };
      }

      return { canAccess: true };
    } catch (error) {
      console.error('Error checking elder access:', error);
      return { canAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Get all accessible elders for a caregiver (assigned + paid)
   */
  static async getAccessibleEldersForCaregiver(
    caregiverId: string,
    agencyId: string
  ): Promise<string[]> {
    try {
      // Get assigned elders
      const assignmentsQuery = query(
        collection(db, 'caregiver_assignments'),
        where('agencyId', '==', agencyId),
        where('caregiverId', '==', caregiverId),
        where('active', '==', true)
      );

      const assignmentSnapshot = await getDocs(assignmentsQuery);
      const assignedElderIds = new Set<string>();

      assignmentSnapshot.docs.forEach(doc => {
        const data = doc.data();
        (data.elderIds || []).forEach((id: string) => assignedElderIds.add(id));
      });

      if (assignedElderIds.size === 0) {
        return [];
      }

      // Get paid elders
      const paidElderIds = await this.getPaidElders(agencyId);

      // Return intersection (assigned AND paid)
      return Array.from(assignedElderIds).filter(id => paidElderIds.includes(id));
    } catch (error) {
      console.error('Error getting accessible elders:', error);
      return [];
    }
  }

  /**
   * Create pending payment status for a new elder
   * Called when SuperAdmin adds an elder to the agency
   */
  static async createPendingPayment(
    elderId: string,
    agencyId: string,
    elderName: string
  ): Promise<void> {
    try {
      const paymentRef = doc(db, 'elder_payment_status', `${agencyId}_${elderId}`);

      await setDoc(paymentRef, {
        elderId,
        agencyId,
        elderName,
        paymentStatus: 'pending',
        monthlyRate: ELDER_MONTHLY_RATE,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error creating pending payment:', error);
      throw error;
    }
  }

  /**
   * Activate elder payment (called after successful Stripe payment)
   */
  static async activateElderPayment(
    elderId: string,
    agencyId: string,
    stripeSubscriptionId: string
  ): Promise<void> {
    try {
      const paymentRef = doc(db, 'elder_payment_status', `${agencyId}_${elderId}`);

      // Calculate next billing date (31 days from now)
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 31);

      await updateDoc(paymentRef, {
        paymentStatus: 'active',
        stripeSubscriptionId,
        activatedAt: Timestamp.now(),
        nextBillingDate: Timestamp.fromDate(nextBillingDate),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error activating elder payment:', error);
      throw error;
    }
  }

  /**
   * Cancel elder payment
   */
  static async cancelElderPayment(
    elderId: string,
    agencyId: string,
    reason?: string
  ): Promise<void> {
    try {
      const paymentRef = doc(db, 'elder_payment_status', `${agencyId}_${elderId}`);

      await updateDoc(paymentRef, {
        paymentStatus: 'cancelled',
        cancelledAt: Timestamp.now(),
        cancellationReason: reason || 'User requested cancellation',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error cancelling elder payment:', error);
      throw error;
    }
  }

  /**
   * Get pending (unpaid) elders for an agency
   * Used to show SuperAdmin which elders need payment
   */
  static async getPendingPaymentElders(agencyId: string): Promise<
    Array<{
      elderId: string;
      elderName: string;
      monthlyRate: number;
      createdAt: Date;
    }>
  > {
    try {
      const paymentsQuery = query(
        collection(db, 'elder_payment_status'),
        where('agencyId', '==', agencyId),
        where('paymentStatus', '==', 'pending')
      );

      const snapshot = await getDocs(paymentsQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          elderId: data.elderId,
          elderName: data.elderName || 'Unknown',
          monthlyRate: data.monthlyRate || ELDER_MONTHLY_RATE,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });
    } catch (error) {
      console.error('Error getting pending payment elders:', error);
      return [];
    }
  }

  /**
   * Get billing summary for an agency
   */
  static async getAgencyBillingSummary(agencyId: string): Promise<{
    activeElders: number;
    pendingElders: number;
    monthlyTotal: number;
    nextBillingDate: Date | null;
  }> {
    try {
      const paymentsQuery = query(
        collection(db, 'elder_payment_status'),
        where('agencyId', '==', agencyId)
      );

      const snapshot = await getDocs(paymentsQuery);

      let activeElders = 0;
      let pendingElders = 0;
      let earliestBillingDate: Date | null = null;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.paymentStatus === 'active') {
          activeElders++;
          const billingDate = data.nextBillingDate?.toDate?.();
          if (
            billingDate &&
            (!earliestBillingDate || billingDate < earliestBillingDate)
          ) {
            earliestBillingDate = billingDate;
          }
        } else if (data.paymentStatus === 'pending') {
          pendingElders++;
        }
      });

      return {
        activeElders,
        pendingElders,
        monthlyTotal: activeElders * ELDER_MONTHLY_RATE,
        nextBillingDate: earliestBillingDate,
      };
    } catch (error) {
      console.error('Error getting billing summary:', error);
      return {
        activeElders: 0,
        pendingElders: 0,
        monthlyTotal: 0,
        nextBillingDate: null,
      };
    }
  }
}
