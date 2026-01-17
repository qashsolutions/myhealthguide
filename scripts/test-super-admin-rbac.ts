/**
 * Super Admin (Agency Owner) RBAC Permission Test Script
 *
 * Tests super_admin permissions:
 * - Can VIEW all elders in the agency
 * - Is READ-ONLY for elder care data (cannot edit unless also a caregiver)
 * - Can manage agency (billing, caregivers)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration
const OWNER_UID = 'zEYNIN5nW3Qf7kk1JM08bbc7tc03'; // ramanac+owner@gmail.com (super_admin)
const AGENCY_ID = 'e92yk23zDAsSjK8iOPF8';

// Elders IN owner's agency (from assignedElderIds)
const AGENCY_ELDER_1 = '4pkIN3pTrws0klpkUzYB'; // LO-C1-1 (in owner's agency)
const AGENCY_ELDER_2 = '0CEburLAG8qW8cvOwahs'; // LO-C1-3 (in owner's agency)

// C1's UID (caregiver in owner's agency)
const C1_UID = 'pIBP8LZ1LIgt8oyvrhA1B4v2ABk1';

// Elders NOT in owner's agency (belong to different agencies)
const OTHER_AGENCY_ELDER_1 = 'XCynWmOt5KdCNp0jdgLo'; // LO-C2-1 (agency: uxjKJh6FUV4hkBP0lyxi)
const OTHER_AGENCY_ELDER_2 = 'BAw6UYpkO6oCMgp1WG2N'; // LO-C3-1 (agency: QtjFH6AcnOQ3ydf9Mz6l)

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

    // Check elder_access subcollection
    try {
      const elderAccessDoc = await adminDb.collection('users').doc(userId).collection('elder_access').doc(elderId).get();
      if (elderAccessDoc.exists && elderAccessDoc.data()?.active) return true;
    } catch (e) {}

    // Check group membership
    if (groupId) {
      const groupDoc = await adminDb.collection('groups').doc(groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();
        if (groupData?.adminId === userId) return true;
        if (groupData?.members?.find((m: any) => m.userId === userId)) return true;
      }
    }

    // Check if user is super_admin of the agency that owns this elder
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.agencies?.some((a: any) => a.role === 'super_admin')) {
      // Check if elder belongs to this agency
      if (groupId) {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        if (groupDoc.exists) {
          const agencyId = groupDoc.data()?.agencyId;
          if (userData.agencies.some((a: any) => a.agencyId === agencyId && a.role === 'super_admin')) {
            return true;
          }
        }
      }
      // Also check assignedElderIds
      const assignedElders = userData.agencies.find((a: any) => a.role === 'super_admin')?.assignedElderIds || [];
      if (assignedElders.includes(elderId)) return true;
    }

    return false;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

/**
 * Check if user can EDIT elder care data
 * Super admin is read-only unless also a caregiver
 */
async function canEditElderCareData(userId: string, elderId: string): Promise<{ canEdit: boolean; reason: string }> {
  try {
    const elderDoc = await adminDb.collection('elders').doc(elderId).get();
    if (!elderDoc.exists) return { canEdit: false, reason: 'elder_not_found' };

    const elderData = elderDoc.data();

    // Check if user is the primary caregiver - can edit
    if (elderData?.primaryCaregiverId === userId) {
      return { canEdit: true, reason: 'primaryCaregiverId' };
    }

    // Check if user created this elder - can edit
    if (elderData?.createdBy === userId) {
      return { canEdit: true, reason: 'createdBy' };
    }

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Check if user is ONLY super_admin (not also a caregiver)
    if (userData?.agencies) {
      const isSuperAdmin = userData.agencies.some((a: any) => a.role === 'super_admin');
      const isAlsoCaregiver = userData.agencies.some((a: any) =>
        a.role === 'caregiver' || a.role === 'caregiver_admin'
      );

      if (isSuperAdmin && !isAlsoCaregiver) {
        // Super admin only - read-only for elder care data
        return { canEdit: false, reason: 'super_admin_read_only' };
      }
    }

    // Check group membership with admin permission
    const groupId = elderData?.groupId;
    if (groupId) {
      const groupDoc = await adminDb.collection('groups').doc(groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();
        if (groupData?.adminId === userId) {
          return { canEdit: true, reason: 'group_adminId' };
        }
        const member = groupData?.members?.find((m: any) => m.userId === userId);
        if (member) {
          if (member.permissionLevel === 'admin' || member.role === 'admin') {
            return { canEdit: true, reason: 'group_member_admin' };
          }
          return { canEdit: false, reason: 'group_member_read_only' };
        }
      }
    }

    return { canEdit: false, reason: 'no_edit_permission' };
  } catch (error) {
    console.error('Error:', error);
    return { canEdit: false, reason: 'error' };
  }
}

