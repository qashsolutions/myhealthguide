export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Find the agency where user is super_admin
 * Returns null if user is not super_admin of any agency
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

  // User is not super_admin of any agency
  return null;
}

/**
 * Sync agency subscription from user's subscription
 * Used to fix agencies where the subscription tier wasn't properly synced
 * Only works for super_admin users - caregivers cannot sync agency subscriptions
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

    // Find agency where user is super_admin (NO fallback)
    const agencyId = await findSuperAdminAgency(adminDb, userId, userData);

    if (!agencyId) {
      return NextResponse.json(
        { error: 'User is not super_admin of any agency. Only super admins can sync agency subscriptions.' },
        { status: 403 }
      );
    }

    // Get the agency
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    // Build update data from user's subscription
    const subscriptionTier = userData.subscriptionTier || 'family';
    const subscriptionStatus = userData.subscriptionStatus || 'trial';

    const agencyUpdateData: Record<string, any> = {
      'subscription.tier': subscriptionTier,
      'subscription.status': subscriptionStatus,
      updatedAt: Timestamp.now(),
    };

    // Sync Stripe IDs if available
    if (userData.stripeCustomerId) {
      agencyUpdateData['subscription.stripeCustomerId'] = userData.stripeCustomerId;
    }
    if (userData.stripeSubscriptionId) {
      agencyUpdateData['subscription.stripeSubscriptionId'] = userData.stripeSubscriptionId;
    }

    // Sync dates with proper Firestore Timestamp conversion
    if (userData.currentPeriodEnd) {
      if (userData.currentPeriodEnd.seconds) {
        agencyUpdateData['subscription.currentPeriodEnd'] = Timestamp.fromMillis(userData.currentPeriodEnd.seconds * 1000);
      } else if (userData.currentPeriodEnd instanceof Date) {
        agencyUpdateData['subscription.currentPeriodEnd'] = Timestamp.fromDate(userData.currentPeriodEnd);
      }
    }

    if (userData.trialEndDate) {
      if (userData.trialEndDate.seconds) {
        agencyUpdateData['subscription.trialEndsAt'] = Timestamp.fromMillis(userData.trialEndDate.seconds * 1000);
      } else if (userData.trialEndDate instanceof Date) {
        agencyUpdateData['subscription.trialEndsAt'] = Timestamp.fromDate(userData.trialEndDate);
      }
    }

    // Update agency
    await adminDb.collection('agencies').doc(agencyId).update(agencyUpdateData);

    return NextResponse.json({
      success: true,
      message: 'Agency subscription synced successfully',
      agencyId,
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
