/**
 * C10 RBAC Security Test Script
 *
 * Tests C10 isolation - verify C10 can access own elders but NOT others.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration
const C10_UID = 'aEQm0nL4hgcQVXEdAy0vd4qYbDe2';

// C10's elders
const C10_ELDER_1 = '7IZOmv92u6mMnQdedPID'; // LO-C10-3 (groupId: 3DwV7HmrTyC9ReXqBLxl)
const C10_ELDER_2 = '9Kqy3BCBDwSkub9ywSDw'; // LO-C10-2 (groupId: 3DwV7HmrTyC9ReXqBLxl)
const C10_ELDER_3 = '9i4JAGoYqUlgSiVzlWKL'; // LO-C10-3 (groupId: qoYfixQ4yfzxbvki9mzf)

// Other caregivers' elders
const C1_ELDER_ID = '4pkIN3pTrws0klpkUzYB'; // LO-C1-1
const C2_ELDER_ID = 'XCynWmOt5KdCNp0jdgLo'; // LO-C2-1
const C3_ELDER_ID = 'BAw6UYpkO6oCMgp1WG2N'; // LO-C3-1

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('./serviceAccountKey.json');
  initializeApp({ credential: cert(serviceAccount) });
}

const adminDb = getFirestore();

/**
 * Server-side elder access check
 */
async function canAccessElderProfileServer(
  userId: string,
  elderId: string,
  groupIdParam: string
): Promise<boolean> {
  try {
    console.log(`  [Check] userId=${userId.slice(0,8)}..., elderId=${elderId.slice(0,8)}...`);

    const elderDoc = await adminDb.collection('elders').doc(elderId).get();

    if (!elderDoc.exists) {
      console.log('  [Result] Elder not found');
      return false;
    }

    const elderData = elderDoc.data();
    const actualGroupId = elderData?.groupId;

    if (!actualGroupId) {
      console.log('  [Result] Elder has no groupId - checking other auth methods');

      if (elderData?.primaryCaregiverId === userId) {
        console.log('  [Result] Access granted via primaryCaregiverId');
        return true;
      }
      if (elderData?.createdBy === userId) {
        console.log('  [Result] Access granted via createdBy');
        return true;
      }

      try {
        const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
        if (elderAccessDoc.exists && elderAccessDoc.data()?.active) {
          console.log('  [Result] Access granted via elder_access');
          return true;
        }
      } catch (e) {}

      console.log('  [Result] Access DENIED - no groupId and no direct access');
      return false;
    }

    console.log(`  [Info] Elder actual groupId: ${actualGroupId}`);

    if (elderData?.primaryCaregiverId === userId) {
      console.log('  [Result] Access granted via primaryCaregiverId');
      return true;
    }

    if (elderData?.createdBy === userId) {
      console.log('  [Result] Access granted via createdBy');
      return true;
    }

    try {
      const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
      if (elderAccessDoc.exists && elderAccessDoc.data()?.active) {
        console.log('  [Result] Access granted via elder_access');
        return true;
      }
    } catch (e) {}

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
  console.log('=== C10 RBAC Security Tests ===\n');
  console.log('Testing as C10 (ramanac+c10@gmail.com)\n');

  const results: { test: string; passed: boolean }[] = [];

  // Positive tests - C10 should be able to access their own elders
  console.log('--- POSITIVE TESTS (C10 accessing own elders) ---\n');

  console.log('TEST S10.1: C10 accessing C10-Elder-1 (LO-C10-3)');
  const s10_1 = await canAccessElderProfileServer(C10_UID, C10_ELDER_1, 'any');
  console.log(`  Result: ${s10_1 ? '✅ PASS (Access Granted)' : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'S10.1', passed: s10_1 === true });

  console.log('TEST S10.2: C10 accessing C10-Elder-2 (LO-C10-2)');
  const s10_2 = await canAccessElderProfileServer(C10_UID, C10_ELDER_2, 'any');
  console.log(`  Result: ${s10_2 ? '✅ PASS (Access Granted)' : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'S10.2', passed: s10_2 === true });

  console.log('TEST S10.3: C10 accessing C10-Elder-3 (LO-C10-3)');
  const s10_3 = await canAccessElderProfileServer(C10_UID, C10_ELDER_3, 'any');
  console.log(`  Result: ${s10_3 ? '✅ PASS (Access Granted)' : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'S10.3', passed: s10_3 === true });

  // Negative tests - C10 should NOT be able to access other caregivers' elders
  console.log('--- NEGATIVE TESTS (C10 accessing other caregivers\' elders) ---\n');

  console.log('TEST S10.11: C10 accessing C1\'s Elder (LO-C1-1)');
  const s10_11 = await canAccessElderProfileServer(C10_UID, C1_ELDER_ID, 'any');
  console.log(`  Result: ${!s10_11 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S10.11', passed: s10_11 === false });

  console.log('TEST S10.12: C10 accessing C2\'s Elder (LO-C2-1)');
  const s10_12 = await canAccessElderProfileServer(C10_UID, C2_ELDER_ID, 'any');
  console.log(`  Result: ${!s10_12 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S10.12', passed: s10_12 === false });

  console.log('TEST S10.13: C10 accessing C3\'s Elder (LO-C3-1)');
  const s10_13 = await canAccessElderProfileServer(C10_UID, C3_ELDER_ID, 'any');
  console.log(`  Result: ${!s10_13 ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'S10.13', passed: s10_13 === false });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All C10 RBAC tests passed! Security verified.');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
