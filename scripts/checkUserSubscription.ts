/**
 * Check User Subscription Status in Firestore
 * READ-ONLY - Does not modify any data
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUser(email: string): Promise<void> {
  console.log('===========================================');
  console.log(`CHECKING FIRESTORE FOR: ${email}`);
  console.log('===========================================\n');

  // Find user by email
  const usersSnap = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    console.log(`User NOT found with email ${email}`);
    return;
  }

  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;

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
  console.log('subscriptionStartDate:', userData.subscriptionStartDate?.toDate?.() || '(not set)');
  console.log('currentPeriodEnd:', userData.currentPeriodEnd?.toDate?.() || '(not set)');
  console.log('trialStartDate:', userData.trialStartDate?.toDate?.() || '(not set)');
  console.log('trialEndDate:', userData.trialEndDate?.toDate?.() || '(not set)');
  console.log('trialEndDate (raw):', userData.trialEndDate);
  console.log('cancelAtPeriodEnd:', userData.cancelAtPeriodEnd);
  console.log('pendingPlanChange:', userData.pendingPlanChange || '(not set)');
  console.log('');

  // Check subscriptions collection
  console.log('CHECKING SUBSCRIPTIONS COLLECTION:');
  console.log('----------------------------------');

  const subsSnap = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .get();

  if (subsSnap.empty) {
    console.log('No documents found in subscriptions collection for this user');
  } else {
    console.log('Found', subsSnap.size, 'subscription document(s):');
    for (const doc of subsSnap.docs) {
      console.log('\nSubscription (ID:', doc.id + '):');
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  }

  // Check if user has agencies
  console.log('\nCHECKING USER AGENCIES:');
  console.log('-----------------------');
  if (userData.agencies && userData.agencies.length > 0) {
    console.log('User has', userData.agencies.length, 'agency membership(s):');
    for (const membership of userData.agencies) {
      console.log('- Agency ID:', membership.agencyId, '| Role:', membership.role);

      // Get agency subscription status
      const agencyDoc = await db.collection('agencies').doc(membership.agencyId).get();
      if (agencyDoc.exists) {
        const agencyData = agencyDoc.data();
        console.log('  Agency subscription:', JSON.stringify(agencyData?.subscription || {}, null, 2));
      }
    }
  } else {
    console.log('User has no agency memberships');
  }
}

async function main(): Promise<void> {
  const email = process.argv[2] || 'ramanac@gmail.com';
  try {
    await checkUser(email);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
