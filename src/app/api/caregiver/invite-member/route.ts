/**
 * Caregiver Invite Member API
 * Allows caregivers to invite family members (viewers) for their assigned elders
 * Also allows superadmins to invite on behalf of caregivers
 *
 * Limits:
 * - Max 2 members per caregiver (maxMembersPerCaregiver)
 * - Members can only view elders assigned to the inviting caregiver
 * - Only caregivers with canInviteMembers permission can invite
 * - Superadmins can invite on behalf of any caregiver in their agency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PLAN_LIMITS } from '@/lib/subscription/subscriptionService';

const MAX_MEMBERS_PER_CAREGIVER = PLAN_LIMITS.MULTI_AGENCY.maxMembersPerCaregiver || 2;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, groupId, onBehalfOfCaregiverId, agencyId: bodyAgencyId } = body;

    if (!email || !groupId) {
      return NextResponse.json(
        { error: 'Email and group ID are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminDb();

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const callerId = decodedToken.uid;
    let caregiverId = callerId;
    let isSuperAdminInvite = false;
    let agencyId = bodyAgencyId;

    // Check if this is a superadmin inviting on behalf of a caregiver
    if (onBehalfOfCaregiverId && bodyAgencyId) {
      // Verify caller is the superadmin of this agency
      const agencyDoc = await db.collection('agencies').doc(bodyAgencyId).get();
      if (!agencyDoc.exists) {
        return NextResponse.json(
          { error: 'Agency not found' },
          { status: 404 }
        );
      }

      const agencyData = agencyDoc.data();
      if (agencyData?.superAdminId !== callerId) {
        return NextResponse.json(
          { error: 'Only the agency owner can invite on behalf of caregivers' },
          { status: 403 }
        );
      }

      // Use the specified caregiver ID
      caregiverId = onBehalfOfCaregiverId;
      isSuperAdminInvite = true;
    }

    // Get the caregiver's assignment
    const assignmentsSnap = await db.collection('caregiver_assignments')
      .where('caregiverId', '==', caregiverId)
      .where('active', '==', true)
      .get();

    if (assignmentsSnap.empty) {
      return NextResponse.json(
        { error: isSuperAdminInvite ? 'Selected caregiver has no active assignments' : 'You are not an active caregiver' },
        { status: 403 }
      );
    }

    // Get the assignment that matches the group
    let caregiverAssignment: any = null;
    let assignedElderIds: string[] = [];

    for (const doc of assignmentsSnap.docs) {
      const data = doc.data();
      if (data.groupId === groupId) {
        caregiverAssignment = { id: doc.id, ...data };
        assignedElderIds = data.elderIds || [];
        agencyId = data.agencyId;
        break;
      }
    }

    if (!caregiverAssignment) {
      return NextResponse.json(
        { error: isSuperAdminInvite ? 'Selected caregiver does not have access to this group' : 'You do not have access to this group' },
        { status: 403 }
      );
    }

    // Check if caregiver has permission to invite members (skip for superadmin invites)
    if (!isSuperAdminInvite) {
      const canInvite = caregiverAssignment.permissions?.canInviteMembers ||
                        caregiverAssignment.role === 'caregiver_admin';

      if (!canInvite) {
        return NextResponse.json(
          { error: 'You do not have permission to invite family members. Only primary caregivers can invite.' },
          { status: 403 }
        );
      }
    }

    if (assignedElderIds.length === 0) {
      return NextResponse.json(
        { error: isSuperAdminInvite ? 'Selected caregiver has no elders assigned' : 'You have no elders assigned. Please contact your agency owner.' },
        { status: 400 }
      );
    }

    // Count how many members this caregiver has already invited
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = groupDoc.data();
    const members = groupData?.members || [];

    const caregiverInvitedCount = members.filter(
      (m: any) => m.invitedByCaregiverId === caregiverId && m.approvalStatus === 'approved'
    ).length;

    if (caregiverInvitedCount >= MAX_MEMBERS_PER_CAREGIVER) {
      return NextResponse.json(
        { error: `You can only invite up to ${MAX_MEMBERS_PER_CAREGIVER} family members` },
        { status: 400 }
      );
    }

    // Check if email is already a member or has pending invite
    const existingMember = members.find((m: any) => {
      // We need to check by email - get user doc
      return false; // Will check below
    });

    // Check if user with this email already exists
    let existingUserId: string | null = null;
    try {
      const existingUser = await auth.getUserByEmail(email);
      existingUserId = existingUser.uid;

      // Check if already a member
      const isMember = members.some((m: any) => m.userId === existingUserId);
      if (isMember) {
        return NextResponse.json(
          { error: 'This person is already a member of the group' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // User doesn't exist yet - that's fine, they'll create account
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking user:', error);
      }
    }

    // Create the caregiver member invite
    const inviteRef = db.collection('caregiver_member_invites').doc();
    const inviteToken = inviteRef.id; // Use doc ID as token

    const inviteData: any = {
      id: inviteRef.id,
      email: email.toLowerCase(),
      name: name || '',
      groupId,
      caregiverId,
      caregiverName: '', // Will be filled from caregiver's user doc
      elderIds: assignedElderIds,
      agencyId: agencyId || caregiverAssignment.agencyId,
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
    };

    // Track if invite was created by superadmin
    if (isSuperAdminInvite) {
      inviteData.createdBySuperAdmin = true;
      inviteData.createdById = callerId;
    }

    // Get caregiver's name
    const caregiverDoc = await db.collection('users').doc(caregiverId).get();
    if (caregiverDoc.exists) {
      const caregiverData = caregiverDoc.data();
      inviteData.caregiverName = `${caregiverData?.firstName || ''} ${caregiverData?.lastName || ''}`.trim();
    }

    await inviteRef.set(inviteData);

    // Generate invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
    const inviteUrl = `${appUrl}/caregiver-family-invite?token=${inviteToken}`;

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      inviteId: inviteRef.id,
      inviteUrl,
      elderCount: assignedElderIds.length,
      remainingInvites: MAX_MEMBERS_PER_CAREGIVER - caregiverInvitedCount - 1
    });

  } catch (error: any) {
    console.error('Error creating caregiver member invite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

// GET - Get caregiver's invited members and remaining slots
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();
    const db = getAdminDb();

    // Verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const caregiverId = decodedToken.uid;

    // Get group members
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = groupDoc.data();
    const members = groupData?.members || [];

    // Get members invited by this caregiver
    const invitedMembers = members.filter(
      (m: any) => m.invitedByCaregiverId === caregiverId
    );

    // Get pending invites
    const pendingInvitesSnap = await db.collection('caregiver_member_invites')
      .where('caregiverId', '==', caregiverId)
      .where('groupId', '==', groupId)
      .where('status', '==', 'pending')
      .get();

    const pendingInvites = pendingInvitesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const approvedCount = invitedMembers.filter((m: any) => m.approvalStatus === 'approved').length;
    const pendingCount = pendingInvites.length;

    return NextResponse.json({
      invitedMembers,
      pendingInvites,
      approvedCount,
      pendingCount,
      maxAllowed: MAX_MEMBERS_PER_CAREGIVER,
      remainingSlots: Math.max(0, MAX_MEMBERS_PER_CAREGIVER - approvedCount - pendingCount)
    });

  } catch (error: any) {
    console.error('Error getting caregiver invited members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get invited members' },
      { status: 500 }
    );
  }
}
