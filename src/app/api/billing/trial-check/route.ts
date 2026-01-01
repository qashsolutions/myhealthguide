export const dynamic = 'force-dynamic';

/**
 * Trial Check API - Cron Job Handler
 *
 * Handles:
 * 1. Sending trial expiration warnings (days 27, 28, 29)
 * 2. Processing expired trials (billing or blocking access)
 *
 * Should be called daily via Vercel Cron or external scheduler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { MULTI_AGENCY_TRIAL_DAYS, PRICING } from '@/lib/subscription';
import Stripe from 'stripe';

// Initialize Stripe
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

const STRIPE_MULTI_AGENCY_PRICE_ID = process.env.STRIPE_MULTI_AGENCY_PRICE_ID!;

interface TrialCheckResult {
  agencyId: string;
  agencyName: string;
  action: 'notification_sent' | 'billed' | 'access_blocked' | 'error';
  details: string;
}

/**
 * Send trial expiration notification
 */
async function sendTrialExpirationNotification(
  adminDb: FirebaseFirestore.Firestore,
  agencyId: string,
  superAdminId: string,
  daysRemaining: number,
  elderCount: number
): Promise<void> {
  const estimatedBill = elderCount * PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE;

  const notification = {
    userId: superAdminId,
    type: 'trial_expiring',
    title: daysRemaining === 1
      ? '⚠️ Trial Ends Tomorrow!'
      : `⚠️ Trial Ends in ${daysRemaining} Days`,
    message: daysRemaining === 1
      ? `Your ${MULTI_AGENCY_TRIAL_DAYS}-day free trial ends tomorrow. Add a payment method to continue managing your ${elderCount} elder${elderCount !== 1 ? 's' : ''}. Estimated monthly charge: $${estimatedBill}.`
      : `Your ${MULTI_AGENCY_TRIAL_DAYS}-day free trial ends in ${daysRemaining} days. Add a payment method to avoid losing access. You have ${elderCount} elder${elderCount !== 1 ? 's' : ''} - estimated monthly charge: $${estimatedBill}.`,
    priority: daysRemaining === 1 ? 'urgent' : 'high',
    actionUrl: '/dashboard/settings?tab=billing',
    actionLabel: 'Add Payment Method',
    metadata: {
      agencyId,
      elderCount,
      estimatedBill,
      daysRemaining,
      trialType: 'multi_agency',
    },
    read: false,
    createdAt: Timestamp.now(),
  };

  await adminDb.collection('user_notifications').add(notification);
}

/**
 * Create Stripe subscriptions for all elders at trial end
 */
async function billForElders(
  stripe: Stripe,
  adminDb: FirebaseFirestore.Firestore,
  agencyId: string,
  agencyData: any,
  elderCount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get or create Stripe customer
    let stripeCustomerId = agencyData.stripeCustomerId;

    if (!stripeCustomerId) {
      // Get super admin email for customer creation
      const superAdminDoc = await adminDb.collection('users').doc(agencyData.superAdminId).get();
      const superAdminData = superAdminDoc.data();

      const customer = await stripe.customers.create({
        email: superAdminData?.email,
        name: agencyData.name,
        metadata: {
          agencyId,
          agencyName: agencyData.name,
          superAdminId: agencyData.superAdminId,
        },
      });
      stripeCustomerId = customer.id;

      // Update agency with customer ID
      await adminDb.collection('agencies').doc(agencyId).update({
        stripeCustomerId,
      });
    }

    // Check if customer has a valid payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return { success: false, error: 'No payment method on file' };
    }

    // Get all active elders for this agency
    const eldersSnapshot = await adminDb.collection('elders')
      .where('groupId', 'in', agencyData.groupIds || [])
      .get();

    const activeElders = eldersSnapshot.docs.filter(doc => !doc.data().archived);

    if (activeElders.length === 0) {
      return { success: true }; // No elders to bill
    }

    // Create a single subscription with quantity = number of elders
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: STRIPE_MULTI_AGENCY_PRICE_ID,
          quantity: activeElders.length,
        },
      ],
      metadata: {
        agencyId,
        agencyName: agencyData.name,
        elderCount: activeElders.length.toString(),
        billingType: 'multi_agency_elder',
      },
    });

    // Update agency subscription status
    await adminDb.collection('agencies').doc(agencyId).update({
      'subscription.status': 'active',
      'subscription.stripeSubscriptionId': subscription.id,
      activeElderCount: activeElders.length,
      currentMonthlyTotal: activeElders.length * PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE,
      stripeSubscriptionIds: [subscription.id],
      updatedAt: Timestamp.now(),
    });

    // Create elderSubscription records for each elder
    const batch = adminDb.batch();
    for (const elderDoc of activeElders) {
      const elderData = elderDoc.data();
      const elderSubRef = adminDb.collection('elderSubscriptions').doc();
      batch.set(elderSubRef, {
        agencyId,
        elderId: elderDoc.id,
        elderName: elderData.name || 'Unknown',
        caregiverId: elderData.primaryCaregiverId || agencyData.superAdminId,
        subscriptionStatus: 'active',
        monthlyRate: PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
        stripePriceId: STRIPE_MULTI_AGENCY_PRICE_ID,
        billingCycleStart: Timestamp.now(),
        billingCycleEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        nextBillingDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        cancelledAt: null,
        cancellationReason: null,
        refundIssued: false,
        refundAmount: 0,
        refundIssuedAt: null,
        addedBy: agencyData.superAdminId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error billing for elders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown billing error'
    };
  }
}

