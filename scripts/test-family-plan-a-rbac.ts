/**
 * Family Plan A RBAC Permission Test Script
 *
 * Family Plan A: $8.99/mo, 1 elder, 1 admin + 1 read-only member
 *
 * Tests:
 * - A1 (admin) can VIEW and EDIT their elder
 * - A2 (member) can VIEW but NOT EDIT the elder
 * - A1 can manage group settings
 * - A2 cannot manage group settings
 * - Neither can access elders from other plans/agencies
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Family Plan A configuration
const A1_UID = 'BaFkXvRaAIYEBRA45iHd3MLeKEh2'; // Admin
const A2_UID = '65If3DHEspPqX1TSD5VduolnJqi1'; // Read-only member
const GROUP_ID = 'R34NbYzM1loiympZgpeB';
const ELDER_ID = 'eNNrfB8xFQDFBhmrXnuL'; // Loved One A1

// Other plan elders (should be inaccessible)
const C1_ELDER = '4pkIN3pTrws0klpkUzYB'; // Multi-Agency C1's elder
const PLAN_B_ELDER = 'xySV6SZQccwtH7Aplt8V'; // Family Plan B (if exists)

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('./serviceAccountKey.json');
  initializeApp({ credential: cert(serviceAccount) });
}

const adminDb = getFirestore();

/**
 * Check if user can access elder (view)
 */
