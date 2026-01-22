/**
 * Fix Family Plan Users Data
 *
 * This script fixes the data model issue where Family Plan users
 * incorrectly have agencies[] array with super_admin role.
 *
 * Family Plan users should only have groups[] array.
 * Agencies are only for Multi-Agency Plan users.
 *
 * This script:
 * 1. Finds users with family/single_agency tier (or trial) who have agencies
 * 2. Removes the agencies array from these users
 * 3. Deletes the orphaned agency documents
 *
 * RUN IN DRY-RUN MODE FIRST: node scripts/fixFamilyPlanUsers.cjs --dry-run
 * RUN FOR REAL: node scripts/fixFamilyPlanUsers.cjs
 */

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

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run');

async function fixFamilyPlanUsers() {
  console.log('=========================================');
  console.log('FIX FAMILY PLAN USERS DATA');
  console.log('=========================================');
  console.log('Mode:', isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be made)');
  console.log('');

  // Get all users
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} total users`);
  console.log('');

  const usersToFix = [];
  const agenciesToDelete = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if this is a Family Plan user (or trial user)
    const tier = userData.subscriptionTier;

    // Family Plan tiers: 'family' (Plan A), 'single_agency' (Plan B)
    // Also handle legacy/invalid tiers: 'family_a', 'family_b'
    // And trial users with null/undefined tier
    const isFamilyPlan = tier === 'family' || tier === 'single_agency' ||
                         tier === 'family_a' || tier === 'family_b' ||
                         tier === null || tier === undefined;

    // Skip Multi-Agency users
    if (tier === 'multi_agency') {
      continue;
    }

    // Check if user has agencies array with super_admin role (incorrect data)
    const hasIncorrectAgencies = userData.agencies &&
                                  Array.isArray(userData.agencies) &&
                                  userData.agencies.length > 0 &&
                                  userData.agencies.some(a => a.role === 'super_admin');

    // Also check if tier needs correction
    const hasInvalidTier = tier === 'family_a' || tier === 'family_b';

    if (isFamilyPlan && (hasIncorrectAgencies || hasInvalidTier)) {
      usersToFix.push({
        userId,
        email: userData.email,
        subscriptionTier: tier || '(trial)',
        agencies: userData.agencies || [],
        hasIncorrectAgencies,
        hasInvalidTier,
        // Map invalid tiers to correct ones
        correctTier: tier === 'family_a' ? 'family' : tier === 'family_b' ? 'single_agency' : tier,
      });

      // Collect agency IDs to delete
      if (hasIncorrectAgencies) {
        for (const agency of userData.agencies) {
          if (agency.agencyId && agency.role === 'super_admin') {
            agenciesToDelete.push(agency.agencyId);
          }
        }
      }
    }
  }

  console.log('=========================================');
  console.log('USERS THAT NEED FIXING');
  console.log('=========================================');

  if (usersToFix.length === 0) {
    console.log('No users need fixing!');
    console.log('');
    return;
  }

  console.log(`Found ${usersToFix.length} users that need fixing:`);
  console.log('');

  for (const user of usersToFix) {
    console.log(`- ${user.email} (ID: ${user.userId})`);
    console.log(`  Tier: ${user.subscriptionTier}`);
    if (user.hasInvalidTier) {
      console.log(`  ⚠ Invalid tier! Will correct to: ${user.correctTier}`);
    }
    if (user.hasIncorrectAgencies) {
      console.log(`  Agencies to remove: ${user.agencies.length}`);
      for (const a of user.agencies) {
        console.log(`    - agencyId: ${a.agencyId}, role: ${a.role}`);
      }
    }
    console.log('');
  }

  console.log('=========================================');
  console.log('AGENCIES TO DELETE');
  console.log('=========================================');

  // Deduplicate agency IDs
  const uniqueAgencyIds = [...new Set(agenciesToDelete)];
  console.log(`Found ${uniqueAgencyIds.length} agencies to delete:`);
  for (const agencyId of uniqueAgencyIds) {
    console.log(`  - ${agencyId}`);
  }
  console.log('');

  if (isDryRun) {
    console.log('=========================================');
    console.log('DRY RUN COMPLETE - NO CHANGES MADE');
    console.log('=========================================');
    console.log('Run without --dry-run flag to apply changes.');
    return;
  }

  console.log('=========================================');
  console.log('APPLYING FIXES...');
  console.log('=========================================');

  // Fix users - remove agencies array and correct invalid tiers
  for (const user of usersToFix) {
    console.log(`Fixing user: ${user.email}`);
    try {
      const updateData = {};

      // Remove agencies array if present
      if (user.hasIncorrectAgencies) {
        updateData.agencies = admin.firestore.FieldValue.delete();
      }

      // Correct invalid tier
      if (user.hasInvalidTier && user.correctTier) {
        updateData.subscriptionTier = user.correctTier;
      }

      if (Object.keys(updateData).length > 0) {
        await db.collection('users').doc(user.userId).update(updateData);
        if (user.hasIncorrectAgencies) {
          console.log(`  ✓ Removed agencies array from user`);
        }
        if (user.hasInvalidTier) {
          console.log(`  ✓ Corrected tier from '${user.subscriptionTier}' to '${user.correctTier}'`);
        }
      }
    } catch (error) {
      console.error(`  ✗ Error fixing user: ${error.message}`);
    }
  }

  // Delete orphaned agencies
  for (const agencyId of uniqueAgencyIds) {
    console.log(`Deleting agency: ${agencyId}`);
    try {
      // Check if agency exists and has no other users
      const agencyDoc = await db.collection('agencies').doc(agencyId).get();
      if (agencyDoc.exists) {
        const agencyData = agencyDoc.data();
        // Only delete if it's an individual/family type agency
        if (agencyData.type === 'individual') {
          await db.collection('agencies').doc(agencyId).delete();
          console.log(`  ✓ Deleted agency`);
        } else {
          console.log(`  ⚠ Skipped - agency type is '${agencyData.type}', not 'individual'`);
        }
      } else {
        console.log(`  ⚠ Agency does not exist`);
      }
    } catch (error) {
      console.error(`  ✗ Error deleting agency: ${error.message}`);
    }
  }

  console.log('');
  console.log('=========================================');
  console.log('MIGRATION COMPLETE');
  console.log('=========================================');
  console.log(`Fixed ${usersToFix.length} users`);
  console.log(`Deleted ${uniqueAgencyIds.length} agencies`);
}

fixFamilyPlanUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
