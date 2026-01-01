export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ElderBillingService } from '@/lib/stripe/elderBilling';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// Lazy initialization
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });
}

function getWebhookSecret(): string {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

// Helper to extract plan key from price ID or plan name
function extractPlanKey(subscription: Stripe.Subscription): string | null {
  // Try from metadata first
  const planName = subscription.metadata.planName;
  if (planName) {
    return planName.toLowerCase().replace(' plan', '').replace(' ', '_');
  }

  // Try from price ID
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    if (priceId === process.env.STRIPE_FAMILY_PRICE_ID) return 'family';
    if (priceId === process.env.STRIPE_SINGLE_AGENCY_PRICE_ID) return 'single_agency';
    if (priceId === process.env.STRIPE_MULTI_AGENCY_PRICE_ID) return 'multi_agency';
  }

  return null;
}

/**
 * Find the agency where user is super_admin
 * Returns null if user is not super_admin of any agency (e.g., they're just a caregiver)
 */
async function findSuperAdminAgency(
  adminDb: FirebaseFirestore.Firestore,
  userId: string,
  userData: FirebaseFirestore.DocumentData
): Promise<string | null> {
  if (!userData?.agencies || userData.agencies.length === 0) {
    return null;
  }

  // Find agency where user has super_admin role AND is verified as superAdminId
  for (const membership of userData.agencies) {
    if (membership.role === 'super_admin') {
      const agencyDoc = await adminDb.collection('agencies').doc(membership.agencyId).get();
      if (agencyDoc.exists && agencyDoc.data()?.superAdminId === userId) {
        return membership.agencyId;
      }
    }
  }

  // User is not super_admin of any agency (they might be a caregiver)
  // DO NOT fallback to agencies[0] - that would update the wrong agency
  return null;
}

/**
 * Map Stripe subscription status to our app status
 */
function mapSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trial';
    case 'canceled':
      return 'canceled';
    case 'past_due':
    case 'unpaid':
      return 'expired';
    default:
      return 'expired';
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = getWebhookSecret();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    const adminDb = getAdminDb();

    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          // Handle elder billing (Multi-Agency)
          await ElderBillingService.handlePaymentSucceeded({
            subscriptionId: invoice.subscription as string,
            invoiceId: invoice.id,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await ElderBillingService.handlePaymentFailed({
            subscriptionId: invoice.subscription as string,
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata.userId;
        const planKey = extractPlanKey(subscription);

        console.log('Processing subscription.created:', {
          userId,
          subscriptionId: subscription.id,
          status: subscription.status,
          planKey,
        });

        if (!userId) {
          console.warn('No userId in subscription metadata, skipping');
          break;
        }

        // Get user data first
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.warn('User not found:', userId);
          break;
        }
        const userData = userDoc.data()!;

        // Find agency where user is super_admin (NO fallback)
        const agencyId = await findSuperAdminAgency(adminDb, userId, userData);

        // Build user update data
        const subscriptionStatus = mapSubscriptionStatus(subscription.status);
        const userUpdateData: Record<string, any> = {
          subscriptionStatus,
          subscriptionTier: planKey || 'unknown',
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          pendingPlanChange: null,
          updatedAt: Timestamp.now(),
        };

        if (subscription.start_date) {
          userUpdateData.subscriptionStartDate = Timestamp.fromMillis(subscription.start_date * 1000);
        }
        if (subscription.current_period_end) {
          userUpdateData.currentPeriodEnd = Timestamp.fromMillis(subscription.current_period_end * 1000);
        }
        if (subscription.trial_end) {
          userUpdateData.trialEndDate = Timestamp.fromMillis(subscription.trial_end * 1000);
        }

        // Use batch write for atomic update
        const batch = adminDb.batch();

        // Update user document
        batch.update(adminDb.collection('users').doc(userId), userUpdateData);

        // Update agency document if user is super_admin
        if (agencyId && planKey) {
          const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : new Date();
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : currentPeriodEnd;

          const agencyUpdateData: Record<string, any> = {
            'subscription.tier': planKey,
            'subscription.status': subscriptionStatus,
            'subscription.stripeCustomerId': subscription.customer as string,
            'subscription.stripeSubscriptionId': subscription.id,
            'subscription.currentPeriodEnd': Timestamp.fromDate(currentPeriodEnd),
            'subscription.trialEndsAt': Timestamp.fromDate(trialEnd),
            updatedAt: Timestamp.now(),
          };

          batch.update(adminDb.collection('agencies').doc(agencyId), agencyUpdateData);
          console.log('Will update agency:', agencyId);
        } else if (!agencyId) {
          console.log('User is not super_admin of any agency, skipping agency update');
        }

        // Commit atomic batch
        await batch.commit();
        console.log('Subscription created - batch committed:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata.userId;
        const planKey = extractPlanKey(subscription);

        if (!userId) {
          console.warn('No userId in subscription metadata, skipping');
          break;
        }

        // Get user data first
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.warn('User not found:', userId);
          break;
        }
        const userData = userDoc.data()!;

        // Find agency where user is super_admin (NO fallback)
        const agencyId = await findSuperAdminAgency(adminDb, userId, userData);

        // Determine subscription status
        const subscriptionStatus = mapSubscriptionStatus(subscription.status);

        // Build user update data
        const userUpdateData: Record<string, any> = {
          subscriptionStatus,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          updatedAt: Timestamp.now(),
        };

        if (subscription.current_period_end) {
          userUpdateData.currentPeriodEnd = Timestamp.fromMillis(subscription.current_period_end * 1000);
        }
        if (subscription.trial_end) {
          userUpdateData.trialEndDate = Timestamp.fromMillis(subscription.trial_end * 1000);
        }
        if (planKey) {
          userUpdateData.subscriptionTier = planKey;
        }
        if (!subscription.cancel_at_period_end) {
          userUpdateData.pendingPlanChange = null;
        }

        // Check for scheduled changes (downgrade)
        if (subscription.schedule) {
          const scheduleId = subscription.schedule as string;
          try {
            const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
            if (schedule.phases && schedule.phases.length > 1) {
              const nextPhase = schedule.phases[1];
              const nextPriceId = nextPhase.items[0]?.price as string;
              if (nextPriceId) {
                if (nextPriceId === process.env.STRIPE_FAMILY_PRICE_ID) {
                  userUpdateData.pendingPlanChange = 'family';
                } else if (nextPriceId === process.env.STRIPE_SINGLE_AGENCY_PRICE_ID) {
                  userUpdateData.pendingPlanChange = 'single_agency';
                } else if (nextPriceId === process.env.STRIPE_MULTI_AGENCY_PRICE_ID) {
                  userUpdateData.pendingPlanChange = 'multi_agency';
                }
              }
            }
          } catch (scheduleError) {
            console.error('Error fetching subscription schedule:', scheduleError);
          }
        }

        // Use batch write for atomic update
        const batch = adminDb.batch();

        // Update user document
        batch.update(adminDb.collection('users').doc(userId), userUpdateData);

        // Update agency document if user is super_admin
        if (agencyId) {
          const agencyUpdateData: Record<string, any> = {
            'subscription.status': subscriptionStatus,
            updatedAt: Timestamp.now(),
          };

          if (planKey) {
            agencyUpdateData['subscription.tier'] = planKey;
          }
          if (subscription.current_period_end) {
            agencyUpdateData['subscription.currentPeriodEnd'] = Timestamp.fromMillis(subscription.current_period_end * 1000);
          }
          if (subscription.trial_end) {
            agencyUpdateData['subscription.trialEndsAt'] = Timestamp.fromMillis(subscription.trial_end * 1000);
          }

          batch.update(adminDb.collection('agencies').doc(agencyId), agencyUpdateData);
          console.log('Will update agency:', agencyId);
        } else {
          console.log('User is not super_admin of any agency, skipping agency update');
        }

        // Commit atomic batch
        await batch.commit();
        console.log('Subscription updated - batch committed:', subscription.id, 'Status:', subscriptionStatus);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata.userId;

        if (!userId) {
          console.warn('No userId in subscription metadata, skipping');
          break;
        }

        // Get user data first
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.warn('User not found:', userId);
          break;
        }
        const userData = userDoc.data()!;

        // Find agency where user is super_admin
        const agencyId = await findSuperAdminAgency(adminDb, userId, userData);

        // Use batch write for atomic update
        const batch = adminDb.batch();

        // Update user document
        batch.update(adminDb.collection('users').doc(userId), {
          subscriptionStatus: 'canceled',
          cancelAtPeriodEnd: false,
          pendingPlanChange: null,
          updatedAt: Timestamp.now(),
        });

        // Update agency if user is super_admin
        if (agencyId) {
          batch.update(adminDb.collection('agencies').doc(agencyId), {
            'subscription.status': 'canceled',
            updatedAt: Timestamp.now(),
          });
        }

        await batch.commit();
        console.log('Subscription deleted - batch committed:', subscription.id);
        break;
      }

      case 'subscription_schedule.completed': {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const userId = schedule.metadata?.userId;

        if (userId) {
          await adminDb.collection('users').doc(userId).update({
            pendingPlanChange: null,
            updatedAt: Timestamp.now(),
          });
          console.log('Subscription schedule completed for user:', userId);
        }
        break;
      }

      case 'subscription_schedule.canceled':
      case 'subscription_schedule.released': {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const userId = schedule.metadata?.userId;

        if (userId) {
          await adminDb.collection('users').doc(userId).update({
            pendingPlanChange: null,
            updatedAt: Timestamp.now(),
          });
          console.log('Subscription schedule cancelled/released for user:', userId);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id, 'Amount:', charge.amount_refunded / 100);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}
