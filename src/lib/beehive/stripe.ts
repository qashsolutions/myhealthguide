import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

/**
 * Stripe Configuration for Beehive Platform
 * - Patient subscription: $11/month
 * - Background check payments: $20 + fees
 */

// Server-side Stripe instance
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || '',
  {
    apiVersion: '2024-12-18.acacia',
  }
);

// Client-side Stripe promise
let stripePromise: Promise<any> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    );
  }
  return stripePromise;
};

// Subscription plans
export const PLANS = {
  PATIENT_MONTHLY: {
    id: 'patient_monthly',
    name: 'Patient Monthly Subscription',
    price: 1100, // $11.00 in cents
    interval: 'month' as const,
    features: [
      'Unlimited caregiver searches',
      'Direct messaging with caregivers',
      'Video consultations',
      'Care coordination tools',
      'Family member access',
      '24/7 support',
    ],
  },
};

// Background check configuration
export const BACKGROUND_CHECK = {
  basePrice: 2000, // $20.00 in cents
  description: 'Comprehensive background check',
  features: [
    'Criminal records check',
    'Sex offender registry',
    'Identity verification',
    'Employment verification',
    'Professional license verification',
  ],
};

/**
 * Create a Stripe checkout session for patient subscription
 */
export async function createPatientCheckoutSession(
  userId: string,
  email: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    // Create or retrieve customer
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
          userType: 'patient',
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: PLANS.PATIENT_MONTHLY.name,
              description: 'Monthly subscription for Beehive patient services',
            },
            recurring: {
              interval: PLANS.PATIENT_MONTHLY.interval,
            },
            unit_amount: PLANS.PATIENT_MONTHLY.price,
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        userType: 'patient',
      },
      subscription_data: {
        metadata: {
          userId,
          userType: 'patient',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a Stripe checkout session for caregiver background check
 */
export async function createBackgroundCheckSession(
  userId: string,
  email: string,
  name: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    // Create or retrieve customer
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
          userType: 'caregiver',
        },
      });
      customerId = customer.id;
    }

    // Create one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: BACKGROUND_CHECK.description,
              description: 'One-time background check for caregiver verification',
            },
            unit_amount: BACKGROUND_CHECK.basePrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        userType: 'caregiver',
        checkType: 'background',
      },
      payment_intent_data: {
        metadata: {
          userId,
          userType: 'caregiver',
          checkType: 'background',
        },
      },
      billing_address_collection: 'required',
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Error creating background check session:', error);
    throw new Error('Failed to create payment session');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      return {
        active: true,
        subscriptionId: subscription.id,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    }

    return {
      active: false,
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      active: false,
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }
}

/**
 * Handle webhook events
 */
export async function handleStripeWebhook(
  signature: string,
  rawBody: string
) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    return event;
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}