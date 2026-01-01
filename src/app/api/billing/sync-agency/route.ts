export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Sync agency subscription from user's subscription
 * Used to fix agencies where the subscription tier wasn't properly synced
 */
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

    const adminDb = getAdminDb();

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Check if user has agencies
    if (!userData.agencies || userData.agencies.length === 0) {
      return NextResponse.json(
        { error: 'User has no agencies' },
        { status: 400 }
      );
    }

    // Find agency where user is super_admin (not just agencies[0])
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

    // Safety check - should never happen after fallback
    if (!targetAgencyId) {
      return NextResponse.json({ error: 'No agency found for user' }, { status: 400 });
    }

    // Get the agency
    const agencyDoc = await adminDb.collection('agencies').doc(targetAgencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    // Sync subscription data from user to agency
    const subscriptionTier = userData.subscriptionTier || 'family';
    const subscriptionStatus = userData.subscriptionStatus || 'trial';

    const updateData: Record<string, any> = {
      'subscription.tier': subscriptionTier,
      'subscription.status': subscriptionStatus,
      updatedAt: Timestamp.now(),
    };

    // Sync Stripe IDs if available
    if (userData.stripeCustomerId) {
      updateData['subscription.stripeCustomerId'] = userData.stripeCustomerId;
    }
    if (userData.stripeSubscriptionId) {
      updateData['subscription.stripeSubscriptionId'] = userData.stripeSubscriptionId;
    }
    if (userData.currentPeriodEnd) {
      // Convert Firestore Timestamp if needed
      if (userData.currentPeriodEnd.seconds) {
        updateData['subscription.currentPeriodEnd'] = Timestamp.fromMillis(userData.currentPeriodEnd.seconds * 1000);
      } else {
        updateData['subscription.currentPeriodEnd'] = userData.currentPeriodEnd;
      }
    }
    // Also sync trial end date
    if (userData.trialEndDate) {
      if (userData.trialEndDate.seconds) {
        updateData['subscription.trialEndsAt'] = Timestamp.fromMillis(userData.trialEndDate.seconds * 1000);
      } else {
        updateData['subscription.trialEndsAt'] = userData.trialEndDate;
      }
    }

    await adminDb.collection('agencies').doc(targetAgencyId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Agency subscription synced successfully',
      agencyId: targetAgencyId,
      subscriptionTier,
      subscriptionStatus,
    });
  } catch (error) {
    console.error('Error syncing agency subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}
