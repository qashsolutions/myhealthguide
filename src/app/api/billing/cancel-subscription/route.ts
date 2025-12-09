export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ElderBillingService } from '@/lib/stripe/elderBilling';
import { verifyAuthToken, canAccessAgencyServer } from '@/lib/api/verifyAuth';
import { getAdminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const authResult = await verifyAuthToken(req);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { subscriptionId, reason } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
    }

    // Get subscription to verify ownership
    const adminDb = getAdminDb();
    const subscriptionDoc = await adminDb.collection('elderSubscriptions').doc(subscriptionId).get();

    if (!subscriptionDoc.exists) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const subscriptionData = subscriptionDoc.data();
    const agencyId = subscriptionData?.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Verify user has admin access to this agency
    const accessResult = await canAccessAgencyServer(authResult.userId, agencyId);
    if (!accessResult.canAccess) {
      return NextResponse.json(
        { error: 'Access denied. Only agency admins can cancel subscriptions.' },
        { status: 403 }
      );
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
