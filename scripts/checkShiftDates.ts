/**
 * Check actual shift dates stored in Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

async function main() {
  // Initialize Firebase Admin
  if (getApps().length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'scripts/serviceAccountKey.json');
    initializeApp({
      credential: cert(serviceAccountPath)
    });
  }

  const db = getFirestore();
  const agencyId = 'K9AYIGQR2RCInk7nVMSd';

  // Get all shifts on Jan 25
  console.log('Checking all shifts with date containing 2026-01-25...\n');

  const shiftsSnap = await db.collection('scheduledShifts')
    .where('agencyId', '==', agencyId)
    .get();

  const jan25Shifts = shiftsSnap.docs.filter(doc => {
    const data = doc.data();
    const dateStr = data.date?.toDate?.().toISOString() || '';
    return dateStr.includes('2026-01-25');
  });

  console.log('Found', jan25Shifts.length, 'shifts on Jan 25:\n');

  jan25Shifts.forEach(doc => {
    const data = doc.data();
    console.log('Shift ID:', doc.id);
    console.log('  elderName:', data.elderName);
    console.log('  caregiverId:', data.caregiverId);
    console.log('  caregiverName:', data.caregiverName);
    console.log('  date (raw):', data.date?.toDate?.().toISOString());
    console.log('  startTime:', data.startTime);
    console.log('  endTime:', data.endTime);
    console.log('  status:', data.status);
    console.log('');
  });

  // Also check C5's shift specifically
  const c5Id = 'qYAZkGkmpVVzjnPIiHrdxyvaFcR2';
  console.log('\n--- Caregiver 5 shifts (any date) ---\n');

  const c5Shifts = shiftsSnap.docs.filter(doc => doc.data().caregiverId === c5Id);
  c5Shifts.forEach(doc => {
    const data = doc.data();
    console.log('Shift ID:', doc.id);
    console.log('  elderName:', data.elderName);
    console.log('  date (raw):', data.date?.toDate?.().toISOString());
    console.log('  startTime:', data.startTime, '-', data.endTime);
    console.log('  status:', data.status);
    console.log('');
  });
}

main().catch(console.error);
