export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
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
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const stripeSubscriptionId = userData.stripeSubscriptionId;
    const stripeCustomerId = userData.stripeCustomerId;
    const subscriptionStartDate = convertFirestoreTimestamp(userData.subscriptionStartDate);
    const subscriptionStatus = userData.subscriptionStatus;
    const subscriptionTier = userData.subscriptionTier;

    // Handle trial users WITHOUT a Stripe subscription
    // These users selected a plan but haven't been charged yet
    if (!stripeSubscriptionId) {
      // Check if this is a trial user who selected a plan
      if (subscriptionStatus === 'trial' && subscriptionTier) {
        // Cancel the trial - user won't be charged when trial ends
        await adminDb.collection('users').doc(userId).update({
          subscriptionStatus: 'canceled',
          subscriptionTier: null,
          canceledAt: Timestamp.now(),
          cancelReason: reason || 'User cancelled during trial',
          updatedAt: Timestamp.now(),
        });

        return NextResponse.json({
          success: true,
          cancellationType: 'trial_canceled',
          refundIssued: false,
          refundAmount: 0,
          message: 'Your trial has been cancelled. You will not be charged.',
          effectiveDate: 'immediate',
        });
      }

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
      // CANCEL WITHIN 3 DAYS: Full refund + immediate cancellation

      // Find the latest paid invoice BEFORE cancelling
      // (querying after cancellation may not return invoices for a deleted subscription)
      let refundIssued = false;
      let refundAmount = 0;

      let invoices = await stripe.invoices.list({
        subscription: stripeSubscriptionId,
        status: 'paid',
        limit: 1,
      });

      // Fallback: query by customer ID if subscription query returns empty
      if (invoices.data.length === 0 && stripeCustomerId) {
        invoices = await stripe.invoices.list({
          customer: stripeCustomerId,
          status: 'paid',
          limit: 1,
        });
      }

      // Cancel the subscription
      await stripe.subscriptions.cancel(stripeSubscriptionId);

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
                cancellationReason: reason || 'User requested cancellation within 3 days',
              },
            });

            refundIssued = true;
            refundAmount = refund.amount / 100; // Convert cents to dollars
          }
        }
      }

      // Update Firestore
      await adminDb.collection('users').doc(userId).update({
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: false,
        pendingPlanChange: null,
        updatedAt: Timestamp.now(),
      });

      // Send refund confirmation email
      if (refundIssued) {
        const userEmail = userData.email;
        if (userEmail) {
          await adminDb.collection('mail').add({
            to: userEmail,
            message: {
              subject: 'Your MyGuide Health Subscription Has Been Cancelled & Refunded',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a1a1a;">Subscription Cancelled</h2>
                  <p>Hi,</p>
                  <p>Your MyGuide Health subscription has been successfully cancelled.</p>
                  <p>A refund of <strong>$${refundAmount.toFixed(2)}</strong> has been issued to your original payment method. Please allow 5-10 business days for the refund to appear on your statement.</p>
                  <p>You can re-subscribe at any time by visiting <a href="https://www.myguide.health/dashboard/settings">your settings page</a>.</p>
                  <br/>
                  <p>Thank you,<br/>The MyGuide Health Team</p>
                </div>
              `,
            },
            createdAt: Timestamp.now(),
          });
        }
      }

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
      // CANCEL AFTER 3 DAYS: No refund, access until end of billing period

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
      await adminDb.collection('users').doc(userId).update({
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
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    let userMessage = 'Failed to cancel subscription. Please try again or contact support.';
    if (error?.type === 'StripeInvalidRequestError' && error?.code === 'resource_missing') {
      userMessage = 'Your subscription data needs to be refreshed. Please sign out and sign back in, then try again.';
    }
    return NextResponse.json(
      { error: userMessage },
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
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
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
    await adminDb.collection('users').doc(userId).update({
      cancelAtPeriodEnd: false,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been reactivated. You will continue to be billed normally.',
    });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    let userMessage = 'Failed to reactivate subscription. Please try again or contact support.';
    if (error?.type === 'StripeInvalidRequestError' && error?.code === 'resource_missing') {
      userMessage = 'Your subscription data needs to be refreshed. Please sign out and sign back in, then try again.';
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
