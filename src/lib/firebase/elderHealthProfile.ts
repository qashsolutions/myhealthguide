/**
 * Elder Health Profile Service
 *
 * Manages comprehensive health profile data for elders including:
 * - Health conditions
 * - Allergies
 * - Symptoms (logged by admin/primary caregiver only)
 * - Important notes
 * - Emergency contacts
 * - AI-generated health insights
 */

import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { cleanForFirestore } from '@/lib/utils/firestoreHelpers';
import type {
  Elder,
  ElderHealthCondition,
  ElderAllergy,
  ElderSymptom,
  ElderImportantNote,
  ElderEmergencyContact,
  ElderHealthInsight,
} from '@/types';

// ============= Elder Profile Updates =============

/**
 * Update elder's extended profile (demographics, physical attributes, care preferences)
 */
export async function updateElderProfile(
  elderId: string,
  updates: Partial<Elder>
): Promise<{ success: boolean; error?: string }> {
  try {
    const elderRef = doc(db, 'elders', elderId);
    // Clean undefined values before saving to Firestore
    const cleanedUpdates = cleanForFirestore({
      ...updates,
      updatedAt: new Date(),
    });
    await updateDoc(elderRef, cleanedUpdates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating elder profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get elder's full profile
 */
export async function getElderProfile(elderId: string): Promise<Elder | null> {
  try {
    const elderDoc = await getDoc(doc(db, 'elders', elderId));
    if (!elderDoc.exists()) return null;

    const data = elderDoc.data();
    return {
      id: elderDoc.id,
      ...data,
      dateOfBirth: data.dateOfBirth?.toDate?.() || data.dateOfBirth,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      primaryCaregiverAssignedAt: data.primaryCaregiverAssignedAt?.toDate?.() || data.primaryCaregiverAssignedAt,
    } as Elder;
  } catch (error) {
    console.error('Error getting elder profile:', error);
    return null;
  }
}

// ============= Health Conditions =============

/**
 * Add a health condition for an elder
 */
export async function addHealthCondition(
  condition: Omit<ElderHealthCondition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedCondition = cleanForFirestore({
      ...condition,
      diagnosisDate: condition.diagnosisDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const docRef = await addDoc(collection(db, 'elderHealthConditions'), cleanedCondition);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding health condition:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a health condition
 */
export async function updateHealthCondition(
  conditionId: string,
  updates: Partial<ElderHealthCondition>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedUpdates = cleanForFirestore({
      ...updates,
      updatedAt: new Date(),
    });
    await updateDoc(doc(db, 'elderHealthConditions', conditionId), cleanedUpdates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating health condition:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a health condition
 */
export async function deleteHealthCondition(
  conditionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'elderHealthConditions', conditionId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting health condition:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all health conditions for an elder
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 */
export async function getElderHealthConditions(
  elderId: string,
  groupId: string
): Promise<ElderHealthCondition[]> {
  try {
    const q = query(
      collection(db, 'elderHealthConditions'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        diagnosisDate: data.diagnosisDate?.toDate?.() || data.diagnosisDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as ElderHealthCondition;
    });
  } catch (error) {
    console.error('Error getting health conditions:', error);
    return [];
  }
}

// ============= Allergies =============

/**
 * Add an allergy for an elder
 */
export async function addAllergy(
  allergy: Omit<ElderAllergy, 'id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedAllergy = cleanForFirestore({
      ...allergy,
      discoveredDate: allergy.discoveredDate || null,
      createdAt: new Date(),
    });
    const docRef = await addDoc(collection(db, 'elderAllergies'), cleanedAllergy);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding allergy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an allergy
 */
export async function updateAllergy(
  allergyId: string,
  updates: Partial<ElderAllergy>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedUpdates = cleanForFirestore(updates);
    await updateDoc(doc(db, 'elderAllergies', allergyId), cleanedUpdates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating allergy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an allergy
 */
export async function deleteAllergy(
  allergyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'elderAllergies', allergyId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting allergy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all allergies for an elder
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 */
export async function getElderAllergies(
  elderId: string,
  groupId: string
): Promise<ElderAllergy[]> {
  try {
    const q = query(
      collection(db, 'elderAllergies'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('severity', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        discoveredDate: data.discoveredDate?.toDate?.() || data.discoveredDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      } as ElderAllergy;
    });
  } catch (error) {
    console.error('Error getting allergies:', error);
    return [];
  }
}

// ============= Symptoms (Admin/Primary Caregiver Only) =============

/**
 * Log a symptom for an elder
 * PERMISSION: Only admin or primary caregiver can log symptoms
 */
export async function logSymptom(
  symptom: Omit<ElderSymptom, 'id'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedSymptom = cleanForFirestore({
      ...symptom,
      loggedAt: symptom.loggedAt || new Date(),
    });
    const docRef = await addDoc(collection(db, 'elderSymptoms'), cleanedSymptom);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error logging symptom:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a symptom (alias for logSymptom with different signature)
 */
export async function addSymptom(
  symptom: Omit<ElderSymptom, 'id' | 'loggedAt'> & { observedAt?: Date }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedSymptom = cleanForFirestore({
      elderId: symptom.elderId,
      groupId: symptom.groupId,
      symptom: symptom.symptom,
      severity: symptom.severity,
      duration: symptom.duration,
      frequency: symptom.frequency,
      triggers: symptom.triggers,
      notes: symptom.notes,
      reportedBy: symptom.reportedBy,
      observedAt: symptom.observedAt || new Date(),
      loggedAt: new Date(),
    });
    const docRef = await addDoc(collection(db, 'elderSymptoms'), cleanedSymptom);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding symptom:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a symptom
 */
export async function updateSymptom(
  symptomId: string,
  updates: Partial<ElderSymptom>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedUpdates = cleanForFirestore(updates);
    await updateDoc(doc(db, 'elderSymptoms', symptomId), cleanedUpdates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating symptom:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a symptom log
 */
export async function deleteSymptom(
  symptomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'elderSymptoms', symptomId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting symptom:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get symptoms for an elder within a date range
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @param limitCount - Optional limit on number of results
 */
export async function getElderSymptoms(
  elderId: string,
  groupId: string,
  startDate?: Date,
  endDate?: Date,
  limitCount?: number
): Promise<ElderSymptom[]> {
  try {
    let q = query(
      collection(db, 'elderSymptoms'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('observedAt', 'desc')
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);

    let symptoms = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        observedAt: data.observedAt?.toDate?.() || data.observedAt,
        loggedAt: data.loggedAt?.toDate?.() || data.loggedAt,
      } as ElderSymptom;
    });

    // Filter by date range in memory (Firestore doesn't support multiple range queries)
    if (startDate) {
      symptoms = symptoms.filter(s => s.observedAt >= startDate);
    }
    if (endDate) {
      symptoms = symptoms.filter(s => s.observedAt <= endDate);
    }

    return symptoms;
  } catch (error) {
    console.error('Error getting symptoms:', error);
    return [];
  }
}

// Severity mapping for numeric calculations
const severityMap: Record<string, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  critical: 4,
};

/**
 * Get symptom summary for insights generation
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 * @param days - Number of days to look back (default 7)
 */
export async function getSymptomSummary(
  elderId: string,
  groupId: string,
  days: number = 7
): Promise<{ symptomName: string; count: number; avgSeverity: number; dates: Date[] }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const symptoms = await getElderSymptoms(elderId, groupId, startDate);

  // Group by symptom name
  const grouped = symptoms.reduce((acc, s) => {
    if (!acc[s.symptom]) {
      acc[s.symptom] = { count: 0, totalSeverity: 0, dates: [] };
    }
    acc[s.symptom].count++;
    acc[s.symptom].totalSeverity += severityMap[s.severity] || 2;
    acc[s.symptom].dates.push(s.observedAt);
    return acc;
  }, {} as Record<string, { count: number; totalSeverity: number; dates: Date[] }>);

  return Object.entries(grouped).map(([symptomName, data]) => ({
    symptomName,
    count: data.count,
    avgSeverity: Math.round((data.totalSeverity / data.count) * 10) / 10,
    dates: data.dates,
  }));
}

// ============= Important Notes =============

/**
 * Add an important note for an elder
 */
export async function addImportantNote(
  note: Omit<ElderImportantNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedNote = cleanForFirestore({
      ...note,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const docRef = await addDoc(collection(db, 'elderImportantNotes'), cleanedNote);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding important note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an important note
 */
export async function updateImportantNote(
  noteId: string,
  updates: Partial<ElderImportantNote>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedUpdates = cleanForFirestore({
      ...updates,
      updatedAt: new Date(),
    });
    await updateDoc(doc(db, 'elderImportantNotes', noteId), cleanedUpdates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating important note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an important note
 */
export async function deleteImportantNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'elderImportantNotes', noteId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting important note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all important notes for an elder
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 */
export async function getElderImportantNotes(
  elderId: string,
  groupId: string
): Promise<ElderImportantNote[]> {
  try {
    const q = query(
      collection(db, 'elderImportantNotes'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const notes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as ElderImportantNote;
    });

    // Sort pinned notes first, then by createdAt
    return notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  } catch (error) {
    console.error('Error getting important notes:', error);
    return [];
  }
}

// ============= Emergency Contacts =============

/**
 * Add an emergency contact for an elder
 */
export async function addEmergencyContact(
  contact: Omit<ElderEmergencyContact, 'id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // If this is primary, unset other primary contacts
    if (contact.isPrimary) {
      const existing = await getElderEmergencyContacts(contact.elderId, contact.groupId);
      for (const c of existing) {
        if (c.isPrimary && c.id) {
          await updateDoc(doc(db, 'elderEmergencyContacts', c.id), { isPrimary: false });
        }
      }
    }

    // Clean undefined values before saving to Firestore
    const cleanedContact = cleanForFirestore({
      ...contact,
      createdAt: new Date(),
    });
    const docRef = await addDoc(collection(db, 'elderEmergencyContacts'), cleanedContact);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding emergency contact:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an emergency contact
 */
export async function updateEmergencyContact(
  contactId: string,
  updates: Partial<ElderEmergencyContact>,
  elderId?: string,
  groupId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // If setting as primary, unset other primary contacts
    if (updates.isPrimary && elderId && groupId) {
      const existing = await getElderEmergencyContacts(elderId, groupId);
      for (const c of existing) {
        if (c.isPrimary && c.id && c.id !== contactId) {
          await updateDoc(doc(db, 'elderEmergencyContacts', c.id), { isPrimary: false });
        }
      }
    }

    // Clean undefined values before saving to Firestore
    const cleanedUpdates = cleanForFirestore(updates);
    await updateDoc(doc(db, 'elderEmergencyContacts', contactId), cleanedUpdates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating emergency contact:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an emergency contact
 */
export async function deleteEmergencyContact(
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'elderEmergencyContacts', contactId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting emergency contact:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all emergency contacts for an elder
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 */
export async function getElderEmergencyContacts(
  elderId: string,
  groupId: string
): Promise<ElderEmergencyContact[]> {
  try {
    const q = query(
      collection(db, 'elderEmergencyContacts'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('isPrimary', 'desc'),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      } as ElderEmergencyContact;
    });
  } catch (error) {
    console.error('Error getting emergency contacts:', error);
    return [];
  }
}

// ============= Health Insights =============

/**
 * Save a generated health insight
 */
export async function saveHealthInsight(
  insight: Omit<ElderHealthInsight, 'id' | 'dismissedAt' | 'dismissedBy'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Clean undefined values before saving to Firestore
    const cleanedInsight = cleanForFirestore(insight);
    const docRef = await addDoc(collection(db, 'elderHealthInsights'), cleanedInsight);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error saving health insight:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Dismiss a health insight
 */
export async function dismissHealthInsight(
  insightId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'elderHealthInsights', insightId), {
      dismissed: true,
      dismissedAt: new Date(),
      dismissedBy: userId,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error dismissing health insight:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get health insights for an elder
 * @param elderId - The elder's ID
 * @param groupId - The group ID (required for Firestore security rules)
 * @param includeDismissed - Whether to include dismissed insights
 * @param limitCount - Maximum number of insights to return
 */
export async function getElderHealthInsights(
  elderId: string,
  groupId: string,
  includeDismissed: boolean = false,
  limitCount: number = 20
): Promise<ElderHealthInsight[]> {
  try {
    let q = query(
      collection(db, 'elderHealthInsights'),
      where('elderId', '==', elderId),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    let insights = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        periodStart: data.periodStart?.toDate?.() || data.periodStart,
        periodEnd: data.periodEnd?.toDate?.() || data.periodEnd,
        dismissedAt: data.dismissedAt?.toDate?.() || data.dismissedAt,
      } as ElderHealthInsight;
    });

    if (!includeDismissed) {
      insights = insights.filter(i => !i.dismissedAt);
    }

    return insights;
  } catch (error) {
    console.error('Error getting health insights:', error);
    return [];
  }
}

/**
 * Check if user can log symptoms (admin or primary caregiver)
 */
export async function canLogSymptoms(
  userId: string,
  elderId: string,
  groupId: string
): Promise<boolean> {
  try {
    // Check if user is group admin
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      if (groupData.adminId === userId) {
        return true;
      }
    }

    // Check if user is primary caregiver for this elder
    const elderDoc = await getDoc(doc(db, 'elders', elderId));
    if (elderDoc.exists()) {
      const elderData = elderDoc.data();
      if (elderData.primaryCaregiverId === userId) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking symptom logging permission:', error);
    return false;
  }
}

/**
 * Check if user can access elder health profile
 * Allows: group admins, primary caregivers, elder creators, AND assigned caregivers
 */
export async function canAccessElderProfile(
  userId: string,
  elderId: string,
  groupId: string
): Promise<boolean> {
  try {
    console.log('[canAccessElderProfile] Checking access:', { userId, elderId, groupId });

    // Check if user is group admin
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    console.log('[canAccessElderProfile] Group doc exists:', groupDoc.exists());

    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      console.log('[canAccessElderProfile] Group adminId:', groupData.adminId, '| userId:', userId, '| match:', groupData.adminId === userId);

      // Check adminId field
      if (groupData.adminId === userId) {
        console.log('[canAccessElderProfile] Access granted via adminId');
        return true;
      }

      // Also check members array for admin role (in case adminId not set)
      if (groupData.members && Array.isArray(groupData.members)) {
        const userMember = groupData.members.find((m: any) => m.userId === userId);
        console.log('[canAccessElderProfile] User member found:', userMember);
        if (userMember && userMember.role === 'admin') {
          console.log('[canAccessElderProfile] Access granted via members array');
          return true;
        }
      }
    }

    // Check if user is primary caregiver for this elder
    const elderDoc = await getDoc(doc(db, 'elders', elderId));
    console.log('[canAccessElderProfile] Elder doc exists:', elderDoc.exists());

    if (elderDoc.exists()) {
      const elderData = elderDoc.data();
      if (elderData.primaryCaregiverId === userId) {
        console.log('[canAccessElderProfile] Access granted via primaryCaregiverId');
        return true;
      }

      // Check if user created this elder (createdBy field)
      if (elderData.createdBy === userId) {
        console.log('[canAccessElderProfile] Access granted via createdBy');
        return true;
      }
    }

    // Check if user is an assigned caregiver via elder_access subcollection
    // This document is created when admin assigns a caregiver to an elder
    try {
      const elderAccessDoc = await getDoc(doc(db, 'users', userId, 'elder_access', elderId));
      if (elderAccessDoc.exists() && elderAccessDoc.data()?.active) {
        console.log('[canAccessElderProfile] Access granted via elder_access subcollection');
        return true;
      }
    } catch (accessError) {
      // Subcollection might not exist for non-caregivers, that's fine
      console.log('[canAccessElderProfile] elder_access check failed (may not exist):', accessError);
    }

    console.log('[canAccessElderProfile] Access DENIED - no matching criteria');
    return false;
  } catch (error) {
    console.error('[canAccessElderProfile] Error:', error);
    return false;
  }
}
