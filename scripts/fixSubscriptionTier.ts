/**
 * Fix subscriptionTier for live subscriber
 *
 * The extractPlanKey() webhook function was producing 'family_a' instead of 'family'
 * from the plan name 'Family Plan A'. This script fixes the existing live subscriber.
 *
 * Usage: npx tsx scripts/fixSubscriptionTier.ts
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

// Mapping of incorrect tier values to correct ones
const TIER_FIXES: Record<string, string> = {
  'family_a': 'family',
  'family_b': 'single_agency',
  'multi_agency_plan': 'multi_agency',
};

async function fixSubscriptionTiers(): Promise<void> {
  console.log('===========================================');
  console.log('FIX SUBSCRIPTION TIER VALUES');
  console.log('===========================================\n');

  let fixed = 0;
  let skipped = 0;

  for (const [badTier, correctTier] of Object.entries(TIER_FIXES)) {
    const snapshot = await db.collection('users')
      .where('subscriptionTier', '==', badTier)
      .get();

    if (snapshot.empty) {
      console.log(`No users found with tier '${badTier}'`);
      continue;
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const email = data.email || '(no email)';
      console.log(`\n--- User: ${email} (${doc.id}) ---`);
      console.log(`  Current tier: '${badTier}' → Fixing to: '${correctTier}'`);

      await db.collection('users').doc(doc.id).update({
        subscriptionTier: correctTier,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`  FIXED`);
      fixed++;
    }
  }

  // Also check agency documents
  for (const [badTier, correctTier] of Object.entries(TIER_FIXES)) {
    const agencySnapshot = await db.collection('agencies')
      .where('subscription.tier', '==', badTier)
      .get();

    if (!agencySnapshot.empty) {
      for (const doc of agencySnapshot.docs) {
        console.log(`\n--- Agency: ${doc.id} ---`);
        console.log(`  Current tier: '${badTier}' → Fixing to: '${correctTier}'`);

        await db.collection('agencies').doc(doc.id).update({
          'subscription.tier': correctTier,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`  FIXED`);
        fixed++;
      }
    }
  }

  console.log('\n===========================================');
  console.log(`DONE: Fixed ${fixed} records, skipped ${skipped}`);
  console.log('===========================================');
}

fixSubscriptionTiers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
