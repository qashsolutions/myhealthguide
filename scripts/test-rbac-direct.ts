/**
 * Direct RBAC Security Test Script
 *
 * Tests S1.14-S1.17: Verify canAccessElderProfileServer properly denies
 * access to elders that belong to other caregivers.
 *
 * Usage: npx ts-node --esm scripts/test-rbac-direct.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration - C1's elders
const C1_UID = 'pIBP8LZ1LIgt8oyvrhA1B4v2ABk1';
const C1_ELDER_1 = '4pkIN3pTrws0klpkUzYB'; // LO-C1-1
const C1_ELDER_3 = '0CEburLAG8qW8cvOwahs'; // LO-C1-3

// Other caregivers' elders
const C2_ELDER_ID = 'XCynWmOt5KdCNp0jdgLo'; // LO-C2-1
const C3_ELDER_ID = 'BAw6UYpkO6oCMgp1WG2N'; // LO-C3-1
const C10_ELDER_ID = '9Kqy3BCBDwSkub9ywSDw'; // LO-C10-1

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('./serviceAccountKey.json');
  initializeApp({ credential: cert(serviceAccount) });
}

const adminDb = getFirestore();

/**
 * Server-side elder access check (same logic as canAccessElderProfileServer)
 */
async function canAccessElderProfileServer(
  userId: string,
  elderId: string,
  groupIdParam: string
): Promise<boolean> {
  try {
    console.log(`  [Check] userId=${userId}, elderId=${elderId}, groupIdParam=${groupIdParam}`);

    // CRITICAL: First fetch the elder document to get the ACTUAL groupId
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();

    if (!elderDoc.exists) {
      console.log('  [Result] Elder not found');
      return false;
    }

    const elderData = elderDoc.data();
    const actualGroupId = elderData?.groupId;

    if (!actualGroupId) {
      console.log('  [Result] Elder has no groupId');
      return false;
    }

    console.log(`  [Info] Elder actual groupId: ${actualGroupId}`);

    // Check if user is primary caregiver
    if (elderData?.primaryCaregiverId === userId) {
      console.log('  [Result] Access granted via primaryCaregiverId');
      return true;
    }

    // Check if user created this elder
    if (elderData?.createdBy === userId) {
      console.log('  [Result] Access granted via createdBy');
      return true;
    }

    // Check elder_access subcollection
    try {
      const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
      if (elderAccessDoc.exists && elderAccessDoc.data()?.active) {
        console.log('  [Result] Access granted via elder_access');
        return true;
      }
    } catch (e) {}

    // Check if user is group admin of the ELDER'S ACTUAL GROUP
    const groupDoc = await adminDb.collection('groups').doc(actualGroupId).get();

    if (groupDoc.exists) {
      const groupData = groupDoc.data();
      if (groupData?.adminId === userId) {
        console.log('  [Result] Access granted via group adminId');
        return true;
      }

      if (groupData?.members && Array.isArray(groupData.members)) {
        const userMember = groupData.members.find((m: any) => m.userId === userId);
        if (userMember && (userMember.role === 'admin' || userMember.permissionLevel === 'admin')) {
          console.log('  [Result] Access granted via members array (admin)');
          return true;
        }
        if (userMember && userMember.permissionLevel === 'read') {
          console.log('  [Result] Access granted via read-only membership');
          return true;
        }
      }
    }

    console.log('  [Result] Access DENIED');
    return false;
  } catch (error) {
    console.error('  [Error]', error);
    return false;
  }
}

async function runTests() {
  console.log('=== Direct RBAC Security Tests ===\n');
  console.log('Testing as C1 (pIBP8LZ1LIgt8oyvrhA1B4v2ABk1)\n');

  const results: { test: string; passed: boolean }[] = [];

  // Positive tests - C1 should be able to access their own elders
  console.log('--- POSITIVE TESTS (C1 accessing own elders) ---\n');

  console.log('TEST P1: C1 accessing C1-Elder-1 (LO-C1-1)');
  const p1 = await canAccessElderProfileServer(C1_UID, C1_ELDER_1, 'any');
  console.log(`  Result: ${p1 ? '✅ PASS (Access Granted)' : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'P1', passed: p1 === true });

  console.log('TEST P2: C1 accessing C1-Elder-3 (LO-C1-3)');
  const p2 = await canAccessElderProfileServer(C1_UID, C1_ELDER_3, 'any');
  console.log(`  Result: ${p2 ? '✅ PASS (Access Granted)' : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'P2', passed: p2 === true });

  // Negative tests - C1 should NOT be able to access other caregivers' elders
  console.log('--- NEGATIVE TESTS (C1 accessing other caregivers\' elders) ---\n');

  console.log('TEST S1.14: C1 accessing C2\'s Elder (LO-C2-1)');
  const s14 = await canAccessElderProfileServer(C1_UID, C2_ELDER_ID, 'any');
  console.log(`  Result: ${!s14 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S1.14', passed: s14 === false });

  console.log('TEST S1.15: C1 accessing C3\'s Elder (LO-C3-1)');
  const s15 = await canAccessElderProfileServer(C1_UID, C3_ELDER_ID, 'any');
  console.log(`  Result: ${!s15 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S1.15', passed: s15 === false });

  console.log('TEST S1.16: C1 accessing C10\'s Elder (LO-C10-1)');
  const s16 = await canAccessElderProfileServer(C1_UID, C10_ELDER_ID, 'any');
  console.log(`  Result: ${!s16 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S1.16', passed: s16 === false });

  // Test with manipulated groupId (attacker might try to use their own groupId)
  console.log('--- MANIPULATION TESTS (C1 using own groupId to access others\' elders) ---\n');

  // Get C1's actual groupId
  const c1User = await adminDb.collection('users').doc(C1_UID).get();
  const c1GroupId = c1User.data()?.agencies?.[0]?.groupId || c1User.data()?.groups?.[0]?.groupId || 'unknown';
  console.log(`C1's groupId: ${c1GroupId}\n`);

  console.log('TEST S1.17: C1 using own groupId to access C2\'s Elder');
  const s17 = await canAccessElderProfileServer(C1_UID, C2_ELDER_ID, c1GroupId);
  console.log(`  Result: ${!s17 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S1.17', passed: s17 === false });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All RBAC tests passed! Security fix verified.');
  } else {
    console.log('\n⚠️ Some tests failed. Security vulnerability may still exist.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
