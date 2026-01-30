export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getPlanChangeType, MULTI_AGENCY_TRIAL_DAYS } from '@/lib/constants/pricing';

// Initialize Stripe
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

// Map plan keys to Stripe price IDs
function getPriceId(planKey: string): string {
  const priceIds: Record<string, string | undefined> = {
    family: process.env.STRIPE_FAMILY_PRICE_ID,
    single_agency: process.env.STRIPE_SINGLE_AGENCY_PRICE_ID,
    multi_agency: process.env.STRIPE_MULTI_AGENCY_PRICE_ID,
  };
  const priceId = priceIds[planKey];
  if (!priceId) {
    throw new Error(`Price ID not configured for plan: ${planKey}`);
  }
  return priceId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, newPlan } = body;

    if (!userId || !newPlan) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, newPlan' },
        { status: 400 }
      );
    }

    // Validate new plan
    if (!['family', 'single_agency', 'multi_agency'].includes(newPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be: family, single_agency, or multi_agency' },
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
    const currentPlan = userData.subscriptionTier;
    const stripeSubscriptionId = userData.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    if (!currentPlan) {
      return NextResponse.json(
        { error: 'No current plan found.' },
        { status: 400 }
      );
    }

    // Determine if this is an upgrade or downgrade
    const changeType = getPlanChangeType(currentPlan, newPlan);

    if (changeType === 'same') {
      return NextResponse.json(
        { error: 'You are already on this plan.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const newPriceId = getPriceId(newPlan);

    // Get current subscription to find the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: 'Could not find subscription item.' },
        { status: 500 }
      );
    }

    if (changeType === 'upgrade') {
      // UPGRADE: Apply immediately with proration
      const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          ...subscription.metadata,
          planName: newPlan,
        },
      });

      // Update Firestore immediately
      await adminDb.collection('users').doc(userId).update({
        subscriptionTier: newPlan,
        pendingPlanChange: null,
        updatedAt: Timestamp.now(),
      });

      // For multi_agency upgrade, also update the agency with trial period
      if (newPlan === 'multi_agency') {
        // Find user's agency where they are super_admin
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const superAdminMembership = userData?.agencies?.find(
          (a: any) => a.role === 'super_admin'
        );

        if (superAdminMembership) {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + MULTI_AGENCY_TRIAL_DAYS);

          await adminDb.collection('agencies').doc(superAdminMembership.agencyId).update({
            'subscription.tier': 'multi_agency',
            'subscription.status': 'trial',
            'subscription.trialEndsAt': Timestamp.fromDate(trialEndDate),
            'subscription.currentPeriodEnd': Timestamp.fromDate(trialEndDate),
            updatedAt: Timestamp.now(),
          });
        }
      }

      return NextResponse.json({
        success: true,
        changeType: 'upgrade',
        message: newPlan === 'multi_agency'
          ? `Your plan has been upgraded! You have a ${MULTI_AGENCY_TRIAL_DAYS}-day free trial. After the trial, you'll be charged $16.99 per elder per month.`
          : 'Your plan has been upgraded immediately. Prorated charges will be applied.',
        newPlan,
        effectiveDate: 'immediate',
        ...(newPlan === 'multi_agency' && { trialDays: MULTI_AGENCY_TRIAL_DAYS }),
      });

    } else {
      // DOWNGRADE: Schedule for end of billing period using subscription schedule

      // Check if there's already a schedule attached
      let existingScheduleId = subscription.schedule as string | null;

      if (existingScheduleId) {
        // Release the existing schedule before creating a new one
        await stripe.subscriptionSchedules.release(existingScheduleId);
      }

      // Create a new subscription schedule and update with phases
      const currentPeriodEnd = subscription.current_period_end;
      let schedule;

      try {
        schedule = await stripe.subscriptionSchedules.create({
          from_subscription: stripeSubscriptionId,
        });

        await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: 'release',
          phases: [
            {
              items: [
                {
                  price: subscription.items.data[0].price.id, // Current price
                  quantity: 1,
                },
              ],
              end_date: currentPeriodEnd,
              // No start_date — Phase 0 inherits from the schedule
            },
            {
              items: [
                {
                  price: newPriceId, // New (lower) price
                  quantity: 1,
                },
              ],
              // No start_date — inherits from Phase 0's end_date
              // Last phase with end_behavior: 'release' — no end_date needed
            },
          ],
          metadata: {
            userId,
            pendingDowngrade: newPlan,
          },
        } as any);
      } catch (scheduleError) {
        // Clean up orphaned schedule if creation succeeded but update failed
        if (schedule?.id) {
          await stripe.subscriptionSchedules.release(schedule.id).catch(() => {});
        }
        throw scheduleError;
      }

      // Update Firestore with pending change
      await adminDb.collection('users').doc(userId).update({
        pendingPlanChange: newPlan,
        updatedAt: Timestamp.now(),
      });

      const effectiveDate = new Date(currentPeriodEnd * 1000);

      return NextResponse.json({
        success: true,
        changeType: 'downgrade',
        message: `Your plan will be changed to ${newPlan} at the end of your current billing period.`,
        newPlan,
        effectiveDate: effectiveDate.toISOString(),
        currentPlanEnds: effectiveDate.toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error changing plan:', error);
    // Sanitize Stripe errors - don't expose internal IDs to the client
    let userMessage = 'Failed to change plan. Please try again or contact support.';
    if (error?.type === 'StripeInvalidRequestError' && error?.code === 'resource_missing') {
      userMessage = 'Your subscription data needs to be refreshed. Please sign out and sign back in, then try again. If the issue persists, contact support.';
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}

// Cancel a pending downgrade
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
        { error: 'No active subscription found.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Get subscription and check for schedule
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const scheduleId = subscription.schedule as string | null;

    if (scheduleId) {
      // Release the schedule to cancel pending changes
      await stripe.subscriptionSchedules.release(scheduleId);
    }

    // Update Firestore
    await adminDb.collection('users').doc(userId).update({
      pendingPlanChange: null,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Pending plan change has been cancelled.',
    });
  } catch (error: any) {
    console.error('Error cancelling plan change:', error);
    let userMessage = 'Failed to cancel plan change. Please try again or contact support.';
    if (error?.type === 'StripeInvalidRequestError' && error?.code === 'resource_missing') {
      userMessage = 'Your subscription data needs to be refreshed. Please sign out and sign back in, then try again.';
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
