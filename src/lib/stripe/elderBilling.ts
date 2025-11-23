import Stripe from 'stripe';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { PRICING } from '@/lib/constants/pricing';
import type { ElderSubscription } from '@/types';

// Lazy initialization of Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
    });
  }
  return stripeInstance;
}

const STRIPE_ELDER_CARE_PRICE_ID = process.env.STRIPE_ELDER_CARE_PRICE_ID!

export class ElderBillingService {
  /**
   * Create a new elder subscription
   * This is called when a SuperAdmin adds an elder to the agency
   */
  static async createElderSubscription(params: {
    agencyId: string;
    elderId: string;
    elderName: string;
    caregiverId: string;
    addedBy: string;
  }): Promise<ElderSubscription> {
    const { agencyId, elderId, elderName, caregiverId, addedBy } = params;
    const stripe = getStripe();

    // Get or create Stripe customer for agency
    const agency = await getDoc(doc(db, 'agencies', agencyId));
    if (!agency.exists()) {
      throw new Error('Agency not found');
    }

    const agencyData = agency.data();
    let stripeCustomerId = agencyData.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: {
          agencyId,
          agencyName: agencyData.name,
        },
      });
      stripeCustomerId = customer.id;

      // Update agency with customer ID
      await updateDoc(doc(db, 'agencies', agencyId), {
        stripeCustomerId,
      });
    }

    // Create Stripe subscription for this elder
    const billingCycleStart = new Date();
    const billingCycleEnd = new Date(billingCycleStart);
    billingCycleEnd.setDate(billingCycleEnd.getDate() + PRICING.MULTI_AGENCY.BILLING_CYCLE_DAYS);

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: STRIPE_ELDER_CARE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        agencyId,
        elderId,
        elderName,
        caregiverId,
      },
      billing_cycle_anchor: Math.floor(billingCycleEnd.getTime() / 1000),
      proration_behavior: 'none', // No proration - charge full amount
    });

    // Create elderSubscription record in Firestore
    const elderSubscription: Omit<ElderSubscription, 'id'> = {
      agencyId,
      elderId,
      elderName,
      caregiverId,
      subscriptionStatus: 'active',
      monthlyRate: PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE,
      billingCycleStart: Timestamp.fromDate(billingCycleStart) as any,
      billingCycleEnd: Timestamp.fromDate(billingCycleEnd) as any,
      nextBillingDate: Timestamp.fromDate(billingCycleEnd) as any,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      stripePriceId: STRIPE_ELDER_CARE_PRICE_ID,
      cancelledAt: null,
      cancellationReason: null,
      refundIssued: false,
      refundAmount: 0,
      refundIssuedAt: null,
      addedBy,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    const docRef = await addDoc(collection(db, 'elderSubscriptions'), elderSubscription);

    // Update agency billing totals
    await this.updateAgencyBillingTotals(agencyId);

    return {
      id: docRef.id,
      ...elderSubscription,
      billingCycleStart: billingCycleStart,
      billingCycleEnd: billingCycleEnd,
      nextBillingDate: billingCycleEnd,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Cancel an elder subscription
   * Handles 7-day refund window logic
   */
  static async cancelElderSubscription(params: {
    subscriptionId: string;
    reason: string;
  }): Promise<{ refundIssued: boolean; refundAmount: number }> {
    const { subscriptionId, reason } = params;
    const stripe = getStripe();

    // Get subscription from Firestore
    const subscriptionDoc = await getDoc(doc(db, 'elderSubscriptions', subscriptionId));
    if (!subscriptionDoc.exists()) {
      throw new Error('Subscription not found');
    }

    const subscriptionData = subscriptionDoc.data() as ElderSubscription;

    // Check if within 7-day refund window
    const createdAt = subscriptionData.createdAt as any;
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isWithinRefundWindow = daysSinceCreation <= PRICING.MULTI_AGENCY.REFUND_WINDOW_DAYS;

    // Cancel Stripe subscription
    await stripe.subscriptions.cancel(subscriptionData.stripeSubscriptionId);

    let refundIssued = false;
    let refundAmount = 0;

    // Issue refund if within window
    if (isWithinRefundWindow) {
      // Get the latest invoice for this subscription
      const invoices = await stripe.invoices.list({
        subscription: subscriptionData.stripeSubscriptionId,
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const invoice = invoices.data[0] as any;
        // In newer Stripe API versions, charge may be in different locations
        const chargeId = invoice.charge || invoice.payments?.data?.[0]?.payment?.charge;

        if (chargeId) {
          const refund = await stripe.refunds.create({
            charge: chargeId as string,
            reason: 'requested_by_customer',
            metadata: {
              subscriptionId,
              elderId: subscriptionData.elderId,
              agencyId: subscriptionData.agencyId,
            },
          });

          refundIssued = true;
          refundAmount = refund.amount / 100; // Convert cents to dollars
        }
      }
    }

    // Update Firestore
    await updateDoc(doc(db, 'elderSubscriptions', subscriptionId), {
      subscriptionStatus: refundIssued ? 'refunded' : 'cancelled',
      cancelledAt: Timestamp.now(),
      cancellationReason: reason,
      refundIssued,
      refundAmount,
      refundIssuedAt: refundIssued ? Timestamp.now() : null,
      updatedAt: Timestamp.now(),
    });

    // Update agency billing totals
    await this.updateAgencyBillingTotals(subscriptionData.agencyId);

    return { refundIssued, refundAmount };
  }

  /**
   * Get all active elder subscriptions for an agency
   */
  static async getActiveElderSubscriptions(agencyId: string): Promise<ElderSubscription[]> {
    const q = query(
      collection(db, 'elderSubscriptions'),
      where('agencyId', '==', agencyId),
      where('subscriptionStatus', '==', 'active')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        billingCycleStart:
          data.billingCycleStart?.toDate?.() || new Date(data.billingCycleStart),
        billingCycleEnd: data.billingCycleEnd?.toDate?.() || new Date(data.billingCycleEnd),
        nextBillingDate: data.nextBillingDate?.toDate?.() || new Date(data.nextBillingDate),
        cancelledAt: data.cancelledAt?.toDate?.() || null,
        refundIssuedAt: data.refundIssuedAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      } as ElderSubscription;
    });
  }

  /**
   * Get all elder subscriptions for an agency (including cancelled)
   */
  static async getAllElderSubscriptions(agencyId: string): Promise<ElderSubscription[]> {
    const q = query(collection(db, 'elderSubscriptions'), where('agencyId', '==', agencyId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        billingCycleStart:
          data.billingCycleStart?.toDate?.() || new Date(data.billingCycleStart),
        billingCycleEnd: data.billingCycleEnd?.toDate?.() || new Date(data.billingCycleEnd),
        nextBillingDate: data.nextBillingDate?.toDate?.() || new Date(data.nextBillingDate),
        cancelledAt: data.cancelledAt?.toDate?.() || null,
        refundIssuedAt: data.refundIssuedAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      } as ElderSubscription;
    });
  }

  /**
   * Calculate monthly total for an agency
   */
  static async calculateMonthlyTotal(agencyId: string): Promise<number> {
    const activeSubscriptions = await this.getActiveElderSubscriptions(agencyId);
    return activeSubscriptions.length * PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE;
  }

  /**
   * Calculate refund eligibility
   */
  static calculateRefundEligibility(subscription: ElderSubscription): {
    eligible: boolean;
    daysRemaining: number;
  } {
    const createdAt =
      subscription.createdAt instanceof Date
        ? subscription.createdAt
        : (subscription.createdAt as any).toDate
          ? (subscription.createdAt as any).toDate()
          : new Date(subscription.createdAt);

    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysRemaining = PRICING.MULTI_AGENCY.REFUND_WINDOW_DAYS - daysSinceCreation;
    const eligible = daysRemaining > 0;

    return { eligible, daysRemaining: Math.max(0, daysRemaining) };
  }

  /**
   * Update agency billing totals
   */
  static async updateAgencyBillingTotals(agencyId: string): Promise<void> {
    const activeSubscriptions = await this.getActiveElderSubscriptions(agencyId);

    const activeElderCount = activeSubscriptions.length;
    const currentMonthlyTotal = activeElderCount * PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE;

    // Get earliest next billing date
    let nextBillingDate: Date | null = null;
    if (activeSubscriptions.length > 0) {
      const dates = activeSubscriptions.map((sub) => sub.nextBillingDate);
      nextBillingDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    }

    // Get all subscription IDs
    const stripeSubscriptionIds = activeSubscriptions.map((sub) => sub.stripeSubscriptionId);

    // Update agency document
    const updateData: any = {
      activeElderCount,
      currentMonthlyTotal,
      stripeSubscriptionIds,
      updatedAt: Timestamp.now(),
    };

    if (nextBillingDate) {
      updateData.nextBillingDate = Timestamp.fromDate(nextBillingDate);
    }

    await updateDoc(doc(db, 'agencies', agencyId), updateData);
  }

  /**
   * Handle successful payment webhook
   */
  static async handlePaymentSucceeded(params: {
    subscriptionId: string;
    invoiceId: string;
  }): Promise<void> {
    const { subscriptionId } = params;

    // Find elder subscription by Stripe subscription ID
    const q = query(
      collection(db, 'elderSubscriptions'),
      where('stripeSubscriptionId', '==', subscriptionId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.error('Elder subscription not found for Stripe subscription:', subscriptionId);
      return;
    }

    const docRef = snapshot.docs[0].ref;
    const subscriptionData = snapshot.docs[0].data();

    // Update next billing date (add 31 days)
    const currentNextBilling =
      subscriptionData.nextBillingDate?.toDate?.() ||
      new Date(subscriptionData.nextBillingDate);
    const newNextBilling = new Date(currentNextBilling);
    newNextBilling.setDate(newNextBilling.getDate() + PRICING.MULTI_AGENCY.BILLING_CYCLE_DAYS);

    await updateDoc(docRef, {
      nextBillingDate: Timestamp.fromDate(newNextBilling),
      updatedAt: Timestamp.now(),
    });

    // Update agency totals
    await this.updateAgencyBillingTotals(subscriptionData.agencyId);
  }

  /**
   * Handle failed payment webhook
   */
  static async handlePaymentFailed(params: { subscriptionId: string }): Promise<void> {
    const { subscriptionId } = params;

    // Find elder subscription by Stripe subscription ID
    const q = query(
      collection(db, 'elderSubscriptions'),
      where('stripeSubscriptionId', '==', subscriptionId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.error('Elder subscription not found for Stripe subscription:', subscriptionId);
      return;
    }

    const docRef = snapshot.docs[0].ref;

    // Mark as at-risk
    await updateDoc(docRef, {
      subscriptionStatus: 'at_risk',
      updatedAt: Timestamp.now(),
    });
  }
}
