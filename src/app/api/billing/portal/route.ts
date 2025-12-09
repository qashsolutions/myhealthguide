export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Get user from Firestore to find their Stripe customer ID
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing information found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
