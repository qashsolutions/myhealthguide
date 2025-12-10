export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, agencyId, profile } = body;

    if (!userId || !agencyId || !profile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate required profile fields
    const requiredFields = ['fullName', 'languages', 'certifications', 'specializations', 'zipCode', 'emergencyContact'];
    for (const field of requiredFields) {
      if (!profile[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (!profile.emergencyContact?.name || !profile.emergencyContact?.phone) {
      return NextResponse.json(
        { error: 'Emergency contact name and phone are required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify user belongs to this agency
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const userAgencies = userData.agencies || [];
    const belongsToAgency = userAgencies.some((a: any) => a.agencyId === agencyId);

    if (!belongsToAgency) {
      return NextResponse.json(
        { error: 'User does not belong to this agency' },
        { status: 403 }
      );
    }

    // Update caregiver profile
    const profileRef = adminDb.collection('caregiver_profiles').doc(userId);
    const profileData = {
      id: userId,
      userId,
      agencyId,
      fullName: profile.fullName,
      photoUrl: profile.photoUrl || null,
      languages: profile.languages || [],
      languagesOther: profile.languagesOther || [],
      yearsExperience: profile.yearsExperience || 0,
      certifications: profile.certifications || [],
      certificationsOther: profile.certificationsOther || [],
      specializations: profile.specializations || [],
      specializationsOther: profile.specializationsOther || [],
      availability: profile.availability || {},
      zipCode: profile.zipCode,
      maxTravelDistance: profile.maxTravelDistance || null,
      comfortableWith: profile.comfortableWith || [],
      emergencyContact: {
        name: profile.emergencyContact.name,
        phone: profile.emergencyContact.phone,
        relationship: profile.emergencyContact.relationship || null,
      },
      onboardingCompleted: true,
      onboardingCompletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await profileRef.set(profileData, { merge: true });

    // Update user document to mark onboarding as complete
    await adminDb.collection('users').doc(userId).update({
      caregiverOnboardingRequired: false,
      caregiverOnboardingAgencyId: FieldValue.delete(),
      firstName: profile.fullName.split(' ')[0] || '',
      lastName: profile.fullName.split(' ').slice(1).join(' ') || '',
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully',
    });
  } catch (error) {
    console.error('Error completing caregiver profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete profile' },
      { status: 500 }
    );
  }
}

// Get caregiver profile
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const profileDoc = await adminDb.collection('caregiver_profiles').doc(userId).get();

    if (!profileDoc.exists) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const data = profileDoc.data()!;

    return NextResponse.json({
      profile: {
        ...data,
        onboardingCompletedAt: data.onboardingCompletedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching caregiver profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
