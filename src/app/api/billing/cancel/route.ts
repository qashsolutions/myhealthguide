export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { PRICING } from '@/lib/constants/pricing';

// Initialize Stripe
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

// Helper to convert Firestore Timestamp to Date
function convertFirestoreTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Get user from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData.stripeSubscriptionId;
    const stripeCustomerId = userData.stripeCustomerId;
    const subscriptionStartDate = convertFirestoreTimestamp(userData.subscriptionStartDate);

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Calculate days since subscription started
    const now = new Date();
    const startDate = subscriptionStartDate || new Date(subscription.start_date * 1000);
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isWithinRefundWindow = daysSinceStart <= PRICING.REFUND_WINDOW_DAYS;

    if (isWithinRefundWindow) {
      // CANCEL WITHIN 7 DAYS: Full refund + immediate cancellation

      // Cancel the subscription immediately
      await stripe.subscriptions.cancel(stripeSubscriptionId);

      // Find the latest paid invoice for refund
      let refundIssued = false;
      let refundAmount = 0;

      const invoices = await stripe.invoices.list({
        subscription: stripeSubscriptionId,
        status: 'paid',
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const invoice = invoices.data[0] as any;
        const paymentIntentId = invoice.payment_intent as string | null;

        if (paymentIntentId) {
          // Get the payment intent to find the charge
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          const chargeId = paymentIntent.latest_charge as string;

          if (chargeId) {
            // Issue full refund
            const refund = await stripe.refunds.create({
              charge: chargeId,
              reason: 'requested_by_customer',
              metadata: {
                userId,
                cancellationReason: reason || 'User requested cancellation within 7 days',
              },
            });

            refundIssued = true;
            refundAmount = refund.amount / 100; // Convert cents to dollars
          }
        }
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: false,
        pendingPlanChange: null,
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        cancellationType: 'immediate_with_refund',
        refundIssued,
        refundAmount,
        message: refundIssued
          ? `Your subscription has been cancelled and $${refundAmount.toFixed(2)} has been refunded to your payment method.`
          : 'Your subscription has been cancelled. No payment was found to refund.',
        effectiveDate: 'immediate',
      });

    } else {
      // CANCEL AFTER 7 DAYS: No refund, access until end of billing period

      // Set subscription to cancel at period end
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          ...subscription.metadata,
          cancellationReason: reason || 'User requested cancellation',
          cancelledAt: new Date().toISOString(),
        },
      }) as any;

      const currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);

      // Update Firestore
      await updateDoc(doc(db, 'users', userId), {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: Timestamp.fromDate(currentPeriodEnd),
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        cancellationType: 'end_of_period',
        refundIssued: false,
        refundAmount: 0,
        message: `Your subscription will remain active until ${currentPeriodEnd.toLocaleDateString()}. You will not be charged again.`,
        effectiveDate: currentPeriodEnd.toISOString(),
        accessUntil: currentPeriodEnd.toISOString(),
      });
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reactivate a subscription that was set to cancel at period end
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Get user from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Remove the cancel_at_period_end flag
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update Firestore
    await updateDoc(doc(db, 'users', userId), {
      cancelAtPeriodEnd: false,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been reactivated. You will continue to be billed normally.',
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
