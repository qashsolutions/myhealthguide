/**
 * Fix storage limits for all test accounts
 *
 * Storage limits by plan:
 * - Family Plan A (family): 25 MB = 26,214,400 bytes
 * - Family Plan B (single_agency): 50 MB = 52,428,800 bytes
 * - Multi Agency (multi_agency): 500 MB = 524,288,000 bytes
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage limits in bytes
const STORAGE_LIMITS = {
  family: 26214400,        // 25 MB
  single_agency: 52428800, // 50 MB
  multi_agency: 524288000, // 500 MB
};

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
  console.log('Fixing storage limits for all users...\n');

  // Get all users
  const usersSnap = await db.collection('users').get();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const email = userData.email || 'unknown';
    const subscriptionTier = userData.subscriptionTier as string | null;
    const currentLimit = userData.storageLimit || 0;

    // Determine correct storage limit
    let correctLimit: number;
    if (subscriptionTier === 'family') {
      correctLimit = STORAGE_LIMITS.family;
    } else if (subscriptionTier === 'single_agency') {
      correctLimit = STORAGE_LIMITS.single_agency;
    } else if (subscriptionTier === 'multi_agency') {
      correctLimit = STORAGE_LIMITS.multi_agency;
    } else {
      // Default to family limit for users without a tier
      correctLimit = STORAGE_LIMITS.family;
    }

    // Check if update is needed
    if (currentLimit === correctLimit) {
      console.log(`⏭️  ${email}: Already correct (${formatBytes(correctLimit)})`);
      skipped++;
      continue;
    }

    try {
      await db.collection('users').doc(userDoc.id).update({
        storageLimit: correctLimit,
      });
      console.log(`✅ ${email}: ${formatBytes(currentLimit)} → ${formatBytes(correctLimit)} (tier: ${subscriptionTier || 'none'})`);
      updated++;
    } catch (error: any) {
      console.error(`❌ ${email}: Failed to update - ${error.message}`);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${usersSnap.size}`);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

main().catch(console.error);
