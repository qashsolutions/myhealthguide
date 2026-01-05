/**
 * Accept Caregiver Family Invite API
 * Called when a family member accepts an invite from a caregiver
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in first' },
        { status: 401 }
      );
    }

    const authToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminDb();

    // Verify the auth token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(authToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Get the invite
    const inviteDoc = await db.collection('caregiver_member_invites').doc(token).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { error: 'Invite not found or has expired' },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data();

    if (inviteData?.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invite has already been used or cancelled' },
        { status: 400 }
      );
    }

    // Check if expired
    const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(0);
    if (new Date() > expiresAt) {
      // Mark as expired
      await inviteDoc.ref.update({ status: 'expired' });
      return NextResponse.json(
        { error: 'This invite has expired. Please ask your caregiver for a new invite.' },
        { status: 400 }
      );
    }

    const { groupId, caregiverId, elderIds, agencyId } = inviteData;

    // Get group
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = groupDoc.data();
    const members = groupData?.members || [];
    const memberIds = groupData?.memberIds || [];

    // Check if already a member
    if (memberIds.includes(userId)) {
      // Mark invite as used
      await inviteDoc.ref.update({
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: Timestamp.now()
      });

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this group',
        alreadyMember: true
      });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Add member to group
    const newMember = {
      userId,
      role: 'member',
      permissionLevel: 'read',
      permissions: ['view_all', 'view_insights'],
      addedAt: Timestamp.now(),
      addedBy: caregiverId,
      approvalStatus: 'approved', // Auto-approved when using invite link
      approvedAt: Timestamp.now(),
      approvedBy: caregiverId,
      // Caregiver-invited member fields
      invitedByCaregiverId: caregiverId,
      elderAccessIds: elderIds,
      agencyId
    };

    // Update group
    await db.collection('groups').doc(groupId).update({
      members: [...members, newMember],
      memberIds: [...memberIds, userId],
      updatedAt: Timestamp.now()
    });

    // Update user's groups array
    const userGroups = userData?.groups || [];
    const updatedUserGroups = [
      ...userGroups.filter((g: any) => g.groupId !== groupId),
      {
        groupId,
        role: 'member',
        permissionLevel: 'read',
        joinedAt: Timestamp.now(),
        invitedByCaregiverId: caregiverId,
        elderAccessIds: elderIds
      }
    ];

    await db.collection('users').doc(userId).update({
      groups: updatedUserGroups
    });

    // Create elder_access subcollections for Firestore rules
    for (const elderId of elderIds) {
      await db.collection('users').doc(userId).collection('elder_access').doc(elderId).set({
        elderId,
        groupId,
        grantedBy: caregiverId,
        grantedAt: Timestamp.now(),
        accessType: 'caregiver_family_member'
      });
    }

    // Mark invite as accepted
    await inviteDoc.ref.update({
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: Timestamp.now()
    });

    // Get caregiver name for response
    const caregiverDoc = await db.collection('users').doc(caregiverId).get();
    const caregiverData = caregiverDoc.exists ? caregiverDoc.data() : {};
    const caregiverName = `${caregiverData?.firstName || ''} ${caregiverData?.lastName || ''}`.trim() || 'Your caregiver';

    return NextResponse.json({
      success: true,
      message: `You have been added to the group by ${caregiverName}`,
      groupId,
      elderCount: elderIds.length,
      caregiverName
    });

  } catch (error: any) {
    console.error('Error accepting caregiver family invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
