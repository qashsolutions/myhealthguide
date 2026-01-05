/**
 * Group Members API
 * Fetches group members with user details using Admin SDK
 * This bypasses Firestore client rules to allow reading other users' basic info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt?: any;
  name: string;
  email: string;
  profileImage?: string;
  permission?: 'admin' | 'write' | 'read';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

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

    // Check if requester is admin or member of the group
    const isAdmin = groupData?.adminId === requesterId;
    const memberIds = groupData?.memberIds || [];
    const isMember = memberIds.includes(requesterId);

    // Also check if requester has agency access
    const requesterDoc = await db.collection('users').doc(requesterId).get();
    const requesterData = requesterDoc.data();
    const hasAgencyAccess = requesterData?.agencies && requesterData.agencies.length > 0;

    if (!isAdmin && !isMember && !hasAgencyAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get members from group
    const members = groupData?.members || [];
    const writeMemberIds = groupData?.writeMemberIds || [];

    // Fetch user details for each member
    const membersWithDetails: GroupMember[] = await Promise.all(
      members.map(async (member: any) => {
        try {
          const userDoc = await db.collection('users').doc(member.userId).get();

          if (!userDoc.exists) {
            return {
              userId: member.userId,
              role: member.role,
              joinedAt: member.joinedAt,
              name: 'Unknown User',
              email: '',
              permission: member.role === 'admin' ? 'admin' :
                         writeMemberIds.includes(member.userId) ? 'write' : 'read'
            };
          }

          const userData = userDoc.data();
          const firstName = userData?.firstName || '';
          const lastName = userData?.lastName || '';

          return {
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            name: `${firstName} ${lastName}`.trim() || 'Unknown User',
            email: userData?.email || '',
            profileImage: userData?.profileImage,
            permission: member.role === 'admin' ? 'admin' :
                       writeMemberIds.includes(member.userId) ? 'write' : 'read'
          };
        } catch (error) {
          console.error(`Error fetching user ${member.userId}:`, error);
          return {
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            name: 'Unknown User',
            email: '',
            permission: member.role === 'admin' ? 'admin' :
                       writeMemberIds.includes(member.userId) ? 'write' : 'read'
          };
        }
      })
    );

    return NextResponse.json({
      members: membersWithDetails,
      groupId,
      adminId: groupData?.adminId
    });

  } catch (error: any) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}
