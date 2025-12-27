export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Extract client IP address for security logging
function getClientIP(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, userId, phoneNumber } = body;

    // Get client IP for security audit
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

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

    // 1. Update invite status with security audit info
    batch.update(inviteDoc.ref, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      acceptedByUserId: userId,
      acceptedFromIP: clientIP,
      acceptedUserAgent: userAgent,
      updatedAt: Timestamp.now(),
    });

    // Create security audit log entry
    const auditRef = adminDb.collection('security_audit_logs').doc();
    batch.set(auditRef, {
      type: 'caregiver_invite_accepted',
      inviteId: inviteDoc.id,
      agencyId,
      userId,
      phoneNumber: inviteData.phoneNumber,
      clientIP,
      userAgent,
      timestamp: Timestamp.now(),
    });

    // 2. Add user to agency's caregiverIds
    batch.update(adminDb.collection('agencies').doc(agencyId), {
      caregiverIds: FieldValue.arrayUnion(userId),
      updatedAt: Timestamp.now(),
    });

    // 3. Add or update agency membership in user's document
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const currentAgencies = userData.agencies || [];

      // Check if already a member (including rejected status)
      const existingMembershipIndex = currentAgencies.findIndex((a: any) => a.agencyId === agencyId);

      if (existingMembershipIndex === -1) {
        // New member - add agency membership
        batch.update(userRef, {
          agencies: FieldValue.arrayUnion({
            agencyId,
            role: 'caregiver',
            status: 'pending_approval', // Requires admin approval before accessing elder data
            joinedAt: new Date(),
            assignedElderIds: [],
            assignedGroupIds: [],
          }),
          // Mark that caregiver needs to complete onboarding and set password
          caregiverOnboardingRequired: true,
          caregiverOnboardingAgencyId: agencyId,
          passwordSetupRequired: true, // Caregiver must set password on first login
          updatedAt: Timestamp.now(),
        });
      } else {
        // Existing member - check if they were rejected and need re-activation
        const existingMembership = currentAgencies[existingMembershipIndex];
        if (existingMembership.status === 'rejected') {
          // Re-invite scenario: update existing membership back to pending_approval
          const updatedAgencies = [...currentAgencies];
          updatedAgencies[existingMembershipIndex] = {
            ...existingMembership,
            status: 'pending_approval',
            role: 'caregiver',
            reInvitedAt: new Date(),
            assignedElderIds: [],
            assignedGroupIds: [],
          };
          batch.update(userRef, {
            agencies: updatedAgencies,
            caregiverOnboardingRequired: true,
            caregiverOnboardingAgencyId: agencyId,
            passwordSetupRequired: true, // Caregiver must set password on first login
            updatedAt: Timestamp.now(),
          });
        }
        // If status is 'active' or 'pending_approval', don't change anything
      }
    }

    // 4. Create or update caregiver profile
    const profileRef = adminDb.collection('caregiver_profiles').doc(userId);
    const existingProfile = await profileRef.get();

    if (existingProfile.exists) {
      const profileData = existingProfile.data()!;
      // If profile exists and was rejected, update status back to pending_approval
      if (profileData.status === 'rejected') {
        batch.update(profileRef, {
          status: 'pending_approval',
          reInvitedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      // If already pending_approval or active, don't change
    } else {
      // Create new profile
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
    }

    // Commit batch
    await batch.commit();

    // 5. Send FCM notification and dashboard alert to super admin
    const superAdminId = agencyData.superAdminId;
    if (superAdminId) {
      const userData = userDoc.exists ? userDoc.data() : null;
      const caregiverName = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.email || phoneNumber;

      // Queue FCM push notification
      await adminDb.collection('fcm_notification_queue').add({
        userId: superAdminId,
        title: '👤 New Caregiver Request',
        body: `${caregiverName} has requested to join ${agencyData.name}. Review and approve their access.`,
        data: {
          type: 'caregiver_approval_request',
          caregiverId: userId,
          agencyId,
          url: '/dashboard/agency'
        },
        webpush: {
          fcmOptions: {
            link: '/dashboard/agency'
          },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            requireInteraction: true,
            tag: `caregiver-approval-${userId}`
          }
        },
        status: 'pending',
        createdAt: Timestamp.now()
      });

      // Create dashboard alert
      await adminDb.collection('alerts').add({
        userId: superAdminId,
        groupId: agencyData.groupIds?.[0] || null,
        type: 'caregiver_approval_request',
        severity: 'warning',
        title: 'New Caregiver Awaiting Approval',
        message: `${caregiverName} has completed verification and is waiting for your approval to access the agency.`,
        data: {
          caregiverId: userId,
          caregiverName,
          agencyId,
          agencyName: agencyData.name
        },
        actionUrl: '/dashboard/agency',
        actionButtons: [
          { label: 'Review Now', action: 'view', url: '/dashboard/agency' },
          { label: 'Dismiss', action: 'dismiss' }
        ],
        status: 'active',
        read: false,
        dismissed: false,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      });

      // Also create in-app notification (bell icon)
      await adminDb.collection('user_notifications').add({
        userId: superAdminId,
        groupId: agencyData.groupIds?.[0] || null,
        elderId: null,
        type: 'caregiver_approval',
        title: 'New Caregiver Request',
        message: `${caregiverName} wants to join ${agencyData.name}. Review and approve their access.`,
        priority: 'high',
        actionUrl: '/dashboard/agency',
        sourceCollection: 'caregiver_profiles',
        sourceId: userId,
        read: false,
        dismissed: false,
        actionRequired: true,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        createdAt: Timestamp.now()
      });

      console.log(`Notification sent to super admin ${superAdminId} for caregiver approval`);
    }

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
