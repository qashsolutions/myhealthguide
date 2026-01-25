/**
 * Check rankedCandidates for LO-C8-1 shift to verify Caregiver 5 is excluded
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

  console.log('Looking for LO-C8-1 shift on Jan 25...\n');

  const shiftsSnap = await db.collection('scheduledShifts')
    .where('agencyId', '==', agencyId)
    .where('elderName', '==', 'LO-C8-1')
    .get();

  const jan25Shifts = shiftsSnap.docs.filter(doc => {
    const data = doc.data();
    const dateStr = data.date?.toDate?.().toISOString() || '';
    return dateStr.includes('2026-01-25');
  });

  if (jan25Shifts.length === 0) {
    console.log('No LO-C8-1 shift found on Jan 25');
    return;
  }

  const shiftDoc = jan25Shifts[0];
  const data = shiftDoc.data();

  console.log('Found shift:', shiftDoc.id);
  console.log('  elderName:', data.elderName);
  console.log('  caregiverName:', data.caregiverName);
  console.log('  status:', data.status);

  const candidates = data.cascadeState?.rankedCandidates || [];
  console.log('\nrankedCandidates (' + candidates.length + ' total):');

  const c5Id = 'qYAZkGkmpVVzjnPIiHrdxyvaFcR2';
  let c5Found = false;

  candidates.forEach((c: any, i: number) => {
    const isC5 = c.caregiverId === c5Id;
    if (isC5) c5Found = true;
    console.log('  ' + (i+1) + '. ' + c.caregiverName + ' (score: ' + c.score + ')' + (isC5 ? ' ⚠️ C5!' : ''));
  });

  console.log('\n--- CAS-2D.4 VERIFICATION ---');
  if (c5Found) {
    console.log('❌ FAIL: Caregiver 5 IS in rankedCandidates');
  } else {
    console.log('✅ PASS: Caregiver 5 NOT in rankedCandidates (correctly excluded)');
  }

  // Also check if C5 has a conflict
  console.log('\n--- Checking C5 conflict ---');
  const c5ShiftsSnap = await db.collection('scheduledShifts')
    .where('caregiverId', '==', c5Id)
    .get();

  const c5Jan25 = c5ShiftsSnap.docs.filter(doc => {
    const d = doc.data();
    return d.date?.toDate?.().toISOString().includes('2026-01-25') &&
           ['scheduled', 'confirmed', 'offered', 'in_progress'].includes(d.status);
  });

  if (c5Jan25.length > 0) {
    console.log('C5 has', c5Jan25.length, 'active shift(s) on Jan 25:');
    c5Jan25.forEach(doc => {
      const d = doc.data();
      console.log('  -', d.elderName, d.startTime + '-' + d.endTime, 'status:', d.status);
    });
  } else {
    console.log('C5 has NO active shifts on Jan 25');
  }
}

main().catch(console.error);
