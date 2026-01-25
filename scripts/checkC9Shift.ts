/**
 * Check LO-C9-1 shift for CAS-3A testing
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

async function main() {
  if (getApps().length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'scripts/serviceAccountKey.json');
    initializeApp({ credential: cert(serviceAccountPath) });
  }

  const db = getFirestore();
  const agencyId = 'K9AYIGQR2RCInk7nVMSd';

  // Find LO-C9-1 shift on Jan 26
  const shiftsSnap = await db.collection('scheduledShifts')
    .where('agencyId', '==', agencyId)
    .where('elderName', '==', 'LO-C9-1')
    .get();

  const jan26Shifts = shiftsSnap.docs.filter(doc => {
    const d = doc.data();
    return d.date?.toDate?.().toISOString().includes('2026-01-26');
  });

  if (jan26Shifts.length === 0) {
    console.log('No LO-C9-1 shift found on Jan 26');
    return;
  }

  const doc = jan26Shifts[0];
  const data = doc.data();

  console.log('=== Shift Details ===');
  console.log('Shift ID:', doc.id);
  console.log('Elder:', data.elderName);
  console.log('Date:', data.date?.toDate?.().toISOString());
  console.log('Time:', data.startTime, '-', data.endTime);
  console.log('Status:', data.status);
  console.log('Caregiver:', data.caregiverName, '(' + data.caregiverId + ')');

  const candidates = data.cascadeState?.rankedCandidates || [];
  console.log('\n=== rankedCandidates (' + candidates.length + ') ===');
  candidates.slice(0, 3).forEach((c: any, i: number) => {
    console.log((i+1) + '. ' + c.caregiverName + ' (score: ' + c.score + ')');
  });

  console.log('\n=== First Caregiver (for login) ===');
  const first = candidates[0];
  if (first) {
    console.log('Name:', first.caregiverName);
    console.log('ID:', first.caregiverId);

    // Get email
    const userDoc = await db.collection('users').doc(first.caregiverId).get();
    if (userDoc.exists) {
      console.log('Email:', userDoc.data()?.email);
    }
  }
}

main().catch(console.error);
