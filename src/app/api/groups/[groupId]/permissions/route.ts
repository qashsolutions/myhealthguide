/**
 * Group Permissions API
 * Updates member permission levels using Admin SDK
 * Required because client SDK cannot update other users' documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const { userId, permissionLevel } = body;

    if (!groupId || !userId || !permissionLevel) {
      return NextResponse.json(
        { error: 'Group ID, user ID, and permission level are required' },
        { status: 400 }
      );
    }

    // Validate permission level
    if (!['admin', 'write', 'read'].includes(permissionLevel)) {
      return NextResponse.json(
        { error: 'Invalid permission level. Must be admin, write, or read' },
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

    const requesterId = decodedToken.uid;

    // Get the group document
    const groupDoc = await db.collection('groups').doc(groupId).get();

    if (!groupDoc.exists) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const groupData = groupDoc.data();

    // Check if requester is admin of the group
    const isAdmin = groupData?.adminId === requesterId;
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only group admin can change permissions' },
        { status: 403 }
      );
    }

    // Get current members
    const members = groupData?.members || [];
    const memberIndex = members.findIndex((m: any) => m.userId === userId);

    if (memberIndex === -1) {
      return NextResponse.json(
        { error: 'User is not a member of this group' },
        { status: 404 }
      );
    }

    // Check if assigning 'write' permission - only 1 member can have write
    if (permissionLevel === 'write') {
      const existingWriteMember = members.find(
        (m: any) => m.permissionLevel === 'write' && m.userId !== userId
      );

      if (existingWriteMember) {
        return NextResponse.json(
          { error: 'Only one member can have write permission. Please revoke existing write permission first.' },
          { status: 400 }
        );
      }
    }

    // Update member permission in group
    members[memberIndex] = {
      ...members[memberIndex],
      permissionLevel
    };

    // Update writeMemberIds array
    const writeMemberIds = members
      .filter((m: any) => m.permissionLevel === 'write')
      .map((m: any) => m.userId);

    // Update group document
    await db.collection('groups').doc(groupId).update({
      members,
      writeMemberIds,
      updatedAt: Timestamp.now()
    });

    // Update user's group membership using Admin SDK
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const userGroups = userData?.groups || [];
      const updatedUserGroups = userGroups.map((g: any) =>
        g.groupId === groupId
          ? { ...g, permissionLevel }
          : g
      );

      await db.collection('users').doc(userId).update({
        groups: updatedUserGroups
      });
    }

    return NextResponse.json({
      success: true,
      message: `Permission updated to ${permissionLevel}`,
      userId,
      permissionLevel
    });

  } catch (error: any) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update permission' },
      { status: 500 }
    );
  }
}
