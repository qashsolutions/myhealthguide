const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUserFull() {
  const email = 'ramanac@gmail.com';
  console.log('===========================================');
  console.log('FULL FIRESTORE DATA CHECK FOR:', email);
  console.log('===========================================\n');

  // 1. Get User Document
  const usersSnap = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    console.log('User NOT found');
    return;
  }

  const userData = usersSnap.docs[0].data();
  const userId = usersSnap.docs[0].id;

  console.log('1. USER DOCUMENT');
  console.log('================');
  console.log('User ID:', userId);
  console.log('Email:', userData.email);
  console.log('subscriptionTier:', userData.subscriptionTier || '(not set)');
  console.log('subscriptionStatus:', userData.subscriptionStatus || '(not set)');

  // 2. Check GROUPS array (for Family Plans)
  console.log('\n2. GROUPS ARRAY (Family Plan membership)');
  console.log('=========================================');
  if (userData.groups && userData.groups.length > 0) {
    console.log('Groups found:', userData.groups.length);
    for (const g of userData.groups) {
      console.log('  - groupId:', g.groupId);
      console.log('    role:', g.role);
      console.log('    joinedAt:', g.joinedAt ? g.joinedAt.toDate() : '(not set)');

      // Get group document
      const groupDoc = await db.collection('groups').doc(g.groupId).get();
      if (groupDoc.exists) {
        const groupData = groupDoc.data();
        console.log('    GROUP DOC EXISTS:');
        console.log('      name:', groupData.name || '(not set)');
        console.log('      planType:', groupData.planType || '(not set)');
        console.log('      ownerId:', groupData.ownerId || '(not set)');
      } else {
        console.log('    GROUP DOC DOES NOT EXIST');
      }
    }
  } else {
    console.log('NO GROUPS - user.groups is empty or undefined');
  }

  // 3. Check AGENCIES array (for Multi-Agency Plan)
  console.log('\n3. AGENCIES ARRAY (Multi-Agency Plan membership)');
  console.log('=================================================');
  if (userData.agencies && userData.agencies.length > 0) {
    console.log('Agencies found:', userData.agencies.length);
    for (const a of userData.agencies) {
      console.log('  - agencyId:', a.agencyId);
      console.log('    role:', a.role);
      console.log('    joinedAt:', a.joinedAt ? a.joinedAt.toDate() : '(not set)');

      // Get agency document
      const agencyDoc = await db.collection('agencies').doc(a.agencyId).get();
      if (agencyDoc.exists) {
        const agencyData = agencyDoc.data();
        console.log('    AGENCY DOC EXISTS:');
        console.log('      name:', agencyData.name || '(not set)');
        console.log('      ownerId:', agencyData.ownerId || '(not set)');
        console.log('      subscription.tier:', agencyData.subscription?.tier || '(not set)');
        console.log('      subscription.status:', agencyData.subscription?.status || '(not set)');
      } else {
        console.log('    AGENCY DOC DOES NOT EXIST');
      }
    }
  } else {
    console.log('NO AGENCIES - user.agencies is empty or undefined');
  }

  // 4. Check if user owns any elders directly
  console.log('\n4. ELDERS CREATED BY THIS USER');
  console.log('===============================');
  const eldersSnap = await db.collection('elders')
    .where('createdBy', '==', userId)
    .get();

  if (eldersSnap.empty) {
    console.log('No elders created by this user');
  } else {
    console.log('Elders found:', eldersSnap.size);
    for (const doc of eldersSnap.docs) {
      const e = doc.data();
      console.log('  - Elder ID:', doc.id);
      console.log('    name:', e.name);
      console.log('    groupId:', e.groupId || '(not set)');
      console.log('    agencyId:', e.agencyId || '(not set)');
    }
  }

  // 5. Summary and Analysis
  console.log('\n5. ANALYSIS');
  console.log('===========');
  const hasGroups = userData.groups && userData.groups.length > 0;
  const hasAgencies = userData.agencies && userData.agencies.length > 0;
  const tier = userData.subscriptionTier;

  console.log('subscriptionTier:', tier);
  console.log('Has groups array:', hasGroups);
  console.log('Has agencies array:', hasAgencies);

  if (tier === 'family_a' || tier === 'family_b') {
    console.log('\nEXPECTED for Family Plan:');
    console.log('  - Should have groups[] with role=admin');
    console.log('  - Should NOT have agencies[]');

    if (hasAgencies) {
      console.log('\n*** DATA ISSUE: Family Plan user should NOT have agencies array ***');
    }
    if (!hasGroups) {
      console.log('\n*** DATA ISSUE: Family Plan user should have groups array ***');
    }
  } else if (tier === 'multi_agency') {
    console.log('\nEXPECTED for Multi-Agency Plan:');
    console.log('  - Should have agencies[] with role=super_admin (owner)');
    console.log('  - May or may not have groups[]');
  }
}

checkUserFull().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
