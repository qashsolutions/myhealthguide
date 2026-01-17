/**
 * Family Plan B RBAC Permission Test Script
 *
 * Family Plan B: $18.99/mo, 1 elder, 1 admin + 3 read-only members
 *
 * Tests:
 * - B1 (admin) can VIEW and EDIT their elder
 * - B2, B3, B4 (members) can VIEW but NOT EDIT the elder
 * - B1 can manage group settings
 * - B2, B3, B4 cannot manage group settings
 * - All members have correct permission levels
 * - Cross-plan isolation
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Family Plan B configuration
const B1_UID = 'PGkpnphx5UYaYim68UFal5ooXor2'; // Admin
const B2_UID = 'ME8LcT4SLBW9aZfarsqdC0zq1QT2'; // Member 1
const B3_UID = 'Wy5maiqRqAeQpLL36z9sO8iYM663'; // Member 2
const B4_UID = 'Q7WWCuUXDqVw3TrZDTaIcwvPUwS2'; // Member 3
const GROUP_ID = 'xySV6SZQccwtH7Aplt8V';
const ELDER_ID = 'OkOM4dfMfSNYmvadCxYp'; // Loved One B1

// Other plan elders (should be inaccessible)
const PLAN_A_ELDER = 'eNNrfB8xFQDFBhmrXnuL'; // Family Plan A elder
const C1_ELDER = '4pkIN3pTrws0klpkUzYB'; // Multi-Agency C1's elder

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

    if (elderData?.primaryCaregiverId === userId) return true;
    if (elderData?.createdBy === userId) return true;

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

    if (elderData?.primaryCaregiverId === userId) {
      return { canView: true, canEdit: true, reason: 'primaryCaregiverId' };
    }

    if (elderData?.createdBy === userId) {
      return { canView: true, canEdit: true, reason: 'createdBy' };
    }

    if (groupId) {
      const groupDoc = await adminDb.collection('groups').doc(groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();

        if (groupData?.adminId === userId) {
          return { canView: true, canEdit: true, reason: 'group_adminId' };
        }

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

  if (groupData?.adminId === userId) return true;

  const member = groupData?.members?.find((m: any) => m.userId === userId);
  if (member && (member.permissionLevel === 'admin' || member.role === 'admin')) {
    return true;
  }

  return false;
}

async function runTests() {
  console.log('=== Family Plan B RBAC Tests ===\n');
  console.log('Plan: Family Plan B ($18.99/mo)');
  console.log('Limits: 1 elder, 1 admin, 3 read-only members\n');

  const results: { test: string; passed: boolean; details: string }[] = [];

  // Get user profiles
  console.log('--- USER PROFILES ---\n');
  const users = [
    { uid: B1_UID, label: 'B1 (Admin)' },
    { uid: B2_UID, label: 'B2 (Member)' },
    { uid: B3_UID, label: 'B3 (Member)' },
    { uid: B4_UID, label: 'B4 (Member)' }
  ];
  for (const u of users) {
    const doc = await adminDb.collection('users').doc(u.uid).get();
    console.log(`${u.label}: ${doc.data()?.email}`);
  }
  console.log('');

  // Test B1 permissions (Admin)
  console.log('--- B1 (ADMIN) PERMISSION TESTS ---\n');

  console.log('TEST FPB1: B1 can VIEW their elder');
  const fpb1 = await canAccessElder(B1_UID, ELDER_ID);
  console.log(`  Can View: ${fpb1}`);
  console.log(`  Result: ${fpb1 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPB1', passed: fpb1, details: `canView=${fpb1}` });

  console.log('TEST FPB2: B1 can EDIT their elder');
  const fpb2 = await getElderPermission(B1_UID, ELDER_ID);
  console.log(`  Can Edit: ${fpb2.canEdit}`);
  console.log(`  Reason: ${fpb2.reason}`);
  console.log(`  Result: ${fpb2.canEdit ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPB2', passed: fpb2.canEdit, details: `canEdit=${fpb2.canEdit}, reason=${fpb2.reason}` });

  console.log('TEST FPB3: B1 can manage group settings');
  const fpb3 = await canManageGroup(B1_UID, GROUP_ID);
  console.log(`  Can Manage: ${fpb3}`);
  console.log(`  Result: ${fpb3 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'FPB3', passed: fpb3, details: `canManage=${fpb3}` });

  // Test all 3 read-only members
  console.log('--- READ-ONLY MEMBERS PERMISSION TESTS ---\n');

  const members = [
    { uid: B2_UID, label: 'B2', testPrefix: 'FPB4' },
    { uid: B3_UID, label: 'B3', testPrefix: 'FPB5' },
    { uid: B4_UID, label: 'B4', testPrefix: 'FPB6' }
  ];

  for (const member of members) {
    console.log(`TEST ${member.testPrefix}a: ${member.label} can VIEW the elder`);
    const canView = await canAccessElder(member.uid, ELDER_ID);
    console.log(`  Can View: ${canView}`);
    console.log(`  Result: ${canView ? '✅ PASS' : '❌ FAIL'}\n`);
    results.push({ test: `${member.testPrefix}a`, passed: canView, details: `canView=${canView}` });

    console.log(`TEST ${member.testPrefix}b: ${member.label} CANNOT EDIT the elder`);
    const perm = await getElderPermission(member.uid, ELDER_ID);
    const editPass = !perm.canEdit && perm.reason === 'group_member_read';
    console.log(`  Can Edit: ${perm.canEdit}`);
    console.log(`  Reason: ${perm.reason}`);
    console.log(`  Result: ${editPass ? '✅ PASS (Read-only)' : '❌ FAIL'}\n`);
    results.push({ test: `${member.testPrefix}b`, passed: editPass, details: `canEdit=${perm.canEdit}` });

    console.log(`TEST ${member.testPrefix}c: ${member.label} CANNOT manage group`);
    const canManage = await canManageGroup(member.uid, GROUP_ID);
    const managePass = !canManage;
    console.log(`  Can Manage: ${canManage}`);
    console.log(`  Result: ${managePass ? '✅ PASS' : '❌ FAIL'}\n`);
    results.push({ test: `${member.testPrefix}c`, passed: managePass, details: `canManage=${canManage}` });
  }

  // Cross-plan isolation tests
  console.log('--- CROSS-PLAN ISOLATION TESTS ---\n');

  console.log('TEST FPB7: B1 CANNOT access Family Plan A elder');
  const fpb7 = await canAccessElder(B1_UID, PLAN_A_ELDER);
  const fpb7Pass = !fpb7;
  console.log(`  Can View: ${fpb7}`);
  console.log(`  Result: ${fpb7Pass ? '✅ PASS (Correctly denied)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPB7', passed: fpb7Pass, details: `canView=${fpb7}` });

  console.log('TEST FPB8: B1 CANNOT access Multi-Agency elder');
  const fpb8 = await canAccessElder(B1_UID, C1_ELDER);
  const fpb8Pass = !fpb8;
  console.log(`  Can View: ${fpb8}`);
  console.log(`  Result: ${fpb8Pass ? '✅ PASS (Correctly denied)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPB8', passed: fpb8Pass, details: `canView=${fpb8}` });

  console.log('TEST FPB9: B2 (member) CANNOT access Family Plan A elder');
  const fpb9 = await canAccessElder(B2_UID, PLAN_A_ELDER);
  const fpb9Pass = !fpb9;
  console.log(`  Can View: ${fpb9}`);
  console.log(`  Result: ${fpb9Pass ? '✅ PASS (Correctly denied)' : '❌ FAIL'}\n`);
  results.push({ test: 'FPB9', passed: fpb9Pass, details: `canView=${fpb9}` });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (${r.details})`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All Family Plan B tests passed!');
    console.log('\nVerified:');
    console.log('  - B1 (Admin): Can view AND edit elder, can manage group');
    console.log('  - B2, B3, B4 (Members): Can view but NOT edit, cannot manage group');
    console.log('  - All 3 read-only member slots verified');
    console.log('  - Cross-plan isolation: Cannot access other plans\' elders');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
