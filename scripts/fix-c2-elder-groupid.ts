/**
 * Fix C2 Elder GroupId Script
 *
 * Updates C2's elders with the correct groupId from C2's user profile.
 *
 * Usage: npx ts-node --esm scripts/fix-c2-elder-groupid.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// C2 configuration
const C2_UID = 'RKBseDEbnJVdmtZ6nB2AN11w9Kz1';
const C2_ELDERS = [
  { id: 'XCynWmOt5KdCNp0jdgLo', name: 'LO-C2-1' },
  { id: 'K7NCfFHgUDaCN914jzxI', name: 'LO-C2-2' },
  { id: 'nbDORIinVXQSgm13dkHi', name: 'LO-C2-3' }
];

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = require('./serviceAccountKey.json');
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function fixC2ElderGroupIds() {
  console.log('=== Fix C2 Elder GroupId Script ===\n');

  // Step 1: Get C2's groupId from their user profile
  console.log('Step 1: Finding C2\'s groupId...\n');

  const c2UserDoc = await db.collection('users').doc(C2_UID).get();

  if (!c2UserDoc.exists) {
    console.error('ERROR: C2 user not found!');
    return;
  }

  const c2Data = c2UserDoc.data();
  console.log('C2 User Data:');
  console.log('  Email:', c2Data?.email);
  console.log('  Agencies:', JSON.stringify(c2Data?.agencies, null, 2));
  console.log('  Groups:', JSON.stringify(c2Data?.groups, null, 2));

  // Find the groupId from agencies or groups
  let c2GroupId: string | null = null;

  if (c2Data?.agencies && c2Data.agencies.length > 0) {
    c2GroupId = c2Data.agencies[0].groupId;
    console.log('\n  Found groupId from agencies:', c2GroupId);
  } else if (c2Data?.groups && c2Data.groups.length > 0) {
    c2GroupId = c2Data.groups[0].groupId;
    console.log('\n  Found groupId from groups:', c2GroupId);
  }

  if (!c2GroupId) {
    // Check if C2 has a group where they are admin
    console.log('\n  No groupId in user profile, searching groups collection...');

    const groupsQuery = await db.collection('groups').where('adminId', '==', C2_UID).get();

    if (!groupsQuery.empty) {
      c2GroupId = groupsQuery.docs[0].id;
      console.log('  Found group where C2 is admin:', c2GroupId);
    } else {
      // Search for groups where C2 is a member
      const allGroups = await db.collection('groups').get();
      for (const groupDoc of allGroups.docs) {
        const groupData = groupDoc.data();
        if (groupData?.members && Array.isArray(groupData.members)) {
          const c2Member = groupData.members.find((m: any) => m.userId === C2_UID);
          if (c2Member) {
            c2GroupId = groupDoc.id;
            console.log('  Found group where C2 is member:', c2GroupId);
            break;
          }
        }
      }
    }
  }

  if (!c2GroupId) {
    console.error('\nERROR: Could not find C2\'s groupId!');
    console.log('\nCreating a new group for C2...');

    // Create a new group for C2
    const newGroupRef = db.collection('groups').doc();
    c2GroupId = newGroupRef.id;

    await newGroupRef.set({
      name: 'C2 Test Agency',
      adminId: C2_UID,
      members: [{
        userId: C2_UID,
        email: c2Data?.email || 'ramanac+c2@gmail.com',
        role: 'admin',
        permissionLevel: 'admin',
        joinedAt: FieldValue.serverTimestamp()
      }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('  Created new group:', c2GroupId);

    // Update C2's user profile with the new group
    await db.collection('users').doc(C2_UID).update({
      agencies: [{
        groupId: c2GroupId,
        name: 'C2 Test Agency',
        role: 'admin'
      }]
    });
    console.log('  Updated C2\'s user profile with new group');
  }

  console.log('\nC2 GroupId to use:', c2GroupId);

  // Step 2: Update each elder with the groupId
  console.log('\nStep 2: Updating elders with groupId...\n');

  for (const elder of C2_ELDERS) {
    console.log(`Updating ${elder.name} (${elder.id})...`);

    // First check current state
    const elderDoc = await db.collection('elders').doc(elder.id).get();

    if (!elderDoc.exists) {
      console.log(`  WARNING: Elder ${elder.id} not found!`);
      continue;
    }

    const elderData = elderDoc.data();
    console.log(`  Current groupId: ${elderData?.groupId || 'NONE'}`);
    console.log(`  primaryCaregiverId: ${elderData?.primaryCaregiverId}`);
    console.log(`  createdBy: ${elderData?.createdBy}`);

    // Update with groupId
    await db.collection('elders').doc(elder.id).update({
      groupId: c2GroupId,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`  ✅ Updated with groupId: ${c2GroupId}\n`);
  }

  // Step 3: Verify the updates
  console.log('Step 3: Verifying updates...\n');

  for (const elder of C2_ELDERS) {
    const elderDoc = await db.collection('elders').doc(elder.id).get();
    const elderData = elderDoc.data();
    console.log(`${elder.name}: groupId = ${elderData?.groupId || 'NONE'}`);
  }

  console.log('\n✅ Fix complete!');
}

fixC2ElderGroupIds().then(() => process.exit(0)).catch(console.error);
