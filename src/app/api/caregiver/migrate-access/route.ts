export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Migration endpoint to create caregiver_elder_access documents for existing assignments
 * This should be called once by a super admin to backfill access documents
 *
 * POST /api/caregiver/migrate-access
 * Body: { agencyId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agencyId } = body;

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing required field: agencyId' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Get all active assignments for this agency
    const assignmentsSnapshot = await adminDb
      .collection('caregiver_assignments')
      .where('agencyId', '==', agencyId)
      .where('active', '==', true)
      .get();

    if (assignmentsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No active assignments found for this agency',
        migratedCount: 0
      });
    }

    const batch = adminDb.batch();
    let migratedCount = 0;
    const createdDocuments: string[] = [];

    const processedGroups = new Set<string>();

    for (const assignmentDoc of assignmentsSnapshot.docs) {
      const assignment = assignmentDoc.data();
      const caregiverId = assignment.caregiverId;
      const elderIds = assignment.elderIds || [];
      const groupId = assignment.groupId;

      // Create elder_access documents
      for (const elderId of elderIds) {
        // Use subcollection: users/{caregiverId}/elder_access/{elderId}
        const accessDocRef = adminDb
          .collection('users')
          .doc(caregiverId)
          .collection('elder_access')
          .doc(elderId);

        // Check if document already exists
        const existingDoc = await accessDocRef.get();
        if (!existingDoc.exists) {
          batch.set(accessDocRef, {
            elderId,
            agencyId,
            groupId,
            active: true,
            assignedAt: Timestamp.now(),
            assignedBy: 'migration',
            migratedFromAssignment: assignmentDoc.id
          });
          migratedCount++;
          createdDocuments.push(`users/${caregiverId}/elder_access/${elderId}`);
        }
      }

      // Create group_access document (once per caregiver-group combination)
      const groupKey = `${caregiverId}_${groupId}`;
      if (!processedGroups.has(groupKey)) {
        processedGroups.add(groupKey);

        const groupAccessDocRef = adminDb
          .collection('users')
          .doc(caregiverId)
          .collection('group_access')
          .doc(groupId);

        const existingGroupDoc = await groupAccessDocRef.get();
        if (!existingGroupDoc.exists) {
          batch.set(groupAccessDocRef, {
            groupId,
            agencyId,
            active: true,
            assignedAt: Timestamp.now(),
            assignedBy: 'migration',
            migratedFromAssignment: assignmentDoc.id
          });
          migratedCount++;
          createdDocuments.push(`users/${caregiverId}/group_access/${groupId}`);
        }
      }
    }

    if (migratedCount > 0) {
      await batch.commit();
    }

    console.log(`[migrate-access] Created ${migratedCount} caregiver_elder_access documents for agency ${agencyId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} caregiver-elder access records`,
      migratedCount,
      createdDocuments
    });
  } catch (error) {
    console.error('Error migrating caregiver access:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
