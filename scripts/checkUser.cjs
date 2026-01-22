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

async function checkUser() {
  const email = 'ramanac@gmail.com';
  console.log('===========================================');
  console.log('CHECKING FIRESTORE FOR:', email);
  console.log('===========================================');

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

  console.log('');
  console.log('USER DOCUMENT FOUND');
  console.log('-------------------');
  console.log('User ID:', userId);
  console.log('Email:', userData.email);
  console.log('');
  console.log('SUBSCRIPTION FIELDS:');
  console.log('--------------------');
  console.log('subscriptionStatus:', userData.subscriptionStatus || '(not set)');
  console.log('subscriptionTier:', userData.subscriptionTier || '(not set)');
  console.log('stripeCustomerId:', userData.stripeCustomerId || '(not set)');
  console.log('stripeSubscriptionId:', userData.stripeSubscriptionId || '(not set)');
  console.log('subscriptionStartDate:', userData.subscriptionStartDate ? userData.subscriptionStartDate.toDate() : '(not set)');
  console.log('currentPeriodEnd:', userData.currentPeriodEnd ? userData.currentPeriodEnd.toDate() : '(not set)');
  console.log('trialStartDate:', userData.trialStartDate ? userData.trialStartDate.toDate() : '(not set)');
  console.log('trialEndDate:', userData.trialEndDate ? userData.trialEndDate.toDate() : '(not set)');
  console.log('cancelAtPeriodEnd:', userData.cancelAtPeriodEnd);

  // Check agencies
  if (userData.agencies && userData.agencies.length > 0) {
    console.log('');
    console.log('AGENCIES:');
    for (const m of userData.agencies) {
      console.log('- Agency:', m.agencyId, 'Role:', m.role);
      const agencyDoc = await db.collection('agencies').doc(m.agencyId).get();
      if (agencyDoc.exists) {
        const sub = agencyDoc.data().subscription;
        if (sub) {
          console.log('  Agency subscription.status:', sub.status);
          console.log('  Agency subscription.tier:', sub.tier);
        }
      }
    }
  }
}

checkUser().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
