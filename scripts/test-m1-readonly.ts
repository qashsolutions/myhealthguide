/**
 * M1 Read-Only Permission Test Script
 *
 * Tests that M1 (read-only member) can VIEW but NOT EDIT elders.
 * Verifies permission level enforcement.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration
const M1_UID = 'uS3s3D0vHoS7DL4Cz3GCJig8NGw1'; // ramanac+c1m1@gmail.com (read-only member)
const C1_UID = 'pIBP8LZ1LIgt8oyvrhA1B4v2ABk1'; // ramanac+c1@gmail.com (admin caregiver)

// C1's elder
const C1_ELDER_1 = '4pkIN3pTrws0klpkUzYB'; // LO-C1-1 (groupId: Dl2TjR3l21Ub6xM1G0MJ)
const C1_GROUP_ID = 'Dl2TjR3l21Ub6xM1G0MJ';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('./serviceAccountKey.json');
  initializeApp({ credential: cert(serviceAccount) });
}

const adminDb = getFirestore();

/**
 * Get user's permission level for a specific elder's group
 */
async function getUserPermissionForElder(
  userId: string,
  elderId: string
): Promise<{ canView: boolean; canEdit: boolean; permissionLevel: string; accessMethod: string }> {
  try {
    // Get elder document
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();
    if (!elderDoc.exists) {
      return { canView: false, canEdit: false, permissionLevel: 'none', accessMethod: 'elder_not_found' };
    }

    const elderData = elderDoc.data();
    const groupId = elderData?.groupId;

    // Check if user is primaryCaregiverId - full access
    if (elderData?.primaryCaregiverId === userId) {
      return { canView: true, canEdit: true, permissionLevel: 'admin', accessMethod: 'primaryCaregiverId' };
    }

    // Check if user is createdBy - full access
    if (elderData?.createdBy === userId) {
      return { canView: true, canEdit: true, permissionLevel: 'admin', accessMethod: 'createdBy' };
    }

    // Check elder_access subcollection
    try {
      const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
      if (elderAccessDoc.exists && elderAccessDoc.data()?.active) {
        const accessData = elderAccessDoc.data();
        const permLevel = accessData?.permissionLevel || 'read';
        return {
          canView: true,
          canEdit: permLevel === 'admin',
          permissionLevel: permLevel,
          accessMethod: 'elder_access'
        };
      }
    } catch (e) {}

    // Check group membership
    if (groupId) {
      const groupDoc = await adminDb.collection('groups').doc(groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();

        // Group admin has full access
        if (groupData?.adminId === userId) {
          return { canView: true, canEdit: true, permissionLevel: 'admin', accessMethod: 'group_adminId' };
        }

        // Check members array
        if (groupData?.members && Array.isArray(groupData.members)) {
          const member = groupData.members.find((m: any) => m.userId === userId);
          if (member) {
            const permLevel = member.permissionLevel || member.role;
            const isAdmin = permLevel === 'admin' || member.role === 'admin';
            return {
              canView: true,
              canEdit: isAdmin,
              permissionLevel: permLevel,
              accessMethod: 'group_member'
            };
          }
        }
      }
    }

    return { canView: false, canEdit: false, permissionLevel: 'none', accessMethod: 'no_access' };
  } catch (error) {
    console.error('Error:', error);
    return { canView: false, canEdit: false, permissionLevel: 'error', accessMethod: 'error' };
  }
}

/**
 * Get user profile to check their role
 */
async function getUserProfile(userId: string): Promise<any> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  return userDoc.data();
}

