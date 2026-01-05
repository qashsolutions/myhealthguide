/**
 * Verify Caregiver Family Invite API
 * Checks if an invite token is valid before user signs up
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Get the invite
    const inviteDoc = await db.collection('caregiver_member_invites').doc(token).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { valid: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data();

    if (inviteData?.status !== 'pending') {
      return NextResponse.json(
        { valid: false, error: 'This invite has already been used or cancelled' },
        { status: 400 }
      );
    }

    // Check if expired
    const expiresAt = inviteData.expiresAt?.toDate?.() || new Date(0);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'This invite has expired' },
        { status: 400 }
      );
    }

    // Get caregiver info
    const caregiverDoc = await db.collection('users').doc(inviteData.caregiverId).get();
    const caregiverData = caregiverDoc.exists ? caregiverDoc.data() : {};
    const caregiverName = `${caregiverData?.firstName || ''} ${caregiverData?.lastName || ''}`.trim() || 'Your caregiver';

    // Get group info
    const groupDoc = await db.collection('groups').doc(inviteData.groupId).get();
    const groupData = groupDoc.exists ? groupDoc.data() : {};

    return NextResponse.json({
      valid: true,
      invite: {
        email: inviteData.email,
        name: inviteData.name,
        caregiverName,
        groupName: groupData?.name || 'Care Group',
        elderCount: inviteData.elderIds?.length || 0,
        expiresAt: inviteData.expiresAt?.toDate?.().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error verifying caregiver family invite:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
