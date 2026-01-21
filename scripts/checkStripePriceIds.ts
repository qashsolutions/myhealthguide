/**
 * Check Stripe Price IDs in Firestore
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

async function checkFirestorePriceIds(): Promise<void> {
  console.log('\n========================================');
  console.log('STRIPE PRICE IDS IN FIRESTORE');
  console.log('========================================\n');

  const priceIdsFound: Array<{ location: string; priceId: string; mode: string }> = [];

  // Check subscriptions collection
  console.log('Checking: subscriptions collection...');
  try {
    const subsSnap = await db.collection('subscriptions').limit(50).get();
    console.log(`  Found ${subsSnap.size} subscription documents`);

    for (const doc of subsSnap.docs) {
      const data = doc.data();
      if (data.stripePriceId) {
        const mode = data.stripePriceId.includes('test') ? 'TEST' :
                     data.stripePriceId.startsWith('price_') ? 'UNKNOWN' : 'UNKNOWN';
        priceIdsFound.push({
          location: `subscriptions/${doc.id}`,
          priceId: data.stripePriceId,
          mode,
        });
      }
      if (data.priceId) {
        priceIdsFound.push({
          location: `subscriptions/${doc.id} (priceId field)`,
          priceId: data.priceId,
          mode: 'UNKNOWN',
        });
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Check users collection for subscription fields
  console.log('Checking: users collection (subscription fields)...');
  try {
    const usersSnap = await db.collection('users')
      .where('subscription', '!=', null)
      .limit(50)
      .get();
    console.log(`  Found ${usersSnap.size} users with subscription data`);

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.subscription?.stripePriceId) {
        priceIdsFound.push({
          location: `users/${doc.id}.subscription.stripePriceId`,
          priceId: data.subscription.stripePriceId,
          mode: 'UNKNOWN',
        });
      }
      if (data.subscription?.priceId) {
        priceIdsFound.push({
          location: `users/${doc.id}.subscription.priceId`,
          priceId: data.subscription.priceId,
          mode: 'UNKNOWN',
        });
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Check groups collection for subscription fields
  console.log('Checking: groups collection (subscription fields)...');
  try {
    const groupsSnap = await db.collection('groups').limit(50).get();
    console.log(`  Found ${groupsSnap.size} groups`);

    for (const doc of groupsSnap.docs) {
      const data = doc.data();
      if (data.subscription?.stripePriceId) {
        priceIdsFound.push({
          location: `groups/${doc.id}.subscription.stripePriceId`,
          priceId: data.subscription.stripePriceId,
          mode: 'UNKNOWN',
        });
      }
      if (data.stripePriceId) {
        priceIdsFound.push({
          location: `groups/${doc.id}.stripePriceId`,
          priceId: data.stripePriceId,
          mode: 'UNKNOWN',
        });
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Check agencies collection
  console.log('Checking: agencies collection...');
  try {
    const agenciesSnap = await db.collection('agencies').limit(20).get();
    console.log(`  Found ${agenciesSnap.size} agencies`);

    for (const doc of agenciesSnap.docs) {
      const data = doc.data();
      if (data.stripePriceId) {
        priceIdsFound.push({
          location: `agencies/${doc.id}.stripePriceId`,
          priceId: data.stripePriceId,
          mode: 'UNKNOWN',
        });
      }
      if (data.subscription?.stripePriceId) {
        priceIdsFound.push({
          location: `agencies/${doc.id}.subscription.stripePriceId`,
          priceId: data.subscription.stripePriceId,
          mode: 'UNKNOWN',
        });
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Check config/settings collections
  console.log('Checking: config collection...');
  try {
    const configSnap = await db.collection('config').get();
    console.log(`  Found ${configSnap.size} config documents`);

    for (const doc of configSnap.docs) {
      const data = doc.data();
      const dataStr = JSON.stringify(data);
      const matches = dataStr.match(/price_[A-Za-z0-9]+/g);
      if (matches) {
        for (const match of matches) {
          priceIdsFound.push({
            location: `config/${doc.id}`,
            priceId: match,
            mode: 'UNKNOWN',
          });
        }
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Check settings collection
  console.log('Checking: settings collection...');
  try {
    const settingsSnap = await db.collection('settings').get();
    console.log(`  Found ${settingsSnap.size} settings documents`);

    for (const doc of settingsSnap.docs) {
      const data = doc.data();
      const dataStr = JSON.stringify(data);
      const matches = dataStr.match(/price_[A-Za-z0-9]+/g);
      if (matches) {
        for (const match of matches) {
          priceIdsFound.push({
            location: `settings/${doc.id}`,
            priceId: match,
            mode: 'UNKNOWN',
          });
        }
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Print results
  console.log('\n========================================');
  console.log('PRICE IDS FOUND IN FIRESTORE');
  console.log('========================================\n');

  if (priceIdsFound.length === 0) {
    console.log('No price IDs found in Firestore collections.');
  } else {
    console.log('| Location | Price ID | Mode |');
    console.log('|----------|----------|------|');

    // Deduplicate by priceId
    const uniquePriceIds = new Map<string, typeof priceIdsFound[0]>();
    for (const item of priceIdsFound) {
      if (!uniquePriceIds.has(item.priceId)) {
        uniquePriceIds.set(item.priceId, item);
      }
    }

    for (const [priceId, item] of uniquePriceIds) {
      const truncatedLocation = item.location.length > 40
        ? item.location.substring(0, 40) + '...'
        : item.location;
      console.log(`| ${truncatedLocation} | ${priceId} | ${item.mode} |`);
    }

    console.log(`\nTotal unique price IDs: ${uniquePriceIds.size}`);
    console.log(`Total occurrences: ${priceIdsFound.length}`);
  }
}

async function main(): Promise<void> {
  try {
    await checkFirestorePriceIds();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
