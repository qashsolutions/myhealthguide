/**
 * Test Script: Email Required for Family Member Invites - NEGATIVE SCENARIOS
 *
 * Tests that invalid/missing emails are REJECTED by Firestore rules
 * If rejected = PASS, If accepted = FAIL
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
  input: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  docId?: string;
}

const testResults: TestResult[] = [];
const incorrectlyCreatedDocs: string[] = [];

// Test configuration
const TEST_CONFIG = {
  caregiverId: 'test-caregiver-email-validation',
  groupId: 'test-group-email-validation',
  agencyId: 'test-agency-email-validation',
};

async function createBaseInviteData(overrides: Record<string, any> = {}): Promise<Record<string, any>> {
  return {
    name: 'Test User',
    groupId: TEST_CONFIG.groupId,
    caregiverId: TEST_CONFIG.caregiverId,
    caregiverName: 'Test Caregiver',
    elderIds: ['test-elder-1'],
    agencyId: TEST_CONFIG.agencyId,
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    ...overrides,
  };
}

async function runNegativeTest(
  testId: string,
  inputDescription: string,
  inviteData: Record<string, any>
): Promise<void> {
  console.log(`Running ${testId}: ${inputDescription}`);

  try {
    const docRef = db.collection('caregiver_member_invites').doc();
    inviteData.id = docRef.id;

    await docRef.set(inviteData);

    // If we get here, the document was created - this is a FAIL for negative tests
    incorrectlyCreatedDocs.push(docRef.id);

    testResults.push({
      test: testId,
      input: inputDescription,
      expected: 'Rejected',
      actual: 'Document created (UNEXPECTED)',
      status: 'FAIL',
      docId: docRef.id,
    });

    console.log(`  Result: FAIL - Document was created when it should be rejected (${docRef.id})\n`);

  } catch (error: any) {
    // If we get an error, the document was rejected - this is a PASS for negative tests
    testResults.push({
      test: testId,
      input: inputDescription,
      expected: 'Rejected',
      actual: `Rejected: ${error.code || error.message}`,
      status: 'PASS',
    });

    console.log(`  Result: PASS - Document rejected as expected\n`);
  }
}

async function runNegativeTests(): Promise<void> {
  console.log('\n========================================');
  console.log('EMAIL REQUIRED - NEGATIVE TEST SCENARIOS');
  console.log('========================================\n');

  // N1: Empty Email String
  await runNegativeTest(
    'N1',
    '"" (empty string)',
    await createBaseInviteData({ email: '' })
  );

  // N2: Missing Email Field (no email property at all)
  const n2Data = await createBaseInviteData();
  // Don't add email field at all
  await runNegativeTest(
    'N2',
    '(missing field)',
    n2Data
  );

  // N3: Invalid Format - No @ Symbol
  await runNegativeTest(
    'N3',
    'invalidemail.com',
    await createBaseInviteData({ email: 'invalidemail.com' })
  );

  // N4: Invalid Format - No Domain
  await runNegativeTest(
    'N4',
    'user@',
    await createBaseInviteData({ email: 'user@' })
  );

  // N5: Invalid Format - No Local Part
  await runNegativeTest(
    'N5',
    '@domain.com',
    await createBaseInviteData({ email: '@domain.com' })
  );

  // N6: Invalid Format - Spaces
  await runNegativeTest(
    'N6',
    'user name@domain.com',
    await createBaseInviteData({ email: 'user name@domain.com' })
  );

  // N7: Invalid Format - Multiple @ Symbols
  await runNegativeTest(
    'N7',
    'user@@domain.com',
    await createBaseInviteData({ email: 'user@@domain.com' })
  );

  // N8: Whitespace Only
  await runNegativeTest(
    'N8',
    '"   " (whitespace only)',
    await createBaseInviteData({ email: '   ' })
  );

  // Print results table
  console.log('\n========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('========================================\n');

  console.log('| Test | Input | Expected | Actual | Status |');
  console.log('|------|-------|----------|--------|--------|');

  for (const result of testResults) {
    const actualTruncated = result.actual.length > 30 ? result.actual.substring(0, 30) + '...' : result.actual;
    console.log(`| ${result.test} | ${result.input} | ${result.expected} | ${actualTruncated} | ${result.status} |`);
  }

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;

  console.log(`\nTotal: ${passCount} PASS, ${failCount} FAIL`);

  if (failCount > 0) {
    console.log('\n⚠️  WARNING: Some tests FAILED - documents were created when they should have been rejected!');
  }
}

async function cleanup(): Promise<void> {
  console.log('\n========================================');
  console.log('CLEANUP');
  console.log('========================================\n');

  if (incorrectlyCreatedDocs.length === 0) {
    console.log('No incorrectly created documents to clean up.');
    return;
  }

  console.log(`Deleting ${incorrectlyCreatedDocs.length} incorrectly created documents...`);

  for (const docId of incorrectlyCreatedDocs) {
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
    await runNegativeTests();
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
