/**
 * Restore a test account's subscription status after testing
 * Usage: npx tsx scripts/restoreTrialStatus.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mirrored from src/lib/subscription/subscriptionService.ts (scripts can't use path aliases)
const TRIAL_DURATION_DAYS = 15;

// Test account to restore
const TEST_EMAIL = 'ramanac+b2@gmail.com';

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
  const currentData = userDoc.data();

  console.log('=== Restoring Trial Status ===\n');
  console.log(`User: ${TEST_EMAIL}`);
  console.log(`User ID: ${userId}`);
  console.log(`Current Status: ${currentData.subscriptionStatus}`);

  // Restore to trial with full trial duration remaining
  const now = new Date();
  const trialEndDate = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'trial',
    trialEndDate: Timestamp.fromDate(trialEndDate),
    gracePeriodEndDate: FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });

  console.log('\n✅ Account restored to TRIAL status');
  console.log(`New Trial End Date: ${trialEndDate.toISOString()}`);
}

main().catch(console.error);
