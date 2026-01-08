/**
 * Create Test Shift Script
 * Creates a scheduled shift for testing clock-in flow
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/createTestShift.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
function initFirebase() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return {
      db: getFirestore(existingApps[0]),
      auth: getAuth(existingApps[0])
    };
  }

  // Try scripts/serviceAccountKey.json
  const credPath = path.join(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(credPath)) {
    throw new Error('serviceAccountKey.json not found in scripts folder');
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const app = initializeApp({
    credential: cert(credentials),
    projectId: credentials.project_id,
  });

  return {
    db: getFirestore(app),
    auth: getAuth(app)
  };
}

async function createTestShift() {
  console.log('Creating test shift for clock-in testing...\n');

  const { db, auth } = initFirebase();

  // Get caregiver user by email
  const caregiverEmail = 'ramanac+c1@gmail.com';
  const caregiverUser = await auth.getUserByEmail(caregiverEmail);
  const caregiverId = caregiverUser.uid;
  console.log(`Caregiver: ${caregiverEmail} (${caregiverId})`);

  // Get caregiver's user document to find agencyId and groupId
  const userDoc = await db.collection('users').doc(caregiverId).get();
  const userData = userDoc.data();

  if (!userData?.agencies || userData.agencies.length === 0) {
    throw new Error('Caregiver has no agency membership');
  }

  const agencyInfo = userData.agencies[0];
  const agencyId = agencyInfo.agencyId;
  const groupId = agencyInfo.assignedGroupIds?.[0];
  const elderIds = agencyInfo.assignedElderIds || [];

  console.log(`Agency ID: ${agencyId}`);
  console.log(`Group ID: ${groupId}`);
  console.log(`Assigned Elder IDs: ${elderIds.join(', ')}`);

  if (elderIds.length === 0) {
    throw new Error('Caregiver has no assigned elders');
  }

  // Get the first elder's info
  const elderId = elderIds[0];
  const elderDoc = await db.collection('elders').doc(elderId).get();
  const elderData = elderDoc.data();
  const elderName = elderData?.name || 'Unknown Elder';

  console.log(`Elder: ${elderName} (${elderId})`);

  // Create shift for today, starting now (within clock-in window)
  const now = new Date();
  const startHour = now.getHours();
  const startMinute = Math.floor(now.getMinutes() / 15) * 15; // Round to 15 min
  const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

  // End time 4 hours later
  const endHour = (startHour + 4) % 24;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

  // Create date for today at midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const shiftData = {
    agencyId,
    groupId,
    elderId,
    elderName,
    caregiverId,
    caregiverName: 'Caregiver 1',
    date: Timestamp.fromDate(today),
    startTime,
    endTime,
    duration: 240, // 4 hours in minutes
    status: 'scheduled',
    isRecurring: false,
    notes: 'Test shift for clock-in flow testing',
    createdBy: caregiverId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  // Check if a similar shift already exists
  const existingShifts = await db.collection('scheduledShifts')
    .where('caregiverId', '==', caregiverId)
    .where('elderId', '==', elderId)
    .where('date', '==', Timestamp.fromDate(today))
    .where('status', '==', 'scheduled')
    .get();

  if (!existingShifts.empty) {
    console.log('\n⚠️  A scheduled shift already exists for today. Deleting old shifts...');
    for (const doc of existingShifts.docs) {
      await db.collection('scheduledShifts').doc(doc.id).delete();
      console.log(`   Deleted shift: ${doc.id}`);
    }
  }

  // Create the new shift
  const shiftRef = await db.collection('scheduledShifts').add(shiftData);

  console.log('\n✅ Test shift created successfully!');
  console.log('=====================================');
  console.log(`Shift ID: ${shiftRef.id}`);
  console.log(`Date: ${today.toDateString()}`);
  console.log(`Time: ${startTime} - ${endTime}`);
  console.log(`Elder: ${elderName}`);
  console.log(`Caregiver: Caregiver 1 (${caregiverEmail})`);
  console.log('=====================================');
  console.log('\nYou can now test the clock-in flow at:');
  console.log('https://www.myguide.health/dashboard/shift-handoff');
}

createTestShift().catch(console.error);
