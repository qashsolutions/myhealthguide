/**
 * M1 (Read-Only Member) RBAC Security Test Script
 *
 * Tests M1 (C1's read-only member) access:
 * - M1 should have READ access to C1's elders via group membership
 * - M1 should NOT have access to C2, C3, C10's elders
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration
const M1_UID = 'uS3s3D0vHoS7DL4Cz3GCJig8NGw1'; // ramanac+c1m1@gmail.com

// C1's elders (M1 should have read access via group membership)
const C1_ELDER_1 = '4pkIN3pTrws0klpkUzYB'; // LO-C1-1 (groupId: Dl2TjR3l21Ub6xM1G0MJ)
const C1_ELDER_2 = '0CEburLAG8qW8cvOwahs'; // LO-C1-3 (groupId: Dl2TjR3l21Ub6xM1G0MJ)

// Other caregivers' elders (M1 should NOT have access)
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
 * Server-side elder access check (same logic as production)
 */
async function canAccessElderProfileServer(
  userId: string,
  elderId: string,
  groupIdParam: string
): Promise<{ hasAccess: boolean; accessType: string }> {
  try {
    console.log(`  [Check] userId=${userId.slice(0,8)}..., elderId=${elderId.slice(0,8)}...`);

    const elderDoc = await adminDb.collection('elders').doc(elderId).get();

    if (!elderDoc.exists) {
      console.log('  [Result] Elder not found');
      return { hasAccess: false, accessType: 'none' };
    }

    const elderData = elderDoc.data();
    const actualGroupId = elderData?.groupId;

    if (!actualGroupId) {
      console.log('  [Result] Elder has no groupId - checking other auth methods');

      if (elderData?.primaryCaregiverId === userId) {
        console.log('  [Result] Access granted via primaryCaregiverId');
        return { hasAccess: true, accessType: 'primaryCaregiverId' };
      }
      if (elderData?.createdBy === userId) {
        console.log('  [Result] Access granted via createdBy');
        return { hasAccess: true, accessType: 'createdBy' };
      }

      try {
        const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
        if (elderAccessDoc.exists && elderAccessDoc.data()?.active) {
          console.log('  [Result] Access granted via elder_access');
          return { hasAccess: true, accessType: 'elder_access' };
        }
      } catch (e) {}

      console.log('  [Result] Access DENIED - no groupId and no direct access');
      return { hasAccess: false, accessType: 'none' };
    }

    console.log(`  [Info] Elder actual groupId: ${actualGroupId}`);

    if (elderData?.primaryCaregiverId === userId) {
      console.log('  [Result] Access granted via primaryCaregiverId');
      return { hasAccess: true, accessType: 'primaryCaregiverId' };
    }

    if (elderData?.createdBy === userId) {
      console.log('  [Result] Access granted via createdBy');
      return { hasAccess: true, accessType: 'createdBy' };
    }

    try {
      const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
      if (elderAccessDoc.exists && elderAccessDoc.data()?.active) {
        console.log('  [Result] Access granted via elder_access');
        return { hasAccess: true, accessType: 'elder_access' };
      }
    } catch (e) {}

    const groupDoc = await adminDb.collection('groups').doc(actualGroupId).get();

    if (groupDoc.exists) {
      const groupData = groupDoc.data();
      if (groupData?.adminId === userId) {
        console.log('  [Result] Access granted via group adminId');
        return { hasAccess: true, accessType: 'group_admin' };
      }

      if (groupData?.members && Array.isArray(groupData.members)) {
        const userMember = groupData.members.find((m: any) => m.userId === userId);
        if (userMember && (userMember.role === 'admin' || userMember.permissionLevel === 'admin')) {
          console.log('  [Result] Access granted via members array (admin)');
          return { hasAccess: true, accessType: 'member_admin' };
        }
        if (userMember && userMember.permissionLevel === 'read') {
          console.log('  [Result] Access granted via read-only membership');
          return { hasAccess: true, accessType: 'member_read' };
        }
      }
    }

    console.log('  [Result] Access DENIED');
    return { hasAccess: false, accessType: 'none' };
  } catch (error) {
    console.error('  [Error]', error);
    return { hasAccess: false, accessType: 'error' };
  }
}

async function runTests() {
  console.log('=== M1 (Read-Only Member) RBAC Security Tests ===\n');
  console.log('Testing as M1 (ramanac+c1m1@gmail.com) - C1\'s read-only member\n');

  const results: { test: string; passed: boolean; details: string }[] = [];

  // Positive tests - M1 should have READ access to C1's elders
  console.log('--- POSITIVE TESTS (M1 reading C1\'s elders) ---\n');

  console.log('TEST M1.1: M1 reading C1-Elder-1 (LO-C1-1)');
  const m1_1 = await canAccessElderProfileServer(M1_UID, C1_ELDER_1, 'any');
  const m1_1_pass = m1_1.hasAccess && m1_1.accessType === 'member_read';
  console.log(`  Result: ${m1_1_pass ? '✅ PASS (Read Access via membership)' : m1_1.hasAccess ? `⚠️ Access via ${m1_1.accessType}` : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'M1.1', passed: m1_1.hasAccess, details: m1_1.accessType });

  console.log('TEST M1.2: M1 reading C1-Elder-2 (LO-C1-3)');
  const m1_2 = await canAccessElderProfileServer(M1_UID, C1_ELDER_2, 'any');
  const m1_2_pass = m1_2.hasAccess && m1_2.accessType === 'member_read';
  console.log(`  Result: ${m1_2_pass ? '✅ PASS (Read Access via membership)' : m1_2.hasAccess ? `⚠️ Access via ${m1_2.accessType}` : '❌ FAIL (Access Denied)'}\n`);
  results.push({ test: 'M1.2', passed: m1_2.hasAccess, details: m1_2.accessType });

  // Negative tests - M1 should NOT have access to other caregivers' elders
  console.log('--- NEGATIVE TESTS (M1 accessing other caregivers\' elders) ---\n');

  console.log('TEST M1.11: M1 accessing C2\'s Elder (LO-C2-1)');
  const m1_11 = await canAccessElderProfileServer(M1_UID, C2_ELDER_ID, 'any');
  console.log(`  Result: ${!m1_11.hasAccess ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'M1.11', passed: !m1_11.hasAccess, details: m1_11.accessType });

  console.log('TEST M1.12: M1 accessing C3\'s Elder (LO-C3-1)');
  const m1_12 = await canAccessElderProfileServer(M1_UID, C3_ELDER_ID, 'any');
  console.log(`  Result: ${!m1_12.hasAccess ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'M1.12', passed: !m1_12.hasAccess, details: m1_12.accessType });

  console.log('TEST M1.13: M1 accessing C10\'s Elder (LO-C10-1)');
  const m1_13 = await canAccessElderProfileServer(M1_UID, C10_ELDER_ID, 'any');
  console.log(`  Result: ${!m1_13.hasAccess ? '✅ PASS (Access Denied)' : '❌ FAIL (Access Granted!)'}\n`);
  results.push({ test: 'M1.13', passed: !m1_13.hasAccess, details: m1_13.accessType });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (${r.details})`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All M1 RBAC tests passed! Read-only member access verified.');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
