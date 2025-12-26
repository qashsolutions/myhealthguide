export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caregiverId, agencyId, action, adminUserId } = body;

    if (!caregiverId || !agencyId || !action || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: caregiverId, agencyId, action, adminUserId' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify the admin user is the super admin of the agency
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    const agencyData = agencyDoc.data()!;
    if (agencyData.superAdminId !== adminUserId) {
      return NextResponse.json(
        { error: 'Only the agency super admin can approve or reject caregivers' },
        { status: 403 }
      );
    }

    // Get the caregiver's user document
    const userRef = adminDb.collection('users').doc(caregiverId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Caregiver user not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const agencies = userData.agencies || [];

    // Find the agency membership
    const agencyMembershipIndex = agencies.findIndex(
      (a: any) => a.agencyId === agencyId
    );

    if (agencyMembershipIndex === -1) {
      return NextResponse.json(
        { error: 'Caregiver is not associated with this agency' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'active' : 'rejected';

    // Update the agency membership status
    const updatedAgencies = [...agencies];
    updatedAgencies[agencyMembershipIndex] = {
      ...updatedAgencies[agencyMembershipIndex],
      status: newStatus,
      [`${action}dAt`]: new Date(),
      [`${action}dBy`]: adminUserId,
    };

    // Start batch write
    const batch = adminDb.batch();

    // Update user's agency membership
    batch.update(userRef, {
      agencies: updatedAgencies,
      updatedAt: Timestamp.now(),
    });

    // Update caregiver profile status
    const profileRef = adminDb.collection('caregiver_profiles').doc(caregiverId);
    batch.update(profileRef, {
      status: newStatus,
      [`${action}dAt`]: Timestamp.now(),
      [`${action}dBy`]: adminUserId,
      updatedAt: Timestamp.now(),
    });

    // If rejecting, remove from caregiverIds array
    if (action === 'reject') {
      batch.update(adminDb.collection('agencies').doc(agencyId), {
        caregiverIds: FieldValue.arrayRemove(caregiverId),
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      action,
      caregiverId,
      message: action === 'approve'
        ? 'Caregiver has been approved and can now access the agency.'
        : 'Caregiver request has been rejected.',
    });
  } catch (error) {
    console.error('Error processing caregiver approval:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch pending caregivers for an agency
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agencyId');
    const adminUserId = searchParams.get('adminUserId');

    if (!agencyId || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required params: agencyId, adminUserId' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify the admin user is the super admin of the agency
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    const agencyData = agencyDoc.data()!;
    if (agencyData.superAdminId !== adminUserId) {
      return NextResponse.json(
        { error: 'Only the agency super admin can view pending caregivers' },
        { status: 403 }
      );
    }

    // Get pending caregiver profiles
    const pendingProfilesSnapshot = await adminDb
      .collection('caregiver_profiles')
      .where('agencyId', '==', agencyId)
      .where('status', '==', 'pending_approval')
      .get();

    const pendingCaregivers = await Promise.all(
      pendingProfilesSnapshot.docs.map(async (doc) => {
        const profileData = doc.data();

        // Get user data for name, email, phone
        const userDoc = await adminDb.collection('users').doc(profileData.userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        return {
          id: doc.id,
          caregiverId: profileData.userId,
          fullName: userData?.firstName && userData?.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : profileData.fullName || 'Unknown',
          email: userData?.email || '',
          phoneNumber: userData?.phoneNumber || '',
          createdAt: profileData.createdAt?.toDate?.() || new Date(),
          emailVerified: userData?.emailVerified || false,
          phoneVerified: userData?.phoneVerified || false,
        };
      })
    );

    return NextResponse.json({
      pendingCaregivers,
      count: pendingCaregivers.length,
    });
  } catch (error) {
    console.error('Error fetching pending caregivers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pending caregivers' },
      { status: 500 }
    );
  }
}
