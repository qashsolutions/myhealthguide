/**
 * Check rankedCandidates for LO-C7-1 shift on Jan 25 to verify Caregiver 5 is excluded
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

  // Find LO-C7-1 shift on Jan 25
  console.log('Looking for LO-C7-1 shift on Jan 25...\n');

  const shiftsSnap = await db.collection('scheduledShifts')
    .where('agencyId', '==', agencyId)
    .where('elderName', '==', 'LO-C7-1')
    .get();

  const jan25Shifts = shiftsSnap.docs.filter(doc => {
    const data = doc.data();
    const dateStr = data.date?.toDate?.().toISOString() || '';
    return dateStr.includes('2026-01-25');
  });

  if (jan25Shifts.length === 0) {
    console.log('No LO-C7-1 shift found on Jan 25');
    return;
  }

  const shiftDoc = jan25Shifts[0];
  const data = shiftDoc.data();

  console.log('Found shift:', shiftDoc.id);
  console.log('  elderName:', data.elderName);
  console.log('  caregiverName:', data.caregiverName);
  console.log('  status:', data.status);
  console.log('  assignmentMode:', data.assignmentMode);

  const candidates = data.cascadeState?.rankedCandidates || [];
  console.log('\nrankedCandidates (' + candidates.length + ' total):');

  // Caregiver 5 ID
  const c5Id = 'qYAZkGkmpVVzjnPIiHrdxyvaFcR2';
  let c5Found = false;

  candidates.forEach((c: any, i: number) => {
    const isC5 = c.caregiverId === c5Id;
    if (isC5) c5Found = true;
    console.log('  ' + (i+1) + '. ' + c.caregiverName + ' (score: ' + c.score + ')' + (isC5 ? ' ⚠️ CAREGIVER 5!' : ''));
  });

  console.log('\n--- VERIFICATION ---');
  if (c5Found) {
    console.log('❌ FAIL: Caregiver 5 IS in rankedCandidates (conflict check not working)');
  } else {
    console.log('✅ PASS: Caregiver 5 is NOT in rankedCandidates (correctly excluded due to conflict)');
  }
}

main().catch(console.error);
