export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing invite token' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Find the invite by token
    const invitesSnapshot = await adminDb
      .collection('caregiver_invites')
      .where('inviteToken', '==', token)
      .limit(1)
      .get();

    if (invitesSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invite not found. This link may be invalid or expired.' },
        { status: 404 }
      );
    }

    const inviteDoc = invitesSnapshot.docs[0];
    const inviteData = inviteDoc.data();

    // Check if cancelled
    if (inviteData.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This invite has been cancelled.' },
        { status: 400 }
      );
    }

    // Get agency name
    let agencyName = 'Healthcare Agency';
    if (inviteData.agencyId) {
      const agencyDoc = await adminDb.collection('agencies').doc(inviteData.agencyId).get();
      if (agencyDoc.exists) {
        agencyName = agencyDoc.data()?.name || agencyName;
      }
    }

    // Format phone number for display
    const phoneNumber = inviteData.phoneNumber;
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
      const digits = phoneNumber.slice(2);
      formattedPhone = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return NextResponse.json({
      invite: {
        agencyName,
        phoneNumber: formattedPhone,
        status: inviteData.status,
        expiresAt: inviteData.expiresAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error verifying invite:', error);
    return NextResponse.json(
      { error: 'Failed to verify invite' },
      { status: 500 }
    );
  }
}
