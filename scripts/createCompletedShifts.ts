/**
 * Creates completed shifts for testing CAS-2B history bonus
 * Creates 5 completed shifts for Caregiver 2 with LO-C2-1
 * And 2 completed shifts for Caregiver 3 with LO-C2-1
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
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

  // Get elder LO-C2-1
  const eldersSnap = await db.collection('elders')
    .where('name', '==', 'LO-C2-1')
    .limit(1)
    .get();

  if (eldersSnap.empty) {
    console.log('Elder LO-C2-1 not found');
    return;
  }

  const elderDoc = eldersSnap.docs[0];
  const elderData = elderDoc.data();
  console.log('Found elder: ' + elderData.name + ' (' + elderDoc.id + ')');

  // Get Caregiver 2 ID
  const c2Snap = await db.collection('users')
    .where('email', '==', 'ramanac+c2@gmail.com')
    .limit(1)
    .get();

  const c3Snap = await db.collection('users')
    .where('email', '==', 'ramanac+c3@gmail.com')
    .limit(1)
    .get();

  if (c2Snap.empty || c3Snap.empty) {
    console.log('Caregivers not found');
    return;
  }

  const c2Id = c2Snap.docs[0].id;
  const c3Id = c3Snap.docs[0].id;
  console.log('Caregiver 2 ID: ' + c2Id);
  console.log('Caregiver 3 ID: ' + c3Id);

  // Create 5 completed shifts for Caregiver 2 with LO-C2-1 (past dates)
  const baseDates = [
    new Date('2026-01-10'),
    new Date('2026-01-11'),
    new Date('2026-01-12'),
    new Date('2026-01-13'),
    new Date('2026-01-14'),
  ];

  console.log('\nCreating 5 completed shifts for Caregiver 2 with LO-C2-1...');
  for (let i = 0; i < 5; i++) {
    const shiftData = {
      agencyId,
      groupId: elderData.groupId,
      elderId: elderDoc.id,
      elderName: elderData.name,
      caregiverId: c2Id,
      caregiverName: 'Caregiver 2',
      date: Timestamp.fromDate(baseDates[i]),
      startTime: '09:00',
      endTime: '17:00',
      duration: 480,
      status: 'completed',
      isRecurring: false,
      createdBy: 'test-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const ref = await db.collection('scheduledShifts').add(shiftData);
    console.log('  Created shift ' + (i+1) + ': ' + ref.id);
  }

  // Create 2 completed shifts for Caregiver 3 with LO-C2-1 (past dates)
  const laterDates = [
    new Date('2026-01-15'),
    new Date('2026-01-16'),
  ];

  console.log('\nCreating 2 completed shifts for Caregiver 3 with LO-C2-1...');
  for (let i = 0; i < 2; i++) {
    const shiftData = {
      agencyId,
      groupId: elderData.groupId,
      elderId: elderDoc.id,
      elderName: elderData.name,
      caregiverId: c3Id,
      caregiverName: 'Caregiver 3',
      date: Timestamp.fromDate(laterDates[i]),
      startTime: '09:00',
      endTime: '17:00',
      duration: 480,
      status: 'completed',
      isRecurring: false,
      createdBy: 'test-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const ref = await db.collection('scheduledShifts').add(shiftData);
    console.log('  Created shift ' + (i+1) + ': ' + ref.id);
  }

  console.log('\nDone! Created test data:');
  console.log('- Caregiver 2: 5 completed shifts with LO-C2-1 (+5 history bonus)');
  console.log('- Caregiver 3: 2 completed shifts with LO-C2-1 (+2 history bonus)');
}

main().catch(console.error);
