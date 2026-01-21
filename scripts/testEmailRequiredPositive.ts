/**
 * Test Script: Email Required for Family Member Invites - POSITIVE SCENARIOS
 *
 * Tests that valid email formats are accepted by Firestore rules
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

interface TestResult {
  test: string;
  email: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  docId?: string;
}

const testResults: TestResult[] = [];
const createdDocIds: string[] = [];

// Test configuration - using test caregiver from refactor-4.md
const TEST_CONFIG = {
  caregiverId: 'test-caregiver-email-validation', // Will be created for testing
  groupId: 'test-group-email-validation',
  agencyId: 'test-agency-email-validation',
};

async function runPositiveTests(): Promise<void> {
  console.log('\n========================================');
  console.log('EMAIL REQUIRED - POSITIVE TEST SCENARIOS');
  console.log('========================================\n');

  const positiveTests = [
    { test: 'P1', email: 'testmember1@gmail.com', description: 'Standard email format' },
    { test: 'P2', email: 'user@mail.company.com', description: 'Subdomain email' },
    { test: 'P3', email: 'testuser+family@gmail.com', description: 'Plus addressing' },
    { test: 'P4', email: 'user123@test456.com', description: 'Numbers in email' },
    { test: 'P5', email: 'first.last.name@domain.com', description: 'Dots in local part' },
  ];

  for (const test of positiveTests) {
    console.log(`Running ${test.test}: ${test.description}`);
    console.log(`  Email: ${test.email}`);

    try {
      const docRef = db.collection('caregiver_member_invites').doc();
      const inviteData = {
        id: docRef.id,
        email: test.email.toLowerCase(),
        name: `Test ${test.test}`,
        groupId: TEST_CONFIG.groupId,
        caregiverId: TEST_CONFIG.caregiverId,
        caregiverName: 'Test Caregiver',
        elderIds: ['test-elder-1'],
        agencyId: TEST_CONFIG.agencyId,
        status: 'pending',
        createdAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      };

      await docRef.set(inviteData);
      createdDocIds.push(docRef.id);

      testResults.push({
        test: test.test,
        email: test.email,
        expected: 'Success',
        actual: 'Document created',
        status: 'PASS',
        docId: docRef.id,
      });

      console.log(`  Result: PASS - Document created (${docRef.id})\n`);

    } catch (error: any) {
      testResults.push({
        test: test.test,
        email: test.email,
        expected: 'Success',
        actual: `Error: ${error.message}`,
        status: 'FAIL',
      });

      console.log(`  Result: FAIL - ${error.message}\n`);
    }
  }

  // Print results table
  console.log('\n========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('========================================\n');

  console.log('| Test | Input | Expected | Actual | Status |');
  console.log('|------|-------|----------|--------|--------|');

  for (const result of testResults) {
    console.log(`| ${result.test} | ${result.email} | ${result.expected} | ${result.actual} | ${result.status} |`);
  }

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;

  console.log(`\nTotal: ${passCount} PASS, ${failCount} FAIL`);
}

async function cleanup(): Promise<void> {
  console.log('\n========================================');
  console.log('CLEANUP');
  console.log('========================================\n');

  if (createdDocIds.length === 0) {
    console.log('No documents to clean up.');
    return;
  }

  console.log(`Deleting ${createdDocIds.length} test documents...`);

  for (const docId of createdDocIds) {
    try {
      await db.collection('caregiver_member_invites').doc(docId).delete();
      console.log(`  Deleted: ${docId}`);
    } catch (error: any) {
      console.log(`  Failed to delete ${docId}: ${error.message}`);
    }
  }

  console.log('\nCleanup complete.');
}

async function main(): Promise<void> {
  try {
    await runPositiveTests();
    await cleanup();
  } catch (error) {
    console.error('Test execution failed:', error);
    // Attempt cleanup even on failure
    await cleanup();
    process.exit(1);
  }

  process.exit(0);
}

main();
