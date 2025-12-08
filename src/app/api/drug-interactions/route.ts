/**
 * Drug Interactions API
 *
 * Uses Admin SDK to check for drug interactions
 * Fetches FDA data and caches it server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/api/verifyAuth';
import { fetchFDADrugLabel, isFDADataStale, checkForMentionInFDAData, type FDADrugLabelData } from '@/lib/medical/fdaApi';
import type { Medication } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ success: false, error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const elderId = searchParams.get('elderId');

    if (!groupId || !elderId) {
      return NextResponse.json({ success: false, error: 'groupId and elderId are required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify user has access to this group
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    const groupData = groupDoc.data();
    const isAdmin = groupData?.adminId === authResult.userId;
    const isMember = groupData?.memberIds?.includes(authResult.userId);

    if (!isAdmin && !isMember) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get all active medications for this elder
    const medicationsSnap = await db.collection('medications')
      .where('groupId', '==', groupId)
      .where('elderId', '==', elderId)
      .get();

    const medications = medicationsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Medication[];

    // Filter out ended medications
    const activeMedications = medications.filter(med => {
      if (!med.endDate) return true;
      return new Date(med.endDate) >= new Date();
    });

    if (activeMedications.length < 2) {
      return NextResponse.json({ success: true, interactions: [] });
    }

    // Fetch FDA data for all medications
    const fdaDataMap = new Map<string, FDADrugLabelData | null>();

    for (const med of activeMedications) {
      const fdaData = await getFDADataForMedicationAdmin(db, med.id, med.name, authResult.userId, groupId, elderId);
      fdaDataMap.set(med.id, fdaData);
    }

    // Check all pairs for mentions
    const potentialInteractions: Array<{
      medication1: Medication;
      medication2: Medication;
      medication1MentionsMed2: boolean;
      medication2MentionsMed1: boolean;
      fdaData1: FDADrugLabelData | null;
      fdaData2: FDADrugLabelData | null;
    }> = [];

    for (let i = 0; i < activeMedications.length; i++) {
      for (let j = i + 1; j < activeMedications.length; j++) {
        const med1 = activeMedications[i];
        const med2 = activeMedications[j];

        const fdaData1 = fdaDataMap.get(med1.id);
        const fdaData2 = fdaDataMap.get(med2.id);

        // Check if either medication's FDA data mentions the other
        const med1MentionsMed2 = fdaData1 ? checkForMentionInFDAData(fdaData1, med2.name) : false;
        const med2MentionsMed1 = fdaData2 ? checkForMentionInFDAData(fdaData2, med1.name) : false;

        // Flag if either mentions the other
        if (med1MentionsMed2 || med2MentionsMed1) {
          potentialInteractions.push({
            medication1: med1,
            medication2: med2,
            medication1MentionsMed2: med1MentionsMed2,
            medication2MentionsMed1: med2MentionsMed1,
            fdaData1: fdaData1 || null,
            fdaData2: fdaData2 || null
          });
        }
      }
    }

    return NextResponse.json({ success: true, interactions: potentialInteractions });

  } catch (error) {
    console.error('Error in drug interactions API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get FDA data for a medication using Admin SDK
 */
async function getFDADataForMedicationAdmin(
  db: FirebaseFirestore.Firestore,
  medicationId: string,
  medicationName: string,
  userId: string,
  groupId: string,
  elderId: string
): Promise<FDADrugLabelData | null> {
  try {
    // Check if we have cached FDA data
    const fdaDocRef = db.collection('fdaDrugLabels').doc(medicationId);
    const fdaDoc = await fdaDocRef.get();

    if (fdaDoc.exists) {
      const data = fdaDoc.data();
      const cachedData = {
        ...data,
        fetchedAt: data?.fetchedAt?.toDate(),
        lastVerified: data?.lastVerified?.toDate()
      } as FDADrugLabelData;

      // Check if cache is still valid
      if (!isFDADataStale(cachedData.lastVerified)) {
        console.log(`✅ Using cached FDA data for ${medicationName}`);
        return cachedData;
      }

      console.log(`⚠️ Cached FDA data is stale for ${medicationName}, re-fetching...`);
    }

    // Fetch fresh FDA data
    console.log(`🔍 Fetching FDA data for ${medicationName}...`);
    const fdaData = await fetchFDADrugLabel(medicationName, userId, 'admin', groupId, elderId);

    if (!fdaData) {
      console.warn(`❌ No FDA data found for ${medicationName}`);
      return null;
    }

    // Cache the FDA data using Admin SDK
    await fdaDocRef.set({
      ...fdaData,
      medicationId,
      medicationName,
      fetchedAt: fdaData.fetchedAt,
      lastVerified: fdaData.lastVerified
    });

    console.log(`✅ Cached FDA data for ${medicationName}`);
    return fdaData;

  } catch (error) {
    console.error('Error getting FDA data:', error);
    return null;
  }
}