/**
 * Check if user can manage agency (billing, caregivers)
 */
async function canManageAgency(userId: string, agencyId: string): Promise<boolean> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  return userData?.agencies?.some((a: any) =>
    a.agencyId === agencyId && a.role === 'super_admin'
  ) ?? false;
}

async function runTests() {
  console.log('=== Super Admin (Agency Owner) RBAC Tests ===\n');
  console.log('Testing as Owner (ramanac+owner@gmail.com) - super_admin\n');

  const results: { test: string; passed: boolean; details: string }[] = [];

  // Get owner's user profile
  console.log('--- OWNER USER PROFILE ---\n');
  const ownerDoc = await adminDb.collection('users').doc(OWNER_UID).get();
  const ownerData = ownerDoc.data();
  console.log('Email:', ownerData?.email);
  console.log('Agency Role:', ownerData?.agencies?.[0]?.role);
  console.log('Assigned Elders Count:', ownerData?.agencies?.[0]?.assignedElderIds?.length || 0);
  console.log('');

  // Test 1: Owner can VIEW elders IN their agency
  console.log('--- VIEW ACCESS TESTS (Owner\'s Agency Elders) ---\n');

  console.log('TEST SA1: Owner can VIEW Agency Elder 1 (LO-C1-1)');
  const sa1 = await canAccessElder(OWNER_UID, AGENCY_ELDER_1);
  console.log(`  Can View: ${sa1}`);
  console.log(`  Result: ${sa1 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'SA1', passed: sa1, details: `canView=${sa1}` });

  console.log('TEST SA2: Owner can VIEW Agency Elder 2 (LO-C1-3)');
  const sa2 = await canAccessElder(OWNER_UID, AGENCY_ELDER_2);
  console.log(`  Can View: ${sa2}`);
  console.log(`  Result: ${sa2 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'SA2', passed: sa2, details: `canView=${sa2}` });

  // Test 2: Owner CANNOT view elders in OTHER agencies
  console.log('--- VIEW ACCESS TESTS (Other Agency Elders - Should FAIL) ---\n');

  console.log('TEST SA3: Owner CANNOT VIEW Elder from different agency (LO-C2-1)');
  const sa3 = await canAccessElder(OWNER_UID, OTHER_AGENCY_ELDER_1);
  const sa3Pass = !sa3; // Should be denied
  console.log(`  Can View: ${sa3}`);
  console.log(`  Result: ${sa3Pass ? '✅ PASS (Correctly denied)' : '❌ FAIL (Should not have access)'}\n`);
  results.push({ test: 'SA3', passed: sa3Pass, details: `canView=${sa3}` });

  console.log('TEST SA4: Owner CANNOT VIEW Elder from different agency (LO-C3-1)');
  const sa4_view = await canAccessElder(OWNER_UID, OTHER_AGENCY_ELDER_2);
  const sa4Pass_view = !sa4_view; // Should be denied
  console.log(`  Can View: ${sa4_view}`);
  console.log(`  Result: ${sa4Pass_view ? '✅ PASS (Correctly denied)' : '❌ FAIL (Should not have access)'}\n`);
  results.push({ test: 'SA4', passed: sa4Pass_view, details: `canView=${sa4_view}` });

  // Test 3: Owner is READ-ONLY for elder care data (even in own agency)
  console.log('--- EDIT ACCESS TESTS (Should be READ-ONLY) ---\n');

  console.log('TEST SA5: Owner CANNOT EDIT Agency Elder 1 care data');
  const sa5 = await canEditElderCareData(OWNER_UID, AGENCY_ELDER_1);
  console.log(`  Can Edit: ${sa5.canEdit}`);
  console.log(`  Reason: ${sa5.reason}`);
  const sa5Pass = !sa5.canEdit && sa5.reason === 'super_admin_read_only';
  console.log(`  Result: ${sa5Pass ? '✅ PASS (Read-only)' : '❌ FAIL'}\n`);
  results.push({ test: 'SA5', passed: sa5Pass, details: `canEdit=${sa5.canEdit}, reason=${sa5.reason}` });

  console.log('TEST SA6: Owner CANNOT EDIT Agency Elder 2 care data');
  const sa6_edit = await canEditElderCareData(OWNER_UID, AGENCY_ELDER_2);
  console.log(`  Can Edit: ${sa6_edit.canEdit}`);
  console.log(`  Reason: ${sa6_edit.reason}`);
  const sa6Pass_edit = !sa6_edit.canEdit && sa6_edit.reason === 'super_admin_read_only';
  console.log(`  Result: ${sa6Pass_edit ? '✅ PASS (Read-only)' : '❌ FAIL'}\n`);
  results.push({ test: 'SA6', passed: sa6Pass_edit, details: `canEdit=${sa6_edit.canEdit}, reason=${sa6_edit.reason}` });

  // Test 4: Caregiver CAN edit their own elder (comparison)
  console.log('--- CAREGIVER EDIT ACCESS (for comparison) ---\n');

  console.log('TEST SA7: C1 CAN EDIT their own Elder');
  const sa7 = await canEditElderCareData(C1_UID, AGENCY_ELDER_1);
  console.log(`  Can Edit: ${sa7.canEdit}`);
  console.log(`  Reason: ${sa7.reason}`);
  const sa7Pass = sa7.canEdit;
  console.log(`  Result: ${sa7Pass ? '✅ PASS (Caregiver can edit)' : '❌ FAIL'}\n`);
  results.push({ test: 'SA7', passed: sa7Pass, details: `canEdit=${sa7.canEdit}, reason=${sa7.reason}` });

  // Test 5: Owner CAN manage agency
  console.log('--- AGENCY MANAGEMENT ACCESS ---\n');

  console.log('TEST SA8: Owner CAN manage agency (billing, caregivers)');
  const sa8 = await canManageAgency(OWNER_UID, AGENCY_ID);
  console.log(`  Can Manage Agency: ${sa8}`);
  console.log(`  Result: ${sa8 ? '✅ PASS' : '❌ FAIL'}\n`);
  results.push({ test: 'SA8', passed: sa8, details: `canManageAgency=${sa8}` });

  console.log('TEST SA9: C1 CANNOT manage agency');
  const sa9 = await canManageAgency(C1_UID, AGENCY_ID);
  console.log(`  Can Manage Agency: ${sa9}`);
  const sa9Pass = !sa9;
  console.log(`  Result: ${sa9Pass ? '✅ PASS (Caregiver cannot manage)' : '❌ FAIL'}\n`);
  results.push({ test: 'SA9', passed: sa9Pass, details: `canManageAgency=${sa9}` });

  // Summary
  console.log('=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    console.log(`  ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (${r.details})`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All super_admin tests passed!');
    console.log('\nVerified:');
    console.log('  - Owner can VIEW all agency elders');
    console.log('  - Owner is READ-ONLY for elder care data');
    console.log('  - Owner CAN manage agency (billing, caregivers)');
    console.log('  - Caregivers CAN edit their own elders');
  } else {
    console.log('\n⚠️ Some tests failed.');
  }
}

runTests().then(() => process.exit(0)).catch(console.error);
