/**
 * Test Script: Email Required for Family Member Invites - API ENDPOINT TESTS
 *
 * Tests the /api/caregiver/invite-member endpoint directly via HTTP requests
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Firebase configuration
const FIREBASE_API_KEY = 'AIzaSyDT-wnOiaMtzb72nXfT-QvuoKpEHis9C0k';
const API_BASE_URL = 'https://www.myguide.health';

// Test account from refactor-4.md
const TEST_CAREGIVER = {
  email: 'ramanac+c1@gmail.com',
  password: 'AbcD1234',
};

// Initialize Firebase Admin for cleanup
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
  expectedStatus: number;
  actualStatus: number;
  actualMessage: string;
  status: 'PASS' | 'FAIL';
}

const testResults: TestResult[] = [];
let createdInviteId: string | null = null;

async function signInWithEmailPassword(email: string, password: string): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Sign in failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.idToken;
}

async function getCaregiverGroupId(caregiverId: string): Promise<string | null> {
  const assignmentsSnap = await db.collection('caregiver_assignments')
    .where('caregiverId', '==', caregiverId)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (assignmentsSnap.empty) {
    return null;
  }

  return assignmentsSnap.docs[0].data().groupId;
}

async function callInviteMemberAPI(
  token: string,
  body: Record<string, any>
): Promise<{ status: number; data: any }> {
  const response = await fetch(`${API_BASE_URL}/api/caregiver/invite-member`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function runAPITests(): Promise<void> {
  console.log('\n========================================');
  console.log('EMAIL REQUIRED - API ENDPOINT TESTS');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('========================================\n');

  // Step 1: Sign in as test caregiver
  console.log('Step 1: Signing in as test caregiver...');
  console.log(`  Email: ${TEST_CAREGIVER.email}`);

  let idToken: string;
  let caregiverId: string;

  try {
    idToken = await signInWithEmailPassword(TEST_CAREGIVER.email, TEST_CAREGIVER.password);
    console.log('  Sign in successful!\n');

    // Decode token to get user ID
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    caregiverId = decodedToken.uid;
    console.log(`  Caregiver ID: ${caregiverId}\n`);
  } catch (error: any) {
    console.error(`  BLOCKER: Failed to sign in - ${error.message}`);
    process.exit(1);
  }

  // Step 2: Get caregiver's group ID
  console.log('Step 2: Getting caregiver group ID...');
  const groupId = await getCaregiverGroupId(caregiverId);

  if (!groupId) {
    console.error('  BLOCKER: Caregiver has no active assignments');
    process.exit(1);
  }
  console.log(`  Group ID: ${groupId}\n`);

  // Step 3: Run API tests
  console.log('Step 3: Running API endpoint tests...\n');

  // Test A1: Empty Email
  console.log('Running A1: Empty email string');
  const a1Result = await callInviteMemberAPI(idToken, { email: '', groupId });
  testResults.push({
    test: 'A1',
    input: '"" (empty)',
    expectedStatus: 400,
    actualStatus: a1Result.status,
    actualMessage: a1Result.data.error || 'Success',
    status: a1Result.status === 400 ? 'PASS' : 'FAIL',
  });
  console.log(`  Status: ${a1Result.status}, Message: ${a1Result.data.error || 'Success'}`);
  console.log(`  Result: ${a1Result.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Test A2: Missing Email Field
  console.log('Running A2: Missing email field');
  const a2Result = await callInviteMemberAPI(idToken, { groupId, name: 'Test User' });
  testResults.push({
    test: 'A2',
    input: '(missing)',
    expectedStatus: 400,
    actualStatus: a2Result.status,
    actualMessage: a2Result.data.error || 'Success',
    status: a2Result.status === 400 ? 'PASS' : 'FAIL',
  });
  console.log(`  Status: ${a2Result.status}, Message: ${a2Result.data.error || 'Success'}`);
  console.log(`  Result: ${a2Result.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Test A3: Invalid Email Format
  console.log('Running A3: Invalid email format (no @)');
  const a3Result = await callInviteMemberAPI(idToken, { email: 'notanemail', groupId });
  testResults.push({
    test: 'A3',
    input: 'notanemail',
    expectedStatus: 400,
    actualStatus: a3Result.status,
    actualMessage: a3Result.data.error || 'Success',
    status: a3Result.status === 400 ? 'PASS' : 'FAIL',
  });
  console.log(`  Status: ${a3Result.status}, Message: ${a3Result.data.error || 'Success'}`);
  console.log(`  Result: ${a3Result.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Test A4: Valid Email (should succeed)
  console.log('Running A4: Valid email format');
  const testEmail = `apitest-${Date.now()}@example.com`;
  const a4Result = await callInviteMemberAPI(idToken, { email: testEmail, groupId });
  const a4Success = a4Result.status === 200 || a4Result.status === 201;
  testResults.push({
    test: 'A4',
    input: testEmail,
    expectedStatus: 200,
    actualStatus: a4Result.status,
    actualMessage: a4Result.data.error || a4Result.data.message || 'Success',
    status: a4Success ? 'PASS' : 'FAIL',
  });
  console.log(`  Status: ${a4Result.status}, Message: ${a4Result.data.error || a4Result.data.message || 'Success'}`);
  console.log(`  Result: ${a4Success ? 'PASS' : 'FAIL'}\n`);

  if (a4Success && a4Result.data.inviteId) {
    createdInviteId = a4Result.data.inviteId;
    console.log(`  Created invite ID: ${createdInviteId} (will be cleaned up)\n`);
  }

  // Test A5: Whitespace Email
  console.log('Running A5: Whitespace only email');
  const a5Result = await callInviteMemberAPI(idToken, { email: '   ', groupId });
  testResults.push({
    test: 'A5',
    input: '"   " (whitespace)',
    expectedStatus: 400,
    actualStatus: a5Result.status,
    actualMessage: a5Result.data.error || 'Success',
    status: a5Result.status === 400 ? 'PASS' : 'FAIL',
  });
  console.log(`  Status: ${a5Result.status}, Message: ${a5Result.data.error || 'Success'}`);
  console.log(`  Result: ${a5Result.status === 400 ? 'PASS' : 'FAIL'}\n`);

  // Print results table
  console.log('\n========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('========================================\n');

  console.log('| Test | Input | Expected Status | Actual Status | Actual Message | Status |');
  console.log('|------|-------|-----------------|---------------|----------------|--------|');

  for (const result of testResults) {
    const msgTruncated = result.actualMessage.length > 25
      ? result.actualMessage.substring(0, 25) + '...'
      : result.actualMessage;
    console.log(`| ${result.test} | ${result.input} | ${result.expectedStatus} | ${result.actualStatus} | ${msgTruncated} | ${result.status} |`);
  }

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;

  console.log(`\nTotal: ${passCount} PASS, ${failCount} FAIL`);
}

async function cleanup(): Promise<void> {
  console.log('\n========================================');
  console.log('CLEANUP');
  console.log('========================================\n');

  if (!createdInviteId) {
    console.log('No test invites to clean up.');
    return;
  }

  console.log(`Deleting test invite: ${createdInviteId}`);
  try {
    await db.collection('caregiver_member_invites').doc(createdInviteId).delete();
    console.log('  Deleted successfully.');
  } catch (error: any) {
    console.log(`  Failed to delete: ${error.message}`);
  }

  console.log('\nCleanup complete.');
}

async function main(): Promise<void> {
  try {
    await runAPITests();
    await cleanup();
  } catch (error) {
    console.error('Test execution failed:', error);
    await cleanup();
    process.exit(1);
  }

  process.exit(0);
}

main();
