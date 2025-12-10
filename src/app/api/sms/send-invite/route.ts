export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import twilio from 'twilio';
import crypto from 'crypto';

// Initialize Twilio client
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  return twilio(accountSid, authToken);
}

// Normalize phone number to +1XXXXXXXXXX format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If 10 digits, add +1 prefix
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If 11 digits starting with 1, add + prefix
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If already has + prefix
  if (phone.startsWith('+')) {
    return phone;
  }

  throw new Error('Invalid phone number format. Please enter a 10-digit US phone number.');
}

// Generate a unique invite token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

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
        { error: 'Only the agency super admin can invite caregivers' },
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
      .get();

    if (!existingInvites.empty) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this phone number' },
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
        (a: any) => a.agencyId === agencyId
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

    // Create invite record
    const inviteRef = adminDb.collection('caregiver_invites').doc();
    const inviteData = {
      id: inviteRef.id,
      agencyId,
      superAdminId,
      phoneNumber: normalizedPhone,
      status: 'pending',
      inviteToken,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    // Build invite URL
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
    const inviteUrl = `${appUrl}/caregiver-invite?token=${inviteToken}`;

    // Send SMS via Twilio
    const twilioClient = getTwilioClient();
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioPhoneNumber) {
      throw new Error('Twilio phone number not configured');
    }

    const message = await twilioClient.messages.create({
      body: `You've been invited to join ${agencyData.name || 'an agency'} as a caregiver on MyGuide.Health. Sign up here: ${inviteUrl}`,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    // Update invite with SMS details
    await inviteRef.set({
      ...inviteData,
      smsSentAt: Timestamp.now(),
      smsMessageId: message.sid,
      smsStatus: 'sent',
    });

    return NextResponse.json({
      success: true,
      inviteId: inviteRef.id,
      message: 'Invite sent successfully',
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error sending caregiver invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 500 }
    );
  }
}

// Get pending invites for an agency
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
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const invites = invitesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        phoneNumber: data.phoneNumber,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        acceptedAt: data.acceptedAt?.toDate?.()?.toISOString() || null,
        smsStatus: data.smsStatus,
      };
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

// Cancel a pending invite
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
