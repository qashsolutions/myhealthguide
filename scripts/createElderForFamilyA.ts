/**
 * Create Elder for Family Plan A Test User
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/createElderForFamilyA.ts
 */

import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

let app: App;
let db: Firestore;

function initFirebase() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const scriptsCredPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(scriptsCredPath)) {
      const credentials = JSON.parse(fs.readFileSync(scriptsCredPath, 'utf8'));
      app = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id,
      });
    } else {
      throw new Error('No Firebase credentials found');
    }
  }
  db = getFirestore(app);
}

async function createElder() {
  initFirebase();

  // Find Family A Admin
  const usersSnapshot = await db.collection('users')
    .where('email', '==', 'ramanac+a1@gmail.com')
    .get();

  if (usersSnapshot.empty) {
    console.error('❌ User not found');
    process.exit(1);
  }

  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;
  const groupId = userData.groups?.[0]?.groupId;

  if (!groupId) {
    console.error('❌ No group found for user');
    process.exit(1);
  }

  console.log(`User: ${userData.email}`);
  console.log(`Group: ${groupId}`);

  // Check if elder already exists
  const groupDoc = await db.collection('groups').doc(groupId).get();
  const groupData = groupDoc.data();

  if (groupData?.elderIds && groupData.elderIds.length > 0) {
    console.log('✅ Elder already exists:', groupData.elderIds[0]);
    process.exit(0);
  }

  // Create elder
  const elderRef = await db.collection('elders').add({
    name: 'Loved One A1',
    dateOfBirth: Timestamp.fromDate(new Date('1945-03-15')),
    gender: 'female',
    groupId,
    bloodType: 'A+',
    emergencyContact: {
      name: 'Family Admin A1',
      phone: '+1 555-0101',
      relationship: 'Child',
    },
    allergies: ['Penicillin', 'Sulfa drugs'],
    conditions: ['Hypertension', 'Type 2 Diabetes', 'Hypothyroidism'],
    notes: 'Test elder for Family Plan A testing. Good overall health, requires daily medication management.',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: userId,
  });

  console.log(`✅ Created elder: ${elderRef.id}`);

  // Update group with elder ID
  await db.collection('groups').doc(groupId).update({
    elderIds: [elderRef.id],
    updatedAt: Timestamp.now(),
  });

  console.log('✅ Updated group with elder ID');
  console.log('\n👉 Now run: npx ts-node --project tsconfig.scripts.json scripts/seedFamilyATestData.ts');
}

createElder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
