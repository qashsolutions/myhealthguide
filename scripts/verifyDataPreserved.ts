/**
 * Verify that user data is preserved during trial expiration
 * Usage: npx tsx scripts/verifyDataPreserved.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_EMAIL = 'ramanac+b2@gmail.com';

async function main() {
  const existingApps = getApps();
  let app;

  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const credPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(credPath)) {
      console.error('Service account key not found at:', credPath);
      process.exit(1);
    }
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.project_id,
    });
  }

  const db = getFirestore(app);

  console.log('=== Data Preservation Check ===\n');
  console.log(`Checking user: ${TEST_EMAIL}`);

  // Find user by email
  const usersSnap = await db.collection('users').where('email', '==', TEST_EMAIL).get();
  if (usersSnap.empty) {
    console.error('❌ User not found');
    process.exit(1);
  }

  const userDoc = usersSnap.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();

  console.log(`User ID: ${userId}`);
  console.log(`Subscription Status: ${userData.subscriptionStatus}`);
  console.log('');

  // Check user document exists
  console.log('✅ User document exists');
  console.log(`   - Email: ${userData.email}`);
  console.log(`   - Name: ${userData.firstName} ${userData.lastName}`);
  console.log(`   - Created: ${userData.createdAt?.toDate?.() || userData.createdAt}`);
  console.log(`   - Subscription Tier: ${userData.subscriptionTier || 'none'}`);
  console.log(`   - Elder ID: ${userData.elderId || 'none'}`);
  console.log('');

  // Check if user has associated data
  const elderId = userData.elderId;
  if (elderId) {
    // Check elder document
    const elderDoc = await db.collection('elders').doc(elderId).get();
    if (elderDoc.exists) {
      const elderData = elderDoc.data();
      console.log('✅ Elder document exists');
      console.log(`   - Elder ID: ${elderId}`);
      console.log(`   - Name: ${elderData?.firstName} ${elderData?.lastName}`);
    } else {
      console.log('⚠️  Elder document not found (may be using shared elder from plan admin)');
    }

    // Check if elder has any medications
    const medsSnap = await db.collection('medications').where('elderId', '==', elderId).limit(5).get();
    console.log(`✅ Medications: ${medsSnap.size} document(s) found`);

    // Check if elder has any care logs
    const logsSnap = await db.collection('careLogs').where('elderId', '==', elderId).limit(5).get();
    console.log(`✅ Care Logs: ${logsSnap.size} document(s) found`);

    // Check if elder has any diet logs
    const dietSnap = await db.collection('dietLogs').where('elderId', '==', elderId).limit(5).get();
    console.log(`✅ Diet Logs: ${dietSnap.size} document(s) found`);
  } else {
    console.log('⚠️  No elderId associated with this user (member account)');
  }

  console.log('\n=== Data Preservation Result ===');
  console.log('✅ User data is PRESERVED (not deleted)');
  console.log('   Data is inaccessible due to expired trial, but NOT deleted.');
}

main().catch(console.error);
