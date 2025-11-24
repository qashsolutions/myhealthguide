import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ElderBillingService } from '@/lib/stripe/elderBilling';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

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
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        const planName = subscription.metadata.planName;

        if (userId) {
          // Update user subscription status in Firestore
          await updateDoc(doc(db, 'users', userId), {
            subscriptionStatus: subscription.status === 'trialing' ? 'trial' : 'active',
            subscriptionTier: planName?.toLowerCase().replace(' plan', '').replace(' ', '_') || 'unknown',
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            trialEndDate: subscription.trial_end
              ? Timestamp.fromDate(new Date(subscription.trial_end * 1000))
              : null,
            updatedAt: Timestamp.now(),
          });
          console.log('Subscription created and synced to Firestore:', subscription.id);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (userId) {
          await updateDoc(doc(db, 'users', userId), {
            subscriptionStatus: subscription.status === 'active' ? 'active' :
                               subscription.status === 'trialing' ? 'trial' :
                               subscription.status === 'canceled' ? 'canceled' : 'expired',
            updatedAt: Timestamp.now(),
          });
          console.log('Subscription updated:', subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (userId) {
          await updateDoc(doc(db, 'users', userId), {
            subscriptionStatus: 'canceled',
            updatedAt: Timestamp.now(),
          });
          console.log('Subscription canceled:', subscription.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);
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