async function runTests() {
  console.log('=== M1 Read-Only Permission Tests ===\n');
  console.log('Verifying M1 can VIEW but NOT EDIT elders\n');

  const results: { test: string; passed: boolean; details: string }[] = [];

  // Get M1's user profile
  console.log('--- M1 USER PROFILE ---\n');
  const m1Profile = await getUserProfile(M1_UID);
  console.log('M1 Email:', m1Profile?.email);
  console.log('M1 Agency Role:', m1Profile?.agencies?.[0]?.role);
  console.log('');

  // Get C1's user profile for comparison
  console.log('--- C1 USER PROFILE (for comparison) ---\n');
  const c1Profile = await getUserProfile(C1_UID);
  console.log('C1 Email:', c1Profile?.email);
  console.log('C1 Agency Role:', c1Profile?.agencies?.[0]?.role);
  console.log('');

  // Test M1's permission on C1's elder
  console.log('--- PERMISSION TESTS ---\n');

  console.log('TEST R1: M1 permission on C1-Elder-1');
  const m1Perm = await getUserPermissionForElder(M1_UID, C1_ELDER_1);
  console.log(`  Can View: ${m1Perm.canView}`);
  console.log(`  Can Edit: ${m1Perm.canEdit}`);
  console.log(`  Permission Level: ${m1Perm.permissionLevel}`);
  console.log(`  Access Method: ${m1Perm.accessMethod}`);
  const r1Pass = m1Perm.canView === true && m1Perm.canEdit === false && m1Perm.permissionLevel === 'read';
  console.log(`  Result: ${r1Pass ? '✅ PASS (View-only, no edit)' : '❌ FAIL'}\n`);
  results.push({ test: 'R1', passed: r1Pass, details: `view=${m1Perm.canView}, edit=${m1Perm.canEdit}` });

  console.log('TEST R2: C1 permission on C1-Elder-1 (for comparison)');
  const c1Perm = await getUserPermissionForElder(C1_UID, C1_ELDER_1);
  console.log(`  Can View: ${c1Perm.canView}`);
  console.log(`  Can Edit: ${c1Perm.canEdit}`);
  console.log(`  Permission Level: ${c1Perm.permissionLevel}`);
  console.log(`  Access Method: ${c1Perm.accessMethod}`);
  const r2Pass = c1Perm.canView === true && c1Perm.canEdit === true;
  console.log(`  Result: ${r2Pass ? '✅ PASS (Full access with edit)' : '❌ FAIL'}\n`);
  results.push({ test: 'R2', passed: r2Pass, details: `view=${c1Perm.canView}, edit=${c1Perm.canEdit}` });

  // Verify M1's group membership permission level
  console.log('TEST R3: Verify M1 group membership permission level');
  const groupDoc = await adminDb.collection('groups').doc(C1_GROUP_ID).get();
  const groupData = groupDoc.data();
  const m1Member = groupData?.members?.find((m: any) => m.userId === M1_UID);
  console.log(`  M1 in group: ${!!m1Member}`);
  console.log(`  M1 role: ${m1Member?.role}`);
  console.log(`  M1 permissionLevel: ${m1Member?.permissionLevel}`);
  const r3Pass = m1Member && m1Member.permissionLevel === 'read';
  console.log(`  Result: ${r3Pass ? '✅ PASS (read-only in group)' : '❌ FAIL'}\n`);
  results.push({ test: 'R3', passed: r3Pass, details: `permissionLevel=${m1Member?.permissionLevel}` });

  // Verify C1's group membership permission level
  console.log('TEST R4: Verify C1 is group admin');
  const c1Member = groupData?.members?.find((m: any) => m.userId === C1_UID);
  const c1IsAdmin = groupData?.adminId === C1_UID || (c1Member && (c1Member.permissionLevel === 'admin' || c1Member.role === 'admin'));
  console.log(`  C1 is adminId: ${groupData?.adminId === C1_UID}`);
  console.log(`  C1 in members: ${!!c1Member}`);
  console.log(`  C1 permissionLevel: ${c1Member?.permissionLevel || 'N/A (might be adminId)'}`);
  console.log(`  Result: ${c1IsAdmin ? '✅ PASS (C1 has admin access)' : '❌ FAIL'}\n`);
  results.push({ test: 'R4', passed: c1IsAdmin, details: `adminId=${groupData?.adminId === C1_UID}` });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (${r.details})`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! M1 correctly has VIEW-ONLY access (no edit).');
    console.log('\nVerified:');
    console.log('  - M1 (read-only member): canView=true, canEdit=false');
    console.log('  - C1 (admin caregiver): canView=true, canEdit=true');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