/**
 * Block agency access when trial expires without payment
 */
async function blockAgencyAccess(
  adminDb: FirebaseFirestore.Firestore,
  agencyId: string,
  superAdminId: string
): Promise<void> {
  // Update agency subscription status
  await adminDb.collection('agencies').doc(agencyId).update({
    'subscription.status': 'expired',
    updatedAt: Timestamp.now(),
  });

  // Send access blocked notification
  const notification = {
    userId: superAdminId,
    type: 'access_blocked',
    title: '🚫 Trial Expired - Access Blocked',
    message: `Your ${MULTI_AGENCY_TRIAL_DAYS}-day free trial has expired. Add a payment method to restore access to your agency dashboard and elder management.`,
    priority: 'urgent',
    actionUrl: '/dashboard/settings?tab=billing',
    actionLabel: 'Add Payment Method',
    metadata: {
      agencyId,
      reason: 'trial_expired_no_payment',
    },
    read: false,
    createdAt: Timestamp.now(),
  };

  await adminDb.collection('user_notifications').add(notification);
}

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const stripe = getStripe();
    const results: TrialCheckResult[] = [];
    const now = new Date();

    // Find all multi-agency agencies with trial status
    const agenciesSnapshot = await adminDb.collection('agencies')
      .where('subscription.tier', '==', 'multi_agency')
      .where('subscription.status', '==', 'trial')
      .get();

    for (const agencyDoc of agenciesSnapshot.docs) {
      const agencyData = agencyDoc.data();
      const agencyId = agencyDoc.id;
      const agencyName = agencyData.name || 'Unknown Agency';

      try {
        // Get trial end date
        const trialEndsAt = agencyData.subscription?.trialEndsAt?.toDate?.()
          || new Date(agencyData.subscription?.trialEndsAt);

        if (!trialEndsAt || isNaN(trialEndsAt.getTime())) {
          results.push({
            agencyId,
            agencyName,
            action: 'error',
            details: 'Invalid trial end date',
          });
          continue;
        }

        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Count active elders
        let elderCount = 0;
        if (agencyData.groupIds?.length > 0) {
          const eldersSnapshot = await adminDb.collection('elders')
            .where('groupId', 'in', agencyData.groupIds)
            .get();
          elderCount = eldersSnapshot.docs.filter(doc => !doc.data().archived).length;
        }

        // Days 27, 28, 29: Send warning notifications
        if (daysRemaining >= 1 && daysRemaining <= 3) {
          await sendTrialExpirationNotification(
            adminDb,
            agencyId,
            agencyData.superAdminId,
            daysRemaining,
            elderCount
          );
          results.push({
            agencyId,
            agencyName,
            action: 'notification_sent',
            details: `${daysRemaining} day(s) remaining, ${elderCount} elders`,
          });
        }
        // Trial expired
        else if (daysRemaining <= 0) {
          // Try to bill
          const billingResult = await billForElders(stripe, adminDb, agencyId, agencyData, elderCount);

          if (billingResult.success) {
            results.push({
              agencyId,
              agencyName,
              action: 'billed',
              details: `Billed for ${elderCount} elders ($${elderCount * PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE})`,
            });
          } else {
            // No payment method - block access
            await blockAgencyAccess(adminDb, agencyId, agencyData.superAdminId);
            results.push({
              agencyId,
              agencyName,
              action: 'access_blocked',
              details: billingResult.error || 'No payment method',
            });
          }
        }
      } catch (error) {
        console.error(`Error processing agency ${agencyId}:`, error);
        results.push({
          agencyId,
          agencyName,
          action: 'error',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: agenciesSnapshot.size,
      results,
    });
  } catch (error) {
    console.error('Trial check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Trial check endpoint. Use POST to run the check.',
    description: 'This endpoint checks for expiring trials, sends notifications, and handles billing.',
  });
}
