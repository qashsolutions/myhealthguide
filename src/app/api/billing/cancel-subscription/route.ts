import { NextRequest, NextResponse } from 'next/server';
import { ElderBillingService } from '@/lib/stripe/elderBilling';

export async function POST(req: NextRequest) {
  try {
    // Get request body
    const body = await req.json();
    const { subscriptionId, reason } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
    }

    // Cancel subscription
    const result = await ElderBillingService.cancelElderSubscription({
      subscriptionId,
      reason: reason || 'No reason provided',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
