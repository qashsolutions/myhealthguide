/**
 * Debug the date handling to understand why conflict check isn't working
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

  // Caregiver 5's existing shift date
  console.log('=== Caregiver 5 Existing Shift ===');
  const c5ShiftDate = new Date('2026-01-25T06:00:00.000Z');
  console.log('C5 shift date stored:', c5ShiftDate.toISOString());

  // Simulate what frontend sends (date-only string)
  console.log('\n=== New Shift Creation ===');
  const frontendDate = '2026-01-25'; // This is what frontend sends
  console.log('Frontend sends:', frontendDate);

  // API parses it
  const shiftDate = new Date(frontendDate);
  console.log('new Date(frontendDate):', shiftDate.toISOString());

  // Old code (uses local time setHours)
  console.log('\n=== OLD CODE (local time) ===');
  const dayStartOld = new Date(shiftDate);
  dayStartOld.setHours(0, 0, 0, 0);
  const dayEndOld = new Date(shiftDate);
  dayEndOld.setHours(23, 59, 59, 999);
  console.log('dayStart (local setHours):', dayStartOld.toISOString());
  console.log('dayEnd (local setHours):', dayEndOld.toISOString());
  console.log('C5 shift in range?', c5ShiftDate >= dayStartOld && c5ShiftDate <= dayEndOld);

  // New code (uses UTC)
  console.log('\n=== NEW CODE (UTC) ===');
  const dayStartNew = new Date(Date.UTC(shiftDate.getUTCFullYear(), shiftDate.getUTCMonth(), shiftDate.getUTCDate(), 0, 0, 0, 0));
  const dayEndNew = new Date(Date.UTC(shiftDate.getUTCFullYear(), shiftDate.getUTCMonth(), shiftDate.getUTCDate(), 23, 59, 59, 999));
  console.log('dayStart (UTC):', dayStartNew.toISOString());
  console.log('dayEnd (UTC):', dayEndNew.toISOString());
  console.log('C5 shift in range?', c5ShiftDate >= dayStartNew && c5ShiftDate <= dayEndNew);

  // Test actual Firestore query with new UTC logic
  console.log('\n=== Testing Firestore Query with UTC dates ===');
  const c5Id = 'qYAZkGkmpVVzjnPIiHrdxyvaFcR2';

  try {
    const shiftsSnap = await db.collection('scheduledShifts')
      .where('caregiverId', '==', c5Id)
      .where('date', '>=', Timestamp.fromDate(dayStartNew))
      .where('date', '<=', Timestamp.fromDate(dayEndNew))
      .get();

    console.log('Query found', shiftsSnap.size, 'shifts');
    shiftsSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log('  -', data.elderName, data.startTime, '-', data.endTime, 'status:', data.status);
    });

    if (shiftsSnap.size > 0) {
      console.log('\n✅ With UTC dates, query correctly finds C5 shifts!');
    } else {
      console.log('\n❌ Still no shifts found - issue is elsewhere');
    }
  } catch (err: any) {
    console.error('Query error:', err.message);
  }
}

main().catch(console.error);
