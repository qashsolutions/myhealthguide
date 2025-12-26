export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, userId, phoneNumber } = body;

    if (!token || !userId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: token, userId, phoneNumber' },
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
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    const inviteDoc = invitesSnapshot.docs[0];
    const inviteData = inviteDoc.data();

    // Verify status
    if (inviteData.status !== 'pending') {
      return NextResponse.json(
        { error: `Invite is ${inviteData.status}. Cannot accept.` },
        { status: 400 }
      );
    }

    // Verify expiry
    const expiresAt = inviteData.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) {
      // Update status to expired
      await inviteDoc.ref.update({
        status: 'expired',
        updatedAt: Timestamp.now(),
      });
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 400 }
      );
    }

    // Normalize phone numbers for comparison
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
    const invitePhone = normalizePhone(inviteData.phoneNumber);
    const userPhone = normalizePhone(phoneNumber);

    // Verify phone number matches (last 10 digits)
    const invitePhoneLast10 = invitePhone.slice(-10);
    const userPhoneLast10 = userPhone.slice(-10);

    if (invitePhoneLast10 !== userPhoneLast10) {
      return NextResponse.json(
        { error: 'Phone number does not match the invite. Please sign up with the correct phone number.' },
        { status: 400 }
      );
    }

    const agencyId = inviteData.agencyId;

    // Get agency details
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    const agencyData = agencyDoc.data()!;

    // Start a batch write
    const batch = adminDb.batch();

    // 1. Update invite status
    batch.update(inviteDoc.ref, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      acceptedByUserId: userId,
      updatedAt: Timestamp.now(),
    });

    // 2. Add user to agency's caregiverIds
    batch.update(adminDb.collection('agencies').doc(agencyId), {
      caregiverIds: FieldValue.arrayUnion(userId),
      updatedAt: Timestamp.now(),
    });

    // 3. Add agency membership to user's document
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const currentAgencies = userData.agencies || [];

      // Check if already a member
      const alreadyMember = currentAgencies.some((a: any) => a.agencyId === agencyId);

      if (!alreadyMember) {
        batch.update(userRef, {
          agencies: FieldValue.arrayUnion({
            agencyId,
            role: 'caregiver',
            status: 'pending_approval', // Requires admin approval before accessing elder data
            joinedAt: new Date(),
            assignedElderIds: [],
            assignedGroupIds: [],
          }),
          // Mark that caregiver needs to complete onboarding
          caregiverOnboardingRequired: true,
          caregiverOnboardingAgencyId: agencyId,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // 4. Create initial caregiver profile (to be completed in onboarding)
    const profileRef = adminDb.collection('caregiver_profiles').doc(userId);
    batch.set(profileRef, {
      id: userId,
      userId,
      agencyId,
      status: 'pending_approval', // Requires admin approval
      fullName: '', // To be filled in onboarding
      languages: [],
      yearsExperience: 0,
      certifications: [],
      specializations: [],
      availability: {
        monday: { available: false },
        tuesday: { available: false },
        wednesday: { available: false },
        thursday: { available: false },
        friday: { available: false },
        saturday: { available: false },
        sunday: { available: false },
      },
      zipCode: '',
      comfortableWith: [],
      emergencyContact: {
        name: '',
        phone: '',
      },
      onboardingCompleted: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Commit batch
    await batch.commit();

    return NextResponse.json({
      success: true,
      agencyId,
      agencyName: agencyData.name,
      message: 'Your request has been submitted. An administrator will review and approve your access.',
      requiresOnboarding: true,
      pendingApproval: true,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
