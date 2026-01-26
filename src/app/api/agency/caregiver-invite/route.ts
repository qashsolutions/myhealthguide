/**
 * Caregiver Invite API - No SMS
 *
 * Creates caregiver invites for offline sharing (copy link, share button).
 * Phone number is used for verification at signup, NOT for SMS.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Generate a secure invite token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Normalize phone number to +1XXXXXXXXXX format
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  throw new Error('Invalid phone number format. Please enter a 10-digit US phone number.');
}

/**
 * POST - Create a new caregiver invite
 * Returns invite URL for offline sharing
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agencyId, superAdminId, phoneNumber } = body;

    // Validate required fields
    if (!agencyId || !superAdminId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId, superAdminId, phoneNumber' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid phone number' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify the agency exists and the user is the super admin
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agencyDoc.data()!;
    if (agencyData.superAdminId !== superAdminId) {
      return NextResponse.json(
        { error: 'Only the agency owner can invite caregivers' },
        { status: 403 }
      );
    }

    // Check caregiver limit (max 10 for multi-agency)
    const caregiverCount = agencyData.caregiverIds?.length || 0;
    if (caregiverCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum caregiver limit reached (10 caregivers)' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invite for this phone number
    const existingInvites = await adminDb
      .collection('caregiver_invites')
      .where('agencyId', '==', agencyId)
      .where('phoneNumber', '==', normalizedPhone)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvites.empty) {
      return NextResponse.json(
        { error: 'An invite already exists for this phone number' },
        { status: 400 }
      );
    }

    // Check if user with this phone is already a caregiver in this agency
    const existingUsers = await adminDb
      .collection('users')
      .where('phoneNumber', '==', normalizedPhone)
      .limit(1)
      .get();

    if (!existingUsers.empty) {
      const existingUser = existingUsers.docs[0].data();
      const userAgencies = existingUser.agencies || [];
      const alreadyInAgency = userAgencies.some(
        (a: any) => a.agencyId === agencyId && a.status !== 'rejected'
      );
      if (alreadyInAgency) {
        return NextResponse.json(
          { error: 'This user is already a member of your agency' },
          { status: 400 }
        );
      }
    }

    // Generate invite token and expiry (7 days)
    const inviteToken = generateInviteToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
    const inviteUrl = `${appUrl}/caregiver-invite?token=${inviteToken}`;

    // Create invite record
    const inviteRef = adminDb.collection('caregiver_invites').doc();
    await inviteRef.set({
      id: inviteRef.id,
      agencyId,
      superAdminId,
      phoneNumber: normalizedPhone,
      status: 'pending',
      inviteToken,
      inviteUrl, // Store URL for easy retrieval
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      // No SMS fields - invite is shared offline
    });

    return NextResponse.json({
      success: true,
      inviteId: inviteRef.id,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      message: 'Invite created. Share the link with the caregiver.',
    });
  } catch (error) {
    console.error('Error creating caregiver invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invite' },
      { status: 500 }
    );
  }
}

/**
 * GET - List caregiver invites for an agency
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get('agencyId');
    const superAdminId = searchParams.get('superAdminId');

    if (!agencyId || !superAdminId) {
      return NextResponse.json(
        { error: 'Missing required params: agencyId, superAdminId' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify super admin
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    if (agencyDoc.data()?.superAdminId !== superAdminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all invites for this agency
    const invitesSnapshot = await adminDb
      .collection('caregiver_invites')
      .where('agencyId', '==', agencyId)
      .limit(50)
      .get();

    // Build invites with user details for accepted ones
    const invites = await Promise.all(invitesSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const invite: Record<string, any> = {
        id: doc.id,
        phoneNumber: data.phoneNumber,
        status: data.status,
        inviteUrl: data.inviteUrl || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        acceptedAt: data.acceptedAt?.toDate?.()?.toISOString() || null,
      };

      // For accepted invites, fetch user details
      if (data.status === 'accepted' && data.acceptedByUserId) {
        try {
          const profileDoc = await adminDb
            .collection('caregiver_profiles')
            .doc(data.acceptedByUserId)
            .get();

          if (profileDoc.exists) {
            const profileData = profileDoc.data()!;
            invite.acceptedByName = profileData.fullName || null;
            invite.acceptedByEmail = profileData.email || null;
          }

          if (!invite.acceptedByName || !invite.acceptedByEmail) {
            const userDoc = await adminDb
              .collection('users')
              .doc(data.acceptedByUserId)
              .get();

            if (userDoc.exists) {
              const userData = userDoc.data()!;
              if (!invite.acceptedByName) {
                invite.acceptedByName = userData.firstName && userData.lastName
                  ? `${userData.firstName} ${userData.lastName}`.trim()
                  : userData.firstName || null;
              }
              if (!invite.acceptedByEmail) {
                invite.acceptedByEmail = userData.email || null;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching user details for invite:', err);
        }
      }

      return invite;
    }));

    // Sort by createdAt desc
    invites.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel an invite
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { inviteId, agencyId, superAdminId } = body;

    if (!inviteId || !agencyId || !superAdminId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify super admin
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists || agencyDoc.data()?.superAdminId !== superAdminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update invite status
    await adminDb.collection('caregiver_invites').doc(inviteId).update({
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel invite' },
      { status: 500 }
    );
  }
}