async function canAccessElder(userId: string, elderId: string): Promise<boolean> {
  try {
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();
    if (!elderDoc.exists) return false;

    const elderData = elderDoc.data();
    const groupId = elderData?.groupId;

    // Check primaryCaregiverId
    if (elderData?.primaryCaregiverId === userId) return true;

    // Check createdBy
    if (elderData?.createdBy === userId) return true;

    // Check group membership
    if (groupId) {
      const groupDoc = await adminDb.collection('groups').doc(groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();
        if (groupData?.adminId === userId) return true;
        if (groupData?.members?.find((m: any) => m.userId === userId)) return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get user's permission level for elder
 */
async function getElderPermission(userId: string, elderId: string): Promise<{ canView: boolean; canEdit: boolean; reason: string }> {
  try {
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();
    if (!elderDoc.exists) return { canView: false, canEdit: false, reason: 'elder_not_found' };

    const elderData = elderDoc.data();
    const groupId = elderData?.groupId;

    // Check primaryCaregiverId - full access
    if (elderData?.primaryCaregiverId === userId) {
      return { canView: true, canEdit: true, reason: 'primaryCaregiverId' };
    }

    // Check createdBy - full access
    if (elderData?.createdBy === userId) {
      return { canView: true, canEdit: true, reason: 'createdBy' };
    }

    // Check group membership
    if (groupId) {
      const groupDoc = await adminDb.collection('groups').doc(groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();

        // Group admin
        if (groupData?.adminId === userId) {
          return { canView: true, canEdit: true, reason: 'group_adminId' };
        }

        // Check members array
        const member = groupData?.members?.find((m: any) => m.userId === userId);
        if (member) {
          const isAdmin = member.permissionLevel === 'admin' || member.role === 'admin';
          return {
            canView: true,
            canEdit: isAdmin,
            reason: isAdmin ? 'group_member_admin' : 'group_member_read'
          };
        }
      }
    }

    return { canView: false, canEdit: false, reason: 'no_access' };
  } catch (error) {
    return { canView: false, canEdit: false, reason: 'error' };
  }
}

/**
 * Check if user can manage group settings
 */
async function canManageGroup(userId: string, groupId: string): Promise<boolean> {
  const groupDoc = await adminDb.collection('groups').doc(groupId).get();
  if (!groupDoc.exists) return false;

  const groupData = groupDoc.data();

  // Only admin can manage
  if (groupData?.adminId === userId) return true;

  const member = groupData?.members?.find((m: any) => m.userId === userId);
  if (member && (member.permissionLevel === 'admin' || member.role === 'admin')) {
    return true;
  }

  return false;
}

async function runTests() {
  console.log('=== Family Plan A RBAC Tests ===\n');
  console.log('Plan: Family Plan A ($8.99/mo)');
  console.log('Limits: 1 elder, 1 admin, 1 read-only member\n');

  const results: { test: string; passed: boolean; details: string }[] = [];

  // Get user profiles
  console.log('--- USER PROFILES ---\n');
  const a1Doc = await adminDb.collection('users').doc(A1_UID).get();
  const a2Doc = await adminDb.collection('users').doc(A2_UID).get();
  console.log('A1 (Admin):', a1Doc.data()?.email);
  console.log('A2 (Member):', a2Doc.data()?.email);
  console.log('');

  // Test A1 permissions (Admin)
  console.log('--- A1 (ADMIN) PERMISSION TESTS ---\n');

  console.log('TEST FPA1: A1 can VIEW their elder');
  const fpa1 = await canAccessElder(A1_UID, ELDER_ID);
  console.log(`  Can View: ${fpa1}`);
  console.log(`  Result: ${fpa1 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA1', passed: fpa1, details: `canView=${fpa1}` });

  console.log('TEST FPA2: A1 can EDIT their elder');
  const fpa2 = await getElderPermission(A1_UID, ELDER_ID);
  console.log(`  Can Edit: ${fpa2.canEdit}`);
  console.log(`  Reason: ${fpa2.reason}`);
  const fpa2Pass = fpa2.canEdit;
  console.log(`  Result: ${fpa2Pass ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA2', passed: fpa2Pass, details: `canEdit=${fpa2.canEdit}, reason=${fpa2.reason}` });

  console.log('TEST FPA3: A1 can manage group settings');
  const fpa3 = await canManageGroup(A1_UID, GROUP_ID);
  console.log(`  Can Manage: ${fpa3}`);
  console.log(`  Result: ${fpa3 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA3', passed: fpa3, details: `canManage=${fpa3}` });

  // Test A2 permissions (Read-only member)
  console.log('--- A2 (READ-ONLY MEMBER) PERMISSION TESTS ---\n');

  console.log('TEST FPA4: A2 can VIEW the elder');
  const fpa4 = await canAccessElder(A2_UID, ELDER_ID);
  console.log(`  Can View: ${fpa4}`);
  console.log(`  Result: ${fpa4 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA4', passed: fpa4, details: `canView=${fpa4}` });

  console.log('TEST FPA5: A2 CANNOT EDIT the elder');
  const fpa5 = await getElderPermission(A2_UID, ELDER_ID);
  console.log(`  Can Edit: ${fpa5.canEdit}`);
  console.log(`  Reason: ${fpa5.reason}`);
  const fpa5Pass = !fpa5.canEdit && fpa5.reason === 'group_member_read';
  console.log(`  Result: ${fpa5Pass ? '✅ PASS (Read-only)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA5', passed: fpa5Pass, details: `canEdit=${fpa5.canEdit}, reason=${fpa5.reason}` });

  console.log('TEST FPA6: A2 CANNOT manage group settings');
  const fpa6 = await canManageGroup(A2_UID, GROUP_ID);
  const fpa6Pass = !fpa6;
  console.log(`  Can Manage: ${fpa6}`);
  console.log(`  Result: ${fpa6Pass ? '✅ PASS (Cannot manage)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA6', passed: fpa6Pass, details: `canManage=${fpa6}` });

  // Cross-plan isolation tests
  console.log('--- CROSS-PLAN ISOLATION TESTS ---\n');

  console.log('TEST FPA7: A1 CANNOT access Multi-Agency elder (C1)');
  const fpa7 = await canAccessElder(A1_UID, C1_ELDER);
  const fpa7Pass = !fpa7;
  console.log(`  Can View: ${fpa7}`);
  console.log(`  Result: ${fpa7Pass ? '✅ PASS (Correctly denied)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA7', passed: fpa7Pass, details: `canView=${fpa7}` });

  console.log('TEST FPA8: A2 CANNOT access Multi-Agency elder (C1)');
  const fpa8 = await canAccessElder(A2_UID, C1_ELDER);
  const fpa8Pass = !fpa8;
  console.log(`  Can View: ${fpa8}`);
  console.log(`  Result: ${fpa8Pass ? '✅ PASS (Correctly denied)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPA8', passed: fpa8Pass, details: `canView=${fpa8}` });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (${r.details})`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All Family Plan A tests passed!');
    console.log('\nVerified:');
    console.log('  - A1 (Admin): Can view AND edit elder, can manage group');
    console.log('  - A2 (Member): Can view but NOT edit, cannot manage group');
    console.log('  - Cross-plan isolation: Cannot access other plans\' elders');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
