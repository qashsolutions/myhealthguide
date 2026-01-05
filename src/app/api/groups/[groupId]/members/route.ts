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
  role: 'admin' | 'member' | 'agency_caregiver';
  joinedAt?: any;
  addedAt?: any; // For backward compatibility with MemberCard
  name: string;
  email: string;
  profileImage?: string;
  permissionLevel?: 'admin' | 'write' | 'read';
  agencyId?: string;
  isCaregiver?: boolean;
  assignedElderCount?: number;
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

    // Check if this is a multi-agency group
    const agencyId = groupData?.agencyId;

    // Get caregiver assignments if this is an agency group
    let caregiverAssignments: Map<string, number> = new Map();
    if (agencyId) {
      const assignmentsSnap = await db.collection('caregiver_assignments')
        .where('agencyId', '==', agencyId)
        .where('active', '==', true)
        .get();

      assignmentsSnap.docs.forEach(doc => {
        const data = doc.data();
        const elderCount = data.elderIds?.length || 0;
        caregiverAssignments.set(data.caregiverId, elderCount);
      });
    }

    // Fetch user details for each member
    const membersWithDetails: GroupMember[] = await Promise.all(
      members.map(async (member: any) => {
        try {
          const userDoc = await db.collection('users').doc(member.userId).get();
          const userData = userDoc.exists ? userDoc.data() : null;

          // Determine if this user is a caregiver
          const isCaregiver = member.role === 'agency_caregiver' ||
                             member.agencyId ||
                             (userData?.agencies && userData.agencies.length > 0);

          // Get assigned elder count for caregivers
          const assignedElderCount = caregiverAssignments.get(member.userId) || 0;

          // Determine permission level
          let permissionLevel: 'admin' | 'write' | 'read' = 'read';
          if (member.role === 'admin') {
            permissionLevel = 'admin';
          } else if (isCaregiver || writeMemberIds.includes(member.userId)) {
            permissionLevel = 'write';
          }

          const firstName = userData?.firstName || '';
          const lastName = userData?.lastName || '';

          // Use addedAt or joinedAt, whichever is available
          // Convert Firestore Admin SDK Timestamp to ISO string for consistent handling
          const rawDate = member.addedAt || member.joinedAt || member.createdAt;
          let memberDate = null;
          if (rawDate) {
            // Admin SDK timestamps have _seconds, client SDK has seconds
            if (rawDate._seconds) {
              memberDate = new Date(rawDate._seconds * 1000).toISOString();
            } else if (rawDate.seconds) {
              memberDate = new Date(rawDate.seconds * 1000).toISOString();
            } else if (rawDate.toDate) {
              memberDate = rawDate.toDate().toISOString();
            } else if (rawDate instanceof Date) {
              memberDate = rawDate.toISOString();
            } else if (typeof rawDate === 'string') {
              memberDate = rawDate;
            }
          }

          return {
            userId: member.userId,
            role: member.role,
            joinedAt: memberDate,
            addedAt: memberDate, // For backward compatibility with MemberCard
            name: `${firstName} ${lastName}`.trim() || 'Unknown User',
            email: userData?.email || '',
            profileImage: userData?.profileImage,
            permissionLevel,
            agencyId: member.agencyId,
            isCaregiver,
            assignedElderCount: isCaregiver ? assignedElderCount : undefined
          };
        } catch (error) {
          console.error(`Error fetching user ${member.userId}:`, error);
          // Convert date in error case too
          const rawDate = member.addedAt || member.joinedAt || member.createdAt;
          let memberDate = null;
          if (rawDate) {
            if (rawDate._seconds) {
              memberDate = new Date(rawDate._seconds * 1000).toISOString();
            } else if (rawDate.seconds) {
              memberDate = new Date(rawDate.seconds * 1000).toISOString();
            } else if (typeof rawDate === 'string') {
              memberDate = rawDate;
            }
          }
          return {
            userId: member.userId,
            role: member.role,
            joinedAt: memberDate,
            addedAt: memberDate,
            name: 'Unknown User',
            email: '',
            permissionLevel: member.role === 'admin' ? 'admin' : 'read' as const,
            isCaregiver: false
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
