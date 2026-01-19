/**
 * Set a test account's subscription status to 'expired' for testing
 * Usage: npx tsx scripts/setTrialExpired.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test account to set as expired
const TEST_EMAIL = 'ramanac+b2@gmail.com'; // Using b2 as it's a member account we can safely modify

async function main() {
  // Initialize Firebase Admin
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

  // Find user by email
  const usersSnap = await db.collection('users').where('email', '==', TEST_EMAIL).get();
  if (usersSnap.empty) {
    console.error(`User not found: ${TEST_EMAIL}`);
    process.exit(1);
  }

  const userDoc = usersSnap.docs[0];
  const userId = userDoc.id;
  const originalData = userDoc.data();

  console.log('=== Setting Trial to Expired ===\n');
  console.log(`User: ${TEST_EMAIL}`);
  console.log(`User ID: ${userId}`);
  console.log(`Original Status: ${originalData.subscriptionStatus}`);
  console.log(`Original Tier: ${originalData.subscriptionTier}`);

  // Set to expired with grace period
  const now = new Date();
  const gracePeriodEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
  const trialEndDate = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'expired',
    trialEndDate: Timestamp.fromDate(trialEndDate),
    gracePeriodEndDate: Timestamp.fromDate(gracePeriodEnd),
    updatedAt: Timestamp.now(),
  });

  console.log('\n✅ Account set to EXPIRED status');
  console.log(`Trial End Date: ${trialEndDate.toISOString()}`);
  console.log(`Grace Period End: ${gracePeriodEnd.toISOString()}`);
  console.log('\nYou can now test expired trial behavior.');
  console.log('\nTo restore after testing, run: npx tsx scripts/restoreTrialStatus.ts');
}

main().catch(console.error);
