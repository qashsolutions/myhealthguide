export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

type ManageAction = 'suspend' | 'revoke' | 'reactivate';

interface ManageRequest {
  caregiverId: string;
  agencyId: string;
  action: ManageAction;
  adminUserId: string;
  reason?: string;
  expiresAt?: string; // ISO date string for suspend expiry
}

export async function POST(req: NextRequest) {
  try {
    const body: ManageRequest = await req.json();
    const { caregiverId, agencyId, action, adminUserId, reason, expiresAt } = body;

    // Validate required fields
    if (!caregiverId || !agencyId || !action || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: caregiverId, agencyId, action, adminUserId' },
        { status: 400 }
      );
    }

    // Validate action
    if (!['suspend', 'revoke', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "suspend", "revoke", or "reactivate"' },
        { status: 400 }
      );
    }

    // Require reason for suspend and revoke
    if ((action === 'suspend' || action === 'revoke') && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for suspend and revoke actions' },
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
        { error: 'Only the agency super admin can manage caregivers' },
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

    const currentMembership = agencies[agencyMembershipIndex];

    // Validate state transitions
    if (action === 'reactivate' && currentMembership.status === 'active') {
      return NextResponse.json(
        { error: 'Caregiver is already active' },
        { status: 400 }
      );
    }

    if ((action === 'suspend' || action === 'revoke') &&
        (currentMembership.status === 'suspended' || currentMembership.status === 'revoked')) {
      return NextResponse.json(
        { error: `Caregiver is already ${currentMembership.status}` },
        { status: 400 }
      );
    }

    // Determine new status
    const newStatus = action === 'reactivate' ? 'active' : action === 'suspend' ? 'suspended' : 'revoked';

    // Create status history entry
    // Note: previousStatus defaults to 'active' if not set (legacy data)
    const statusHistoryEntry = {
      status: newStatus,
      previousStatus: currentMembership.status || 'active',
      reason: reason || null,
      changedAt: new Date().toISOString(),
      changedBy: adminUserId,
      expiresAt: action === 'suspend' && expiresAt ? expiresAt : null
    };

    // Update the agency membership
    const updatedAgencies = [...agencies];
    updatedAgencies[agencyMembershipIndex] = {
      ...currentMembership,
      status: newStatus,
      statusHistory: [...(currentMembership.statusHistory || []), statusHistoryEntry],
      suspendedAt: action === 'suspend' ? new Date().toISOString() : currentMembership.suspendedAt,
      suspendExpiresAt: action === 'suspend' && expiresAt ? expiresAt : null,
      revokedAt: action === 'revoke' ? new Date().toISOString() : currentMembership.revokedAt,
      reactivatedAt: action === 'reactivate' ? new Date().toISOString() : currentMembership.reactivatedAt,
      lastStatusChangeBy: adminUserId,
      lastStatusChangeAt: new Date().toISOString()
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
    const profileDoc = await profileRef.get();

    if (profileDoc.exists) {
      batch.update(profileRef, {
        status: newStatus,
        statusHistory: FieldValue.arrayUnion(statusHistoryEntry),
        suspendedAt: action === 'suspend' ? Timestamp.now() : null,
        suspendExpiresAt: action === 'suspend' && expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
        revokedAt: action === 'revoke' ? Timestamp.now() : null,
        reactivatedAt: action === 'reactivate' ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      });
    }

    // Update caregiver assignment
    const assignmentSnapshot = await adminDb
      .collection('caregiver_assignments')
      .where('caregiverId', '==', caregiverId)
      .get();

    const agencyAssignment = assignmentSnapshot.docs.find(
      doc => doc.data().agencyId === agencyId
    );

    if (agencyAssignment) {
      const isActive = action === 'reactivate';
      batch.update(agencyAssignment.ref, {
        active: isActive,
        [`${action}dAt`]: Timestamp.now(),
        [`${action}dBy`]: adminUserId,
        ...(action !== 'reactivate' && { deactivationReason: action }),
        updatedAt: Timestamp.now(),
      });
    }

    // If revoking, remove from caregiverIds array
    if (action === 'revoke') {
      batch.update(adminDb.collection('agencies').doc(agencyId), {
        caregiverIds: FieldValue.arrayRemove(caregiverId),
        updatedAt: Timestamp.now(),
      });
    }

    // If reactivating from revoked, add back to caregiverIds array
    if (action === 'reactivate' && currentMembership.status === 'revoked') {
      batch.update(adminDb.collection('agencies').doc(agencyId), {
        caregiverIds: FieldValue.arrayUnion(caregiverId),
        updatedAt: Timestamp.now(),
      });
    }

    // Commit all changes atomically
    await batch.commit();
    console.log(`Caregiver ${caregiverId} ${action}d in agency ${agencyId} by ${adminUserId}`);

    // Create security audit log
    await adminDb.collection('security_audit_logs').add({
      agencyId,
      action: `caregiver_${action}`,
      targetUserId: caregiverId,
      performedBy: adminUserId,
      reason: reason || null,
      previousStatus: currentMembership.status,
      newStatus,
      expiresAt: action === 'suspend' && expiresAt ? expiresAt : null,
      metadata: {
        caregiverName: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Unknown',
        agencyName: agencyData.name
      },
      createdAt: Timestamp.now(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });

    // Get caregiver name for notifications
    const caregiverName = userData.firstName || 'Caregiver';

    // Create notifications based on action
    const notificationConfig = {
      suspend: {
        title: 'Access Suspended',
        message: `Your access to ${agencyData.name} has been temporarily suspended.${reason ? ` Reason: ${reason}` : ''}`,
        priority: 'high' as const
      },
      revoke: {
        title: 'Access Revoked',
        message: `Your access to ${agencyData.name} has been revoked.${reason ? ` Reason: ${reason}` : ''}`,
        priority: 'high' as const
      },
      reactivate: {
        title: 'Access Restored',
        message: `Your access to ${agencyData.name} has been restored. You can now access the caregiver dashboard.`,
        priority: 'normal' as const
      }
    };

    const notification = notificationConfig[action];

    // Queue FCM push notification
    await adminDb.collection('fcm_notification_queue').add({
      userId: caregiverId,
      title: notification.title,
      body: notification.message,
      data: {
        type: `caregiver_${action}`,
        agencyId,
        url: action === 'reactivate' ? '/dashboard' : '/'
      },
      webpush: {
        fcmOptions: {
          link: action === 'reactivate' ? '/dashboard' : '/'
        },
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `caregiver-${action}-${agencyId}`
        }
      },
      status: 'pending',
      createdAt: Timestamp.now()
    });

    // Create bell icon notification
    await adminDb.collection('user_notifications').add({
      userId: caregiverId,
      type: `caregiver_${action}`,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      actionUrl: action === 'reactivate' ? '/dashboard' : '/',
      actionRequired: false,
      read: false,
      dismissed: false,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    });

    return NextResponse.json({
      success: true,
      action,
      caregiverId,
      newStatus,
      message: `Caregiver has been ${action === 'reactivate' ? 'reactivated' : action + 'ed'} successfully.`,
    });
  } catch (error) {
    console.error('Error managing caregiver:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage caregiver' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch caregiver status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caregiverId = searchParams.get('caregiverId');
    const agencyId = searchParams.get('agencyId');
    const adminUserId = searchParams.get('adminUserId');

    if (!caregiverId || !agencyId || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required params: caregiverId, agencyId, adminUserId' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify the admin user is the super admin
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
        { error: 'Only the agency super admin can view caregiver status' },
        { status: 403 }
      );
    }

    // Get caregiver user data
    const userDoc = await adminDb.collection('users').doc(caregiverId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const agencyMembership = userData.agencies?.find((a: any) => a.agencyId === agencyId);

    if (!agencyMembership) {
      return NextResponse.json(
        { error: 'Caregiver not in this agency' },
        { status: 404 }
      );
    }

    // Get caregiver profile
    const profileDoc = await adminDb.collection('caregiver_profiles').doc(caregiverId).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;

    return NextResponse.json({
      caregiverId,
      name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
      email: userData.email || '',
      status: agencyMembership.status,
      statusHistory: agencyMembership.statusHistory || [],
      suspendExpiresAt: agencyMembership.suspendExpiresAt || null,
      profile: profileData ? {
        certifications: profileData.certifications || [],
        specializations: profileData.specializations || [],
        yearsExperience: profileData.yearsExperience
      } : null
    });
  } catch (error) {
    console.error('Error getting caregiver status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get caregiver status' },
      { status: 500 }
    );
  }
}
