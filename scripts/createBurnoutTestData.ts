/**
 * Creates shift session test data for caregiver burnout analysis
 *
 * Creates data for 4 caregivers with different burnout risk profiles:
 * - C1: Critical risk (14 consecutive days, 12-hour shifts, 5 elders)
 * - C2: High risk (10 consecutive days, 10-hour shifts, 4 elders)
 * - C3: Moderate risk (7 days with breaks, 9-hour shifts, 3 elders)
 * - C4: Low risk (5 days with breaks, 8-hour shifts, 2 elders)
 *
 * Run: npx tsx scripts/createBurnoutTestData.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';

const AGENCY_ID = 'K9AYIGQR2RCInk7nVMSd';

interface CaregiverProfile {
  email: string;
  name: string;
  shiftLengthMinutes: number;
  elderCount: number;
  daysPattern: number[]; // Days ago to create shifts (0 = today, 1 = yesterday, etc.)
}

const caregiverProfiles: CaregiverProfile[] = [
  {
    email: 'ramanac+c1@gmail.com',
    name: 'Caregiver 1',
    shiftLengthMinutes: 720, // 12 hours
    elderCount: 5,
    // 14 consecutive days (0-13 days ago)
    daysPattern: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    email: 'ramanac+c2@gmail.com',
    name: 'Caregiver 2',
    shiftLengthMinutes: 600, // 10 hours
    elderCount: 4,
    // 10 consecutive days (0-9 days ago)
    daysPattern: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    email: 'ramanac+c3@gmail.com',
    name: 'Caregiver 3',
    shiftLengthMinutes: 540, // 9 hours
    elderCount: 3,
    // 7 days with breaks (worked days 0-2, off day 3, worked days 4-7, off days 8-9, worked days 10-11)
    daysPattern: [0, 1, 2, 4, 5, 6, 7],
  },
  {
    email: 'ramanac+c4@gmail.com',
    name: 'Caregiver 4',
    shiftLengthMinutes: 480, // 8 hours
    elderCount: 2,
    // 5 days spread out with breaks
    daysPattern: [0, 2, 5, 8, 11],
  },
];

async function main() {
  console.log('=== Caregiver Burnout Test Data Script ===\n');

  // Initialize Firebase Admin
  if (getApps().length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'scripts/serviceAccountKey.json');
    initializeApp({
      credential: cert(serviceAccountPath)
    });
  }

  const db = getFirestore();

  // Get agency's groupIds
  console.log('Fetching agency data...');
  const agencyDoc = await db.collection('agencies').doc(AGENCY_ID).get();
  if (!agencyDoc.exists) {
    console.error('Agency not found');
    return;
  }
  const agencyData = agencyDoc.data()!;
  const groupIds = agencyData.groupIds || [];
  console.log(`Agency has ${groupIds.length} group IDs`);

  // Get elders from those groups
  console.log('Fetching elders from agency groups...');
  const eldersSnap = await db.collection('elders')
    .where('groupId', 'in', groupIds.slice(0, 10)) // Firestore 'in' limit is 10
    .limit(10)
    .get();

  if (eldersSnap.empty) {
    console.error('No elders found in agency groups');
    return;
  }

  const elders = eldersSnap.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    groupId: doc.data().groupId,
  }));
  console.log(`Found ${elders.length} elders: ${elders.map(e => e.name).join(', ')}\n`);

  // Process each caregiver
  for (const profile of caregiverProfiles) {
    console.log(`\n--- Processing ${profile.name} (${profile.email}) ---`);

    // Get caregiver user ID
    const userSnap = await db.collection('users')
      .where('email', '==', profile.email)
      .limit(1)
      .get();

    if (userSnap.empty) {
      console.log(`  Caregiver not found: ${profile.email}`);
      continue;
    }

    const caregiverId = userSnap.docs[0].id;
    console.log(`  User ID: ${caregiverId}`);

    // Delete existing shift sessions for this caregiver (cleanup)
    const existingShifts = await db.collection('shiftSessions')
      .where('agencyId', '==', AGENCY_ID)
      .where('caregiverId', '==', caregiverId)
      .get();

    if (!existingShifts.empty) {
      console.log(`  Deleting ${existingShifts.size} existing shift sessions...`);
      const batch = db.batch();
      existingShifts.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    // Create new shift sessions based on profile
    console.log(`  Creating ${profile.daysPattern.length} shift sessions...`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Select elders for this caregiver (cycle through available elders)
    const assignedElders = elders.slice(0, Math.min(profile.elderCount, elders.length));

    for (let i = 0; i < profile.daysPattern.length; i++) {
      const daysAgo = profile.daysPattern[i];
      const shiftDate = new Date(today);
      shiftDate.setDate(shiftDate.getDate() - daysAgo);

      // Assign to different elder each day (cycle through)
      const elder = assignedElders[i % assignedElders.length];

      // Create start time (9 AM) and end time based on shift length
      const startTime = new Date(shiftDate);
      startTime.setHours(9, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + profile.shiftLengthMinutes);

      const shiftData = {
        agencyId: AGENCY_ID,
        caregiverId: caregiverId,
        caregiverName: profile.name,
        elderId: elder.id,
        elderName: elder.name,
        groupId: elder.groupId,
        status: 'completed',
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        actualDuration: profile.shiftLengthMinutes,
        createdAt: Timestamp.fromDate(startTime),
        updatedAt: Timestamp.fromDate(endTime),
      };

      await db.collection('shiftSessions').add(shiftData);
    }

    // Calculate expected metrics
    const totalHours = (profile.shiftLengthMinutes / 60) * profile.daysPattern.length;
    const regularHoursPerDay = 8;
    const regularHours = regularHoursPerDay * profile.daysPattern.length;
    const overtimeHours = Math.max(0, totalHours - regularHours);

    console.log(`  Created ${profile.daysPattern.length} shifts`);
    console.log(`  Total hours: ${totalHours}`);
    console.log(`  Overtime hours: ${overtimeHours}`);
    console.log(`  Elders: ${profile.elderCount}`);
    console.log(`  Avg shift length: ${profile.shiftLengthMinutes / 60} hours`);
  }

  console.log('\n=== Test Data Creation Complete ===\n');
  console.log('Expected Results:');
  console.log('  C1: Critical (14 days, 12h shifts, 5 elders) → ~90 points');
  console.log('  C2: High (10 days, 10h shifts, 4 elders) → ~55 points');
  console.log('  C3: Moderate (7 days w/ breaks, 9h shifts, 3 elders) → ~35 points');
  console.log('  C4: Low (5 days spread, 8h shifts, 2 elders) → 0 points');
  console.log('\nVerify at: myguide.health → Care Management → Caregiver Burnout');
}

main().catch(console.error);
