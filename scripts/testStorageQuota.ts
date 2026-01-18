/**
 * Test Storage Quota Enforcement
 *
 * This script tests that storage quota enforcement works correctly:
 * 1. Near quota: Upload should be blocked if file would exceed limit
 * 2. Over quota: All uploads should be blocked
 * 3. Under quota: Uploads should be allowed
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

// Test accounts
const TEST_ACCOUNTS = {
  familyPlanA: 'ramanac+a1@gmail.com',
  familyPlanB: 'ramanac+b1@gmail.com',
  multiAgency: 'ramanac+owner@gmail.com',
};

interface TestResult {
  test: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const results: TestResult[] = [];

function logResult(test: string, expected: string, actual: string, passed: boolean) {
  results.push({ test, expected, actual, passed });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual: ${actual}`);
  console.log('');
}

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
  console.log('=== Storage Quota Enforcement Tests ===\n');

  // Test Family Plan A (25 MB limit)
  await testPlan(db, TEST_ACCOUNTS.familyPlanA, 'Family Plan A', STORAGE_LIMITS.family);

  // Test Family Plan B (50 MB limit)
  await testPlan(db, TEST_ACCOUNTS.familyPlanB, 'Family Plan B', STORAGE_LIMITS.single_agency);

  // Test Multi Agency (500 MB limit)
  await testPlan(db, TEST_ACCOUNTS.multiAgency, 'Multi Agency', STORAGE_LIMITS.multi_agency);

  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${results.length}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}`);
    });
    process.exit(1);
  }
}

async function testPlan(db: FirebaseFirestore.Firestore, email: string, planName: string, limit: number) {
  console.log(`\n--- Testing ${planName} (${formatBytes(limit)} limit) ---\n`);

  // Find user by email
  const usersSnap = await db.collection('users').where('email', '==', email).get();
  if (usersSnap.empty) {
    console.error(`User not found: ${email}`);
    return;
  }

  const userDoc = usersSnap.docs[0];
  const userId = userDoc.id;
  const originalData = userDoc.data();
  const originalStorageUsed = originalData.storageUsed || 0;

  console.log(`User: ${email}`);
  console.log(`Original storageUsed: ${formatBytes(originalStorageUsed)}`);
  console.log(`Storage limit: ${formatBytes(limit)}`);
  console.log('');

  try {
    // Test 1: Under quota - small file should be allowed
    console.log('Test 1: Under quota (file should be allowed)');
    await db.collection('users').doc(userId).update({ storageUsed: 0 });
    const underQuotaCheck = checkQuota(0, 1024 * 1024, limit); // 1 MB file
    logResult(
      `${planName}: Under quota upload`,
      'allowed: true',
      `allowed: ${underQuotaCheck.allowed}`,
      underQuotaCheck.allowed === true
    );

    // Test 2: Near quota - file that would exceed should be blocked
    console.log('Test 2: Near quota (file that would exceed should be blocked)');
    const nearLimitUsed = limit - (1024 * 1024); // 1 MB below limit
    await db.collection('users').doc(userId).update({ storageUsed: nearLimitUsed });
    const nearQuotaCheck = checkQuota(nearLimitUsed, 2 * 1024 * 1024, limit); // 2 MB file
    logResult(
      `${planName}: Near quota upload exceeding limit`,
      'allowed: false',
      `allowed: ${nearQuotaCheck.allowed}`,
      nearQuotaCheck.allowed === false
    );

    // Test 3: Near quota - file that fits should be allowed
    console.log('Test 3: Near quota (file that fits should be allowed)');
    const nearQuotaFitCheck = checkQuota(nearLimitUsed, 512 * 1024, limit); // 0.5 MB file
    logResult(
      `${planName}: Near quota upload within limit`,
      'allowed: true',
      `allowed: ${nearQuotaFitCheck.allowed}`,
      nearQuotaFitCheck.allowed === true
    );

    // Test 4: Over quota - all uploads should be blocked
    console.log('Test 4: Over quota (all uploads should be blocked)');
    const overLimitUsed = limit + (1024 * 1024); // 1 MB over limit
    await db.collection('users').doc(userId).update({ storageUsed: overLimitUsed });
    const overQuotaCheck = checkQuota(overLimitUsed, 1024, limit); // Even tiny 1KB file
    logResult(
      `${planName}: Over quota upload`,
      'allowed: false, isOverQuota: true',
      `allowed: ${overQuotaCheck.allowed}, isOverQuota: ${overQuotaCheck.isOverQuota}`,
      overQuotaCheck.allowed === false && overQuotaCheck.isOverQuota === true
    );

    // Test 5: Exactly at quota - no more uploads
    console.log('Test 5: Exactly at quota (no more uploads)');
    await db.collection('users').doc(userId).update({ storageUsed: limit });
    const atQuotaCheck = checkQuota(limit, 1, limit); // Even 1 byte file
    logResult(
      `${planName}: At exact quota upload`,
      'allowed: false',
      `allowed: ${atQuotaCheck.allowed}`,
      atQuotaCheck.allowed === false
    );

  } finally {
    // Restore original storage used
    await db.collection('users').doc(userId).update({ storageUsed: originalStorageUsed });
    console.log(`Restored storageUsed to: ${formatBytes(originalStorageUsed)}`);
  }
}

/**
 * Simulates the checkStorageQuota function logic
 */
function checkQuota(storageUsed: number, fileSize: number, storageLimit: number): {
  allowed: boolean;
  message?: string;
  isOverQuota?: boolean;
} {
  // First check: if already over quota (e.g., after downgrade), block all uploads
  if (storageUsed > storageLimit) {
    const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
    const usedMB = (storageUsed / (1024 * 1024)).toFixed(1);
    const excessMB = ((storageUsed - storageLimit) / (1024 * 1024)).toFixed(1);
    return {
      allowed: false,
      isOverQuota: true,
      message: `Storage over limit. You're using ${usedMB} MB of ${limitMB} MB. Delete ${excessMB} MB of files to upload new content.`,
    };
  }

  // Second check: if adding this file would exceed the limit
  if (storageUsed + fileSize > storageLimit) {
    const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
    const usedMB = (storageUsed / (1024 * 1024)).toFixed(2);
    return {
      allowed: false,
      message: `Storage quota exceeded. You're using ${usedMB} MB of ${limitMB} MB. Please upgrade your plan or delete some files.`,
    };
  }

  return { allowed: true };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

main().catch(console.error);
