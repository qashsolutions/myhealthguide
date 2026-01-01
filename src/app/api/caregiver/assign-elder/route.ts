export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

interface AssignElderRequest {
  agencyId: string;
  caregiverId: string;
  elderIds: string[];
  groupId: string;
  assignedBy: string;
  role?: 'caregiver_admin' | 'caregiver';
  assignAsPrimary?: boolean;
  forceTransfer?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: AssignElderRequest = await req.json();
    const {
      agencyId,
      caregiverId,
      elderIds,
      groupId,
      assignedBy,
      role = 'caregiver',
      assignAsPrimary = false,
      forceTransfer = false
    } = body;

    // Validate required fields
    if (!agencyId || !caregiverId || !elderIds || !groupId || !assignedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId, caregiverId, elderIds, groupId, assignedBy' },
        { status: 400 }
      );
    }

    if (!Array.isArray(elderIds) || elderIds.length === 0) {
      return NextResponse.json(
        { error: 'elderIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Verify the requesting user is the super admin of the agency
    const agencyDoc = await adminDb.collection('agencies').doc(agencyId).get();
    if (!agencyDoc.exists) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    const agencyData = agencyDoc.data()!;
    if (agencyData.superAdminId !== assignedBy) {
      return NextResponse.json(
        { error: 'Only the agency super admin can assign caregivers to elders' },
        { status: 403 }
      );
    }

    // Get caregiver user document to get their name
    const caregiverUserDoc = await adminDb.collection('users').doc(caregiverId).get();
    let caregiverName = 'Unknown';
    if (caregiverUserDoc.exists) {
      const userData = caregiverUserDoc.data()!;
      caregiverName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown';
    }

    // Get caregiver profile for additional info
    const profileDoc = await adminDb.collection('caregiver_profiles').doc(caregiverId).get();
    if (profileDoc.exists) {
      const profileData = profileDoc.data()!;
      if (profileData.fullName) {
        caregiverName = profileData.fullName;
      }
    }

    // Check existing assignments for this caregiver in this agency
    const existingAssignmentsSnapshot = await adminDb
      .collection('caregiver_assignments')
      .where('caregiverId', '==', caregiverId)
      .where('agencyId', '==', agencyId)
      .where('active', '==', true)
      .get();

    let currentElderCount = 0;
    existingAssignmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      currentElderCount += (data.elderIds || []).length;
    });

    const newTotalElders = currentElderCount + elderIds.length;
    const maxEldersPerCaregiver = agencyData.maxEldersPerCaregiver || 3;

    if (newTotalElders > maxEldersPerCaregiver) {
      return NextResponse.json(
        {
          error: `Cannot assign ${elderIds.length} more elders. Caregiver already has ${currentElderCount} elders. Limit is ${maxEldersPerCaregiver}.`
        },
        { status: 400 }
      );
    }

    // Check for primary caregiver conflicts if assigning as primary
    if (assignAsPrimary && !forceTransfer) {
      const conflicts: { elderId: string; elderName: string; currentPrimary: string }[] = [];

      for (const elderId of elderIds) {
        const elderDoc = await adminDb.collection('elders').doc(elderId).get();
        if (elderDoc.exists) {
          const elderData = elderDoc.data()!;
          if (elderData.primaryCaregiverId && elderData.primaryCaregiverId !== caregiverId) {
            conflicts.push({
              elderId,
              elderName: elderData.name || 'Unknown',
              currentPrimary: elderData.primaryCaregiverName || 'Unknown'
            });
          }
        }
      }

      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Some elders already have a primary caregiver',
            conflicts
          },
          { status: 409 }
        );
      }
    }

    // Start batch write for atomic operations
    const batch = adminDb.batch();

    // Check if there's an existing assignment document to update
    let assignmentRef;
    let existingAssignmentDoc = existingAssignmentsSnapshot.docs[0];

    if (existingAssignmentDoc) {
      // Update existing assignment - add elders to the list
      assignmentRef = existingAssignmentDoc.ref;
      const existingElderIds = existingAssignmentDoc.data().elderIds || [];
      const mergedElderIds = [...new Set([...existingElderIds, ...elderIds])];

      batch.update(assignmentRef, {
        elderIds: mergedElderIds,
        role: assignAsPrimary ? 'caregiver_admin' : role,
        updatedAt: Timestamp.now(),
        updatedBy: assignedBy
      });
    } else {
      // Create new assignment
      assignmentRef = adminDb.collection('caregiver_assignments').doc();

      const assignmentData = {
        agencyId,
        caregiverId,
        elderIds,
        groupId,
        role: assignAsPrimary ? 'caregiver_admin' : role,
        assignedAt: Timestamp.now(),
        assignedBy,
        permissions: {
          canEditMedications: role === 'caregiver_admin' || assignAsPrimary,
          canLogDoses: true,
          canViewReports: true,
          canManageSchedules: role === 'caregiver_admin' || assignAsPrimary,
          canInviteMembers: role === 'caregiver_admin' || assignAsPrimary
        },
        active: true
      };

      batch.set(assignmentRef, assignmentData);
    }

    // Update agency's caregiver list if not already included
    if (!agencyData.caregiverIds?.includes(caregiverId)) {
      batch.update(adminDb.collection('agencies').doc(agencyId), {
        caregiverIds: FieldValue.arrayUnion(caregiverId),
        updatedAt: Timestamp.now()
      });
    }

    // Update caregiver's user document with agency membership
    if (caregiverUserDoc.exists) {
      const userData = caregiverUserDoc.data()!;
      const agencies = userData.agencies || [];
      const existingAgencyIndex = agencies.findIndex((a: any) => a.agencyId === agencyId);

      if (existingAgencyIndex === -1) {
        // Add new agency membership
        batch.update(adminDb.collection('users').doc(caregiverId), {
          agencies: FieldValue.arrayUnion({
            agencyId,
            role: assignAsPrimary ? 'caregiver_admin' : role,
            status: 'active',
            joinedAt: new Date().toISOString(),
            assignedElderIds: elderIds,
            assignedGroupIds: [groupId]
          }),
          updatedAt: Timestamp.now()
        });
      } else {
        // Update existing agency membership
        const updatedAgencies = [...agencies];
        updatedAgencies[existingAgencyIndex] = {
          ...updatedAgencies[existingAgencyIndex],
          assignedElderIds: [...new Set([
            ...(updatedAgencies[existingAgencyIndex].assignedElderIds || []),
            ...elderIds
          ])],
          assignedGroupIds: [...new Set([
            ...(updatedAgencies[existingAgencyIndex].assignedGroupIds || []),
            groupId
          ])]
        };

        batch.update(adminDb.collection('users').doc(caregiverId), {
          agencies: updatedAgencies,
          updatedAt: Timestamp.now()
        });
      }
    }

    // Set primary caregiver for elders if requested
    if (assignAsPrimary || forceTransfer) {
      for (const elderId of elderIds) {
        batch.update(adminDb.collection('elders').doc(elderId), {
          primaryCaregiverId: caregiverId,
          primaryCaregiverName: caregiverName,
          primaryCaregiverAssignedAt: Timestamp.now(),
          primaryCaregiverAssignedBy: assignedBy,
          updatedAt: Timestamp.now()
        });
      }
    }

    // Create elder_access subcollection docs under caregiver's user document
    // Path: users/{caregiverId}/elder_access/{elderId}
    // This allows Firestore rules to check access with exists() on deterministic paths
    for (const elderId of elderIds) {
      const accessDocRef = adminDb
        .collection('users')
        .doc(caregiverId)
        .collection('elder_access')
        .doc(elderId);
      batch.set(accessDocRef, {
        elderId,
        agencyId,
        groupId,
        active: true,
        assignedAt: Timestamp.now(),
        assignedBy
      }, { merge: true });
    }

    // Create group_access subcollection doc for canAccessGroup() rule check
    // Path: users/{caregiverId}/group_access/{groupId}
    const groupAccessDocRef = adminDb
      .collection('users')
      .doc(caregiverId)
      .collection('group_access')
      .doc(groupId);
    batch.set(groupAccessDocRef, {
      groupId,
      agencyId,
      active: true,
      assignedAt: Timestamp.now(),
      assignedBy
    }, { merge: true });

    // Commit all changes atomically
    await batch.commit();
    console.log(`Assigned ${elderIds.length} elders to caregiver ${caregiverId} in agency ${agencyId}`);

    // Send notification to caregiver about new assignment
    await adminDb.collection('user_notifications').add({
      userId: caregiverId,
      type: 'elder_assigned',
      title: 'New Elder Assigned',
      message: `You have been assigned ${elderIds.length} new elder${elderIds.length > 1 ? 's' : ''} to care for.`,
      priority: 'normal',
      actionUrl: '/dashboard',
      actionRequired: false,
      read: false,
      dismissed: false,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    });

    return NextResponse.json({
      success: true,
      assignmentId: assignmentRef.id,
      message: `Successfully assigned ${elderIds.length} elder${elderIds.length > 1 ? 's' : ''} to ${caregiverName}`
    });
  } catch (error) {
    console.error('Error assigning elder to caregiver:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign elder' },
      { status: 500 }
    );
  }
}
