/**
 * ONE-TIME MIGRATION: Fix caregiver_profiles with empty fullName
 *
 * Usage: GET /api/admin/migrate-caregiver-names?adminId=YOUR_USER_ID
 *
 * DELETE THIS FILE after successful migration to avoid code bloat.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ error: 'adminId required' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Verify admin user exists
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'Invalid adminId' }, { status: 403 });
    }

    // Get all caregiver profiles
    const profilesSnapshot = await adminDb.collection('caregiver_profiles').get();

    const updates: { id: string; oldName: string; newName: string }[] = [];
    const batch = adminDb.batch();

    for (const profileDoc of profilesSnapshot.docs) {
      const profile = profileDoc.data();

      // Skip if fullName already set
      if (profile.fullName && profile.fullName.trim() !== '') {
        continue;
      }

      // Get user data
      const userDoc = await adminDb.collection('users').doc(profile.userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data()!;
      const newName = userData.firstName && userData.lastName
        ? `${userData.firstName} ${userData.lastName}`.trim()
        : userData.firstName || userData.email || 'Unknown';

      if (newName && newName !== 'Unknown') {
        batch.update(profileDoc.ref, {
          fullName: newName,
          email: userData.email || profile.email || '',
          phoneNumber: userData.phoneNumber || profile.phoneNumber || '',
        });
        updates.push({
          id: profileDoc.id,
          oldName: profile.fullName || '(empty)',
          newName
        });
      }
    }

    if (updates.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} caregiver profile(s)`,
      updates,
      note: 'DELETE this endpoint file after migration: src/app/api/admin/migrate-caregiver-names/route.ts'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
