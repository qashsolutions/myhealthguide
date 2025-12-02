/**
 * Firestore Admin SDK Helpers for API Routes
 *
 * Provides server-side Firestore access that bypasses security rules.
 * Only use in API routes after verifying authentication.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Convert Firestore Timestamp to Date
 */
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}

/**
 * Get medications for an elder
 */
export async function getMedicationsServer(groupId: string, elderId: string) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('medications')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startDate: toDate(doc.data().startDate),
  }));
}

/**
 * Get medication logs for an elder within a date range
 */
export async function getMedicationLogsServer(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('medication_logs')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .where('scheduledTime', '>=', Timestamp.fromDate(startDate))
    .where('scheduledTime', '<=', Timestamp.fromDate(endDate))
    .orderBy('scheduledTime', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    scheduledTime: toDate(doc.data().scheduledTime),
    takenAt: doc.data().takenAt ? toDate(doc.data().takenAt) : null,
  }));
}

/**
 * Get diet entries for an elder within a date range
 */
export async function getDietEntriesServer(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date,
  limitCount: number = 20
) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('diet_entries')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .where('timestamp', '>=', Timestamp.fromDate(startDate))
    .where('timestamp', '<=', Timestamp.fromDate(endDate))
    .orderBy('timestamp', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: toDate(doc.data().timestamp),
  }));
}

/**
 * Get supplement logs for an elder within a date range
 */
export async function getSupplementLogsServer(
  groupId: string,
  elderId: string,
  startDate: Date,
  endDate: Date
) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('supplement_logs')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .where('scheduledTime', '>=', Timestamp.fromDate(startDate))
    .where('scheduledTime', '<=', Timestamp.fromDate(endDate))
    .orderBy('scheduledTime', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    scheduledTime: toDate(doc.data().scheduledTime),
    takenAt: doc.data().takenAt ? toDate(doc.data().takenAt) : null,
  }));
}

/**
 * Get supplements for an elder
 */
export async function getSupplementsServer(groupId: string, elderId: string) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('supplements')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startDate: toDate(doc.data().startDate),
  }));
}

/**
 * Get elder health insights
 */
export async function getElderHealthInsightsServer(
  elderId: string,
  groupId: string,
  includeDismissed: boolean = false,
  limitCount: number = 20
) {
  const adminDb = getAdminDb();
  let query = adminDb
    .collection('elderHealthInsights')
    .where('elderId', '==', elderId)
    .where('groupId', '==', groupId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  const snapshot = await query.get();

  let insights = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    periodStart: toDate(doc.data().periodStart),
    periodEnd: toDate(doc.data().periodEnd),
    dismissedAt: doc.data().dismissedAt ? toDate(doc.data().dismissedAt) : null,
  }));

  if (!includeDismissed) {
    insights = insights.filter((i) => !i.dismissedAt);
  }

  return insights;
}

/**
 * Get elder health conditions
 */
export async function getElderHealthConditionsServer(elderId: string, groupId: string) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('elderHealthConditions')
    .where('elderId', '==', elderId)
    .where('groupId', '==', groupId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    diagnosisDate: doc.data().diagnosisDate ? toDate(doc.data().diagnosisDate) : null,
    createdAt: toDate(doc.data().createdAt),
    updatedAt: doc.data().updatedAt ? toDate(doc.data().updatedAt) : null,
  }));
}

/**
 * Get elder allergies
 */
export async function getElderAllergiesServer(elderId: string, groupId: string) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('elderAllergies')
    .where('elderId', '==', elderId)
    .where('groupId', '==', groupId)
    .orderBy('severity', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    discoveredDate: doc.data().discoveredDate ? toDate(doc.data().discoveredDate) : null,
    createdAt: toDate(doc.data().createdAt),
  }));
}

/**
 * Get elder symptoms within a date range
 */
export async function getElderSymptomsServer(
  elderId: string,
  groupId: string,
  startDate?: Date,
  endDate?: Date,
  limitCount?: number
) {
  const adminDb = getAdminDb();
  let query = adminDb
    .collection('elderSymptoms')
    .where('elderId', '==', elderId)
    .where('groupId', '==', groupId)
    .orderBy('observedAt', 'desc');

  if (limitCount) {
    query = query.limit(limitCount);
  }

  const snapshot = await query.get();

  let symptoms = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    observedAt: toDate(doc.data().observedAt),
    loggedAt: toDate(doc.data().loggedAt),
  }));

  // Filter by date range in memory
  if (startDate) {
    symptoms = symptoms.filter((s: any) => s.observedAt >= startDate);
  }
  if (endDate) {
    symptoms = symptoms.filter((s: any) => s.observedAt <= endDate);
  }

  return symptoms;
}

/**
 * Get document analysis
 */
export async function getDocumentAnalysisServer(documentId: string) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('documentAnalyses')
    .where('documentId', '==', documentId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: doc.data().updatedAt ? toDate(doc.data().updatedAt) : null,
  };
}

/**
 * Get weekly summaries for an elder
 */
export async function getWeeklySummariesServer(
  groupId: string,
  elderId: string,
  limitCount: number = 4
) {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection('weeklySummaries')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    weekStart: toDate(doc.data().weekStart),
    weekEnd: toDate(doc.data().weekEnd),
  }));
}
