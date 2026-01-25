/**
 * Tests the conflict check query to see if missing index is causing the bug
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

  // Caregiver 5 ID
  const caregiverId = 'qYAZkGkmpVVzjnPIiHrdxyvaFcR2';

  // Test date: Jan 25, 2026 - use UTC to match how dates are stored
  // Shifts are stored as 2026-01-25T06:00:00.000Z (midnight PST = 6am UTC)
  const dayStart = new Date('2026-01-25T00:00:00.000Z');
  const dayEnd = new Date('2026-01-25T23:59:59.999Z');

  console.log('Testing conflict check query for Caregiver 5 on Jan 25...');
  console.log('caregiverId:', caregiverId);
  console.log('dayStart:', dayStart.toISOString());
  console.log('dayEnd:', dayEnd.toISOString());

  try {
    // This is the same query used in checkConflictServer
    const shiftsSnap = await db.collection('scheduledShifts')
      .where('caregiverId', '==', caregiverId)
      .where('date', '>=', Timestamp.fromDate(dayStart))
      .where('date', '<=', Timestamp.fromDate(dayEnd))
      .get();

    console.log('\n✅ Query succeeded! Found', shiftsSnap.size, 'shifts');

    shiftsSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log('\nShift:', doc.id);
      console.log('  elderName:', data.elderName);
      console.log('  date:', data.date?.toDate?.().toISOString());
      console.log('  startTime:', data.startTime);
      console.log('  endTime:', data.endTime);
      console.log('  status:', data.status);
    });

    if (shiftsSnap.size > 0) {
      console.log('\n✅ Caregiver 5 HAS shifts on Jan 25 - conflict check should detect this');
    } else {
      console.log('\n⚠️ No shifts found - this could be the bug!');
    }

  } catch (err: any) {
    console.error('\n❌ Query FAILED:', err.message);
    if (err.message.includes('index')) {
      console.error('\n🐛 MISSING INDEX ERROR - This is the bug!');
      console.error('The checkConflictServer catch block returns false on errors,');
      console.error('which allows ALL caregivers through regardless of conflicts.');
    }
  }
}

main().catch(console.error);
