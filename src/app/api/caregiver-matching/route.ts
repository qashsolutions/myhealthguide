export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getElderCaregiverMatches, formatMatchScore } from '@/lib/ai/caregiverMatching';
import type { CaregiverProfile, Elder } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agencyId, elderId, superAdminId } = body;

    if (!agencyId || !elderId || !superAdminId) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId, elderId, superAdminId' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify agency and super admin
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const agencyData = agencyDoc.data()!;
    if (agencyData.superAdminId !== superAdminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get elder data
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();
    if (!elderDoc.exists) {
      return NextResponse.json({ error: 'Elder not found' }, { status: 404 });
    }

    const elderData = elderDoc.data() as Elder;
    const elder: Elder = {
      ...elderData,
      id: elderDoc.id,
    };

    // Get all caregivers in the agency with completed onboarding
    const caregiverIds = agencyData.caregiverIds || [];

    if (caregiverIds.length === 0) {
      return NextResponse.json({
        matches: [],
        message: 'No caregivers in agency. Invite caregivers first.',
      });
    }

    // Fetch caregiver profiles
    const profilePromises = caregiverIds.map(async (caregiverId: string) => {
      const profileDoc = await adminDb.collection('caregiver_profiles').doc(caregiverId).get();
      if (!profileDoc.exists) return null;

      const profileData = profileDoc.data()!;
      if (!profileData.onboardingCompleted) return null;

      return profileData as CaregiverProfile;
    });

    const profiles = (await Promise.all(profilePromises)).filter(Boolean) as CaregiverProfile[];

    if (profiles.length === 0) {
      return NextResponse.json({
        matches: [],
        message: 'No caregivers have completed onboarding yet.',
      });
    }

    // Get current elder assignments for each caregiver
    const assignmentPromises = profiles.map(async (profile) => {
      const assignmentsSnapshot = await adminDb
        .collection('caregiver_assignments')
        .where('agencyId', '==', agencyId)
        .where('caregiverId', '==', profile.userId)
        .where('active', '==', true)
        .get();

      let elderCount = 0;
      assignmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        elderCount += (data.elderIds || []).length;
      });

      return {
        profile,
        currentElderCount: elderCount,
      };
    });

    const caregiversWithCounts = await Promise.all(assignmentPromises);

    // Calculate matches
    const matches = getElderCaregiverMatches({
      elder,
      caregivers: caregiversWithCounts,
    });

    // Format response
    const formattedMatches = matches.map(match => ({
      caregiverId: match.caregiverId,
      caregiverName: match.caregiverName,
      matchScore: match.matchScore,
      matchLabel: formatMatchScore(match.matchScore),
      matchBreakdown: match.matchBreakdown,
      matchReasons: match.matchReasons,
      warnings: match.warnings,
      currentElderCount: match.elderCount,
      canAssign: match.canAssign,
      profile: {
        languages: match.caregiverProfile.languages,
        yearsExperience: match.caregiverProfile.yearsExperience,
        certifications: match.caregiverProfile.certifications,
        specializations: match.caregiverProfile.specializations,
        zipCode: match.caregiverProfile.zipCode,
      },
    }));

    return NextResponse.json({
      matches: formattedMatches,
      elder: {
        id: elder.id,
        name: elder.name,
        knownConditions: elder.knownConditions,
        languages: elder.languages,
        mobilityLevel: elder.mobilityLevel,
      },
    });
  } catch (error) {
    console.error('Error getting caregiver matches:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get matches' },
      { status: 500 }
    );
  }
}
