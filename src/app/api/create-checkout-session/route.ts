export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceId, userId, userEmail, planName, skipTrial } = body;

    if (!priceId || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, userId, userEmail' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Get the app URL - prefer APP_URL (server-side) over NEXT_PUBLIC_APP_URL
    // In production, this should be the canonical domain
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';

    // Create Checkout Session
    // When a user subscribes (pays), they start their paid subscription immediately
    // No trial period - the 45-day free trial is BEFORE they subscribe (handled separately)
    const sessionConfig: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        // No trial_period_days - user is paying, not trialing
        metadata: {
          userId,
          planName,
        },
      },
      // Metadata for tracking
      metadata: {
        userId,
        planName,
      },
      customer_email: userEmail,
      success_url: `${appUrl}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      // Allow promotion codes
      allow_promotion_codes: true,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
