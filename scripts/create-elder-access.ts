/**
 * One-time script to create elder_access document for existing assignment
 * Run with: npx ts-node scripts/create-elder-access.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

async function createElderAccess() {
  // Data from the existing assignment
  const caregiverId = 'NVh5w1PLW2fHbvxtbK6EhTS4xzC3';
  const elderId = 'BlHTFFwfAIHBcDsDhWWv';
  const agencyId = 'wP7okNVtVKlciShgvCAy';
  const groupId = 'OoxVLXoj3vDQNAgMVpvZ';

  const accessDocRef = db
    .collection('users')
    .doc(caregiverId)
    .collection('elder_access')
    .doc(elderId);

  try {
    await accessDocRef.set({
      elderId,
      agencyId,
      groupId,
      active: true,
      assignedAt: admin.firestore.Timestamp.now(),
      assignedBy: 'manual-migration',
    });

    console.log(`✅ Created elder_access document:`);
    console.log(`   Path: users/${caregiverId}/elder_access/${elderId}`);
    console.log(`   Elder ID: ${elderId}`);
    console.log(`   Agency ID: ${agencyId}`);
    console.log(`   Group ID: ${groupId}`);
  } catch (error) {
    console.error('❌ Error creating document:', error);
  }

  process.exit(0);
}

createElderAccess();
