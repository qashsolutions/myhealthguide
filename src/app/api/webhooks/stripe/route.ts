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
          start_date: subscription.start_date,
          current_period_end: subscription.current_period_end,
          trial_end: subscription.trial_end,
        });

        if (userId) {
          // Update user subscription status in Firestore using Admin SDK
          const adminDb = getAdminDb();

          // Build update data with safe timestamp handling
          const updateData: Record<string, any> = {
            subscriptionStatus: subscription.status === 'trialing' ? 'trial' : 'active',
            subscriptionTier: planKey || 'unknown',
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            pendingPlanChange: null,
            updatedAt: Timestamp.now(),
          };

          // Safely add timestamps only if values exist
          if (subscription.start_date) {
            updateData.subscriptionStartDate = Timestamp.fromMillis(subscription.start_date * 1000);
          }
          if (subscription.current_period_end) {
            updateData.currentPeriodEnd = Timestamp.fromMillis(subscription.current_period_end * 1000);
          }
          if (subscription.trial_end) {
            updateData.trialEndDate = Timestamp.fromMillis(subscription.trial_end * 1000);
          }

          await adminDb.collection('users').doc(userId).update(updateData);
          console.log('Subscription created and synced to Firestore:', subscription.id);

          // Also update the agency subscription tier if user has an agency
          // Find the agency where user is super_admin (not just agencies[0])
          if (planKey) {
            const userDoc = await adminDb.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (userData?.agencies && userData.agencies.length > 0) {
              // Find agency where user is super_admin
              let targetAgencyId: string | null = null;
              for (const membership of userData.agencies) {
                if (membership.role === 'super_admin') {
                  const agencyDoc = await adminDb.collection('agencies').doc(membership.agencyId).get();
                  if (agencyDoc.exists && agencyDoc.data()?.superAdminId === userId) {
                    targetAgencyId = membership.agencyId;
                    break;
                  }
                }
              }

              // Fallback to first agency if no super_admin role found
              if (!targetAgencyId) {
                targetAgencyId = userData.agencies[0].agencyId;
              }

              const currentPeriodEnd = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : new Date();
              const trialEnd = subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : currentPeriodEnd;

              await adminDb.collection('agencies').doc(targetAgencyId).update({
                'subscription.tier': planKey,
                'subscription.status': subscription.status === 'trialing' ? 'trial' : 'active',
                'subscription.stripeCustomerId': subscription.customer as string,
                'subscription.stripeSubscriptionId': subscription.id,
                'subscription.currentPeriodEnd': Timestamp.fromDate(currentPeriodEnd),
                'subscription.trialEndsAt': Timestamp.fromDate(trialEnd),
                updatedAt: Timestamp.now(),
              });
              console.log('Agency subscription synced:', targetAgencyId, 'Tier:', planKey, 'Status:', subscription.status);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata.userId;
        const planKey = extractPlanKey(subscription);

        if (userId) {
          // Determine subscription status
          let subscriptionStatus: string;
          if (subscription.status === 'active') {
            subscriptionStatus = 'active';
          } else if (subscription.status === 'trialing') {
            subscriptionStatus = 'trial';
          } else if (subscription.status === 'canceled') {
            subscriptionStatus = 'canceled';
          } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
            subscriptionStatus = 'expired';
          } else {
            subscriptionStatus = 'expired';
          }

          // Build update object
          const updateData: Record<string, any> = {
            subscriptionStatus,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            updatedAt: Timestamp.now(),
          };

          // Safely add currentPeriodEnd if it exists
          if (subscription.current_period_end) {
            updateData.currentPeriodEnd = Timestamp.fromMillis(subscription.current_period_end * 1000);
          }

          // Update plan tier if it changed
          if (planKey) {
            updateData.subscriptionTier = planKey;
          }

          // If subscription is no longer set to cancel, clear pending changes
          if (!subscription.cancel_at_period_end) {
            updateData.pendingPlanChange = null;
          }

          // Check for scheduled changes (downgrade)
          if (subscription.schedule) {
            // There's a schedule attached - may have pending plan change
            const scheduleId = subscription.schedule as string;
            try {
              const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
              if (schedule.phases && schedule.phases.length > 1) {
                // Get the next phase's plan
                const nextPhase = schedule.phases[1];
                const nextPriceId = nextPhase.items[0]?.price as string;
                if (nextPriceId) {
                  if (nextPriceId === process.env.STRIPE_FAMILY_PRICE_ID) {
                    updateData.pendingPlanChange = 'family';
                  } else if (nextPriceId === process.env.STRIPE_SINGLE_AGENCY_PRICE_ID) {
                    updateData.pendingPlanChange = 'single_agency';
                  } else if (nextPriceId === process.env.STRIPE_MULTI_AGENCY_PRICE_ID) {
                    updateData.pendingPlanChange = 'multi_agency';
                  }
                }
              }
            } catch (scheduleError) {
              console.error('Error fetching subscription schedule:', scheduleError);
            }
          }

          const adminDb = getAdminDb();
          await adminDb.collection('users').doc(userId).update(updateData);
          console.log('Subscription updated:', subscription.id, 'Status:', subscriptionStatus);

          // Also update the agency subscription tier if user has an agency
          // Find the agency where user is super_admin (not just agencies[0])
          const userDoc = await adminDb.collection('users').doc(userId).get();
          const userData = userDoc.data();
          if (userData?.agencies && userData.agencies.length > 0) {
            // Find agency where user is super_admin
            let targetAgencyId: string | null = null;
            for (const membership of userData.agencies) {
              if (membership.role === 'super_admin') {
                const agencyDoc = await adminDb.collection('agencies').doc(membership.agencyId).get();
                if (agencyDoc.exists && agencyDoc.data()?.superAdminId === userId) {
                  targetAgencyId = membership.agencyId;
                  break;
                }
              }
            }

            // Fallback to first agency if no super_admin role found
            if (!targetAgencyId) {
              targetAgencyId = userData.agencies[0].agencyId;
            }

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

            await adminDb.collection('agencies').doc(targetAgencyId).update(agencyUpdateData);
            console.log('Agency subscription updated:', targetAgencyId, 'Status:', subscriptionStatus);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata.userId;

        if (userId) {
          const adminDb = getAdminDb();
          await adminDb.collection('users').doc(userId).update({
            subscriptionStatus: 'canceled',
            cancelAtPeriodEnd: false,
            pendingPlanChange: null,
            updatedAt: Timestamp.now(),
          });
          console.log('Subscription deleted:', subscription.id);
        }
        break;
      }

      case 'subscription_schedule.completed': {
        // A scheduled plan change has been applied
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const userId = schedule.metadata?.userId;

        if (userId) {
          // Clear pending plan change since it's now applied
          const adminDb = getAdminDb();
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
        // A scheduled change was cancelled
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const userId = schedule.metadata?.userId;

        if (userId) {
          const adminDb = getAdminDb();
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
