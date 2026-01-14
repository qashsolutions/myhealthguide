export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

interface UpdateProfileRequest {
  caregiverId: string;
  agencyId: string;
  adminUserId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: UpdateProfileRequest = await req.json();
    const { caregiverId, agencyId, adminUserId, name, email, phone } = body;

    // Validate required fields
    if (!caregiverId || !agencyId || !adminUserId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: caregiverId, agencyId, adminUserId, name' },
        { status: 400 }
      );
    }

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format if provided (10 digits)
    if (phone && !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Phone must be exactly 10 digits' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify the admin user is the super admin of the agency
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    const agencyData = agencyDoc.data()!;
    if (agencyData.superAdminId !== adminUserId) {
      return NextResponse.json(
        { error: 'Only the agency super admin can edit caregiver profiles' },
        { status: 403 }
      );
    }

    // Get the caregiver's user document to verify they belong to this agency
    const userRef = adminDb.collection('users').doc(caregiverId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Caregiver user not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const agencies = userData.agencies || [];

    // Verify caregiver is in this agency
    const agencyMembership = agencies.find((a: any) => a.agencyId === agencyId);
    if (!agencyMembership) {
      return NextResponse.json(
        { error: 'Caregiver is not associated with this agency' },
        { status: 400 }
      );
    }

    // Parse name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    // Start batch write
    const batch = adminDb.batch();

    // Update user document
    const userUpdate: Record<string, any> = {
      firstName,
      lastName,
      displayName: name.trim(),
      updatedAt: Timestamp.now(),
    };

    // Only update email if provided and different
    if (email !== undefined) {
      userUpdate.email = email || null;
    }

    // Only update phone if provided and different
    if (phone !== undefined) {
      userUpdate.phoneNumber = phone ? `+1${phone}` : null;
    }

    batch.update(userRef, userUpdate);

    // Update caregiver profile if it exists
    const profileRef = adminDb.collection('caregiver_profiles').doc(caregiverId);
    const profileDoc = await profileRef.get();

    if (profileDoc.exists) {
      const profileUpdate: Record<string, any> = {
        fullName: name.trim(),
        updatedAt: Timestamp.now(),
      };

      if (email !== undefined) {
        profileUpdate.email = email || null;
      }

      if (phone !== undefined) {
        profileUpdate.phoneNumber = phone ? `+1${phone}` : null;
      }

      batch.update(profileRef, profileUpdate);
    }

    // Commit all changes atomically
    await batch.commit();

    console.log(`Caregiver ${caregiverId} profile updated by ${adminUserId}`);

    // Create audit log
    await adminDb.collection('security_audit_logs').add({
      agencyId,
      action: 'caregiver_profile_updated',
      targetUserId: caregiverId,
      performedBy: adminUserId,
      changes: {
        name: name.trim(),
        email: email || null,
        phone: phone || null
      },
      metadata: {
        agencyName: agencyData.name
      },
      createdAt: Timestamp.now(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      caregiverId,
      message: 'Caregiver profile updated successfully.',
    });
  } catch (error) {
    console.error('Error updating caregiver profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update caregiver profile' },
      { status: 500 }
    );
  }
}
