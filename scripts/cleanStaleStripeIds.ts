/**
 * Clean Stale Test-Mode Stripe IDs from Firestore
 *
 * Problem: Test accounts have stripeSubscriptionId and stripeCustomerId
 * from Stripe TEST mode, but the app now uses LIVE mode keys.
 * This causes "No such subscription/customer" errors.
 *
 * What this script does:
 * - Finds all users with stripeSubscriptionId or stripeCustomerId set
 * - Skips users with LIVE subscriptions (ramanac@gmail.com has a real purchase)
 * - Clears stale test-mode fields while preserving trial status/tier
 *
 * Usage: npx tsx scripts/cleanStaleStripeIds.ts [--dry-run]
 *   --dry-run: Only show what would be changed, don't modify anything
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

// Known live subscription - DO NOT clear
// ramanac@gmail.com made a real purchase on Family Plan A
const LIVE_SUBSCRIPTION_EMAILS = [
  'ramanac@gmail.com',
];

interface CleanupResult {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
  subscriptionTier: string;
  action: 'cleared' | 'skipped_live' | 'dry-run';
}

async function cleanStaleStripeIds(dryRun: boolean): Promise<void> {
  console.log('===========================================');
  console.log('CLEAN STALE TEST-MODE STRIPE IDs');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}`);
  console.log('===========================================\n');

  const results: CleanupResult[] = [];

  // Find all users with stripeSubscriptionId set
  const usersWithSubId = await db.collection('users')
    .where('stripeSubscriptionId', '!=', null)
    .get();

  // Also find users with stripeCustomerId set (might not have subscription ID)
  const usersWithCustId = await db.collection('users')
    .where('stripeCustomerId', '!=', null)
    .get();

  // Merge unique users
  const userMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  for (const doc of usersWithSubId.docs) {
    userMap.set(doc.id, doc);
  }
  for (const doc of usersWithCustId.docs) {
    if (!userMap.has(doc.id)) {
      userMap.set(doc.id, doc);
    }
  }

  console.log(`Found ${userMap.size} users with Stripe IDs\n`);

  for (const [userId, doc] of userMap) {
    const userData = doc.data()!;
    const email = userData.email || '(no email)';
    const stripeCustomerId = userData.stripeCustomerId || null;
    const stripeSubscriptionId = userData.stripeSubscriptionId || null;
    const subscriptionStatus = userData.subscriptionStatus || '(not set)';
    const subscriptionTier = userData.subscriptionTier || '(not set)';

    console.log(`--- User: ${email} (${userId}) ---`);
    console.log(`  stripeCustomerId: ${stripeCustomerId}`);
    console.log(`  stripeSubscriptionId: ${stripeSubscriptionId}`);
    console.log(`  subscriptionStatus: ${subscriptionStatus}`);
    console.log(`  subscriptionTier: ${subscriptionTier}`);

    // Skip users with known live subscriptions
    if (LIVE_SUBSCRIPTION_EMAILS.includes(email.toLowerCase())) {
      console.log(`  ACTION: SKIPPED - live subscription (protected)\n`);
      results.push({
        userId, email, stripeCustomerId, stripeSubscriptionId,
        subscriptionStatus, subscriptionTier, action: 'skipped_live',
      });
      continue;
    }

    if (!dryRun) {
      const updateData: Record<string, any> = {
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (stripeSubscriptionId) {
        updateData.stripeSubscriptionId = admin.firestore.FieldValue.delete();
      }
      if (stripeCustomerId) {
        updateData.stripeCustomerId = admin.firestore.FieldValue.delete();
      }
      // Also clear subscription start date and period end since those came from Stripe
      if (userData.subscriptionStartDate) {
        updateData.subscriptionStartDate = admin.firestore.FieldValue.delete();
      }
      if (userData.currentPeriodEnd) {
        updateData.currentPeriodEnd = admin.firestore.FieldValue.delete();
      }
      // Clear cancel flags that reference Stripe subscription
      if (userData.cancelAtPeriodEnd) {
        updateData.cancelAtPeriodEnd = false;
      }
      if (userData.pendingPlanChange) {
        updateData.pendingPlanChange = null;
      }

      await db.collection('users').doc(userId).update(updateData);
      console.log(`  ACTION: Cleared stale Stripe fields`);

      results.push({
        userId, email, stripeCustomerId, stripeSubscriptionId,
        subscriptionStatus, subscriptionTier, action: 'cleared',
      });
    } else {
      console.log(`  ACTION: Would clear stale Stripe fields (dry run)`);
      results.push({
        userId, email, stripeCustomerId, stripeSubscriptionId,
        subscriptionStatus, subscriptionTier, action: 'dry-run',
      });
    }
    console.log('');
  }

  // Summary
  console.log('===========================================');
  console.log('SUMMARY');
  console.log('===========================================');
  console.log(`Total users found: ${results.length}`);
  console.log(`Cleared: ${results.filter(r => r.action === 'cleared').length}`);
  console.log(`Skipped (live): ${results.filter(r => r.action === 'skipped_live').length}`);
  console.log(`Dry run: ${results.filter(r => r.action === 'dry-run').length}`);

  if (dryRun) {
    console.log('\nThis was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  try {
    await cleanStaleStripeIds(dryRun);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
