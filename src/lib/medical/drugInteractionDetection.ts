/**
 * Drug Interaction Detection Service
 *
 * CRITICAL RULES:
 * 1. Fetch FDA data and store VERBATIM
 * 2. Check if medications mention each other in FDA data
 * 3. Flag potential interactions - DO NOT interpret
 * 4. NEVER recommend changes
 * 5. ALL interactions require consent to view
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { fetchFDADrugLabel, isFDADataStale, checkForMentionInFDAData, type FDADrugLabelData } from './fdaApi';
import type { Medication } from '@/types';

/**
 * Fetch and cache FDA data for a medication
 * Checks cache first, fetches from FDA if stale/missing
 */
export async function getFDADataForMedication(
  medicationId: string,
  medicationName: string
): Promise<FDADrugLabelData | null> {
  try {
    // Check if we have cached FDA data
    const fdaDocRef = doc(db, 'fdaDrugLabels', medicationId);
    const fdaDoc = await getDoc(fdaDocRef);

    if (fdaDoc.exists()) {
      const cachedData = {
        ...fdaDoc.data(),
        fetchedAt: fdaDoc.data().fetchedAt?.toDate(),
        lastVerified: fdaDoc.data().lastVerified?.toDate()
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
    const fdaData = await fetchFDADrugLabel(medicationName);

    if (!fdaData) {
      console.warn(`❌ No FDA data found for ${medicationName}`);
      return null;
    }

    // Cache the FDA data
    await setDoc(fdaDocRef, {
      ...fdaData,
      medicationId,
      medicationName,
      fetchedAt: Timestamp.fromDate(fdaData.fetchedAt),
      lastVerified: Timestamp.fromDate(fdaData.lastVerified)
    });

    console.log(`✅ Cached FDA data for ${medicationName}`);
    return fdaData;

  } catch (error) {
    console.error('Error getting FDA data:', error);
    return null;
  }
}

/**
 * Check for potential interactions between current medications
 * Returns medications that mention each other in FDA data
 * DOES NOT interpret what the interaction means
 */
export async function checkMedicationInteractions(
  groupId: string,
  elderId: string
): Promise<Array<{
  medication1: Medication;
  medication2: Medication;
  medication1MentionsMed2: boolean;
  medication2MentionsMed1: boolean;
  fdaData1: FDADrugLabelData | null;
  fdaData2: FDADrugLabelData | null;
}>> {
  try {
    // Get all active medications for this elder
    const medicationsQuery = query(
      collection(db, 'medications'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId)
    );

    const medicationsSnap = await getDocs(medicationsQuery);
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
      return []; // Need at least 2 medications to check interactions
    }

    // Fetch FDA data for all medications
    const fdaDataMap = new Map<string, FDADrugLabelData | null>();

    for (const med of activeMedications) {
      const fdaData = await getFDADataForMedication(med.id, med.name);
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
            fdaData1,
            fdaData2
          });
        }
      }
    }

    return potentialInteractions;

  } catch (error) {
    console.error('Error checking medication interactions:', error);
    return [];
  }
}

/**
 * Save detected interaction to database (for tracking/alerts)
 * Stores VERBATIM FDA data - no interpretation
 */
export async function savePotentialInteraction(
  groupId: string,
  elderId: string,
  medication1Id: string,
  medication1Name: string,
  medication2Id: string,
  medication2Name: string,
  fdaData1: FDADrugLabelData | null,
  fdaData2: FDADrugLabelData | null
): Promise<string> {
  try {
    const interactionRecord = {
      groupId,
      elderId,
      medication1Id,
      medication1Name,
      medication2Id,
      medication2Name,

      // Store which FDA data mentions which
      medication1HasFDAData: !!fdaData1,
      medication2HasFDAData: !!fdaData2,
      medication1MentionsMed2: fdaData1 ? checkForMentionInFDAData(fdaData1, medication2Name) : false,
      medication2MentionsMed1: fdaData2 ? checkForMentionInFDAData(fdaData2, medication1Name) : false,

      // Link to full FDA data (stored separately)
      fdaData1Reference: fdaData1 ? `fdaDrugLabels/${medication1Id}` : null,
      fdaData2Reference: fdaData2 ? `fdaDrugLabels/${medication2Id}` : null,

      // Metadata
      detectedAt: new Date(),
      lastChecked: new Date(),
      status: 'active' as const
    };

    const interactionRef = await addDoc(collection(db, 'drugInteractions'), interactionRecord);

    return interactionRef.id;

  } catch (error) {
    console.error('Error saving potential interaction:', error);
    throw error;
  }
}

/**
 * Get all potential interactions for an elder
 */
export async function getPotentialInteractions(
  groupId: string,
  elderId: string
): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'drugInteractions'),
      where('groupId', '==', groupId),
      where('elderId', '==', elderId),
      where('status', '==', 'active')
    );

    const interactionsSnap = await getDocs(q);

    return interactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      detectedAt: doc.data().detectedAt?.toDate(),
      lastChecked: doc.data().lastChecked?.toDate()
    }));

  } catch (error) {
    console.error('Error getting potential interactions:', error);
    return [];
  }
}

/**
 * Run interaction check and save any found
 * Called when: medication added, medication list changes, periodic check
 */
export async function runInteractionCheck(
  groupId: string,
  elderId: string
): Promise<{ count: number; interactions: any[] }> {
  try {
    const interactions = await checkMedicationInteractions(groupId, elderId);

    // Save each detected interaction
    for (const interaction of interactions) {
      await savePotentialInteraction(
        groupId,
        elderId,
        interaction.medication1.id,
        interaction.medication1.name,
        interaction.medication2.id,
        interaction.medication2.name,
        interaction.fdaData1,
        interaction.fdaData2
      );
    }

    return {
      count: interactions.length,
      interactions
    };

  } catch (error) {
    console.error('Error running interaction check:', error);
    return { count: 0, interactions: [] };
  }
}
