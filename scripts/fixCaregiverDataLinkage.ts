/**
 * Fix Caregiver Data Linkage
 *
 * This script fixes the data linkage issue (BUG-003) where:
 * - Seeded caregivers in caregiver_assignments have old/stale UIDs
 * - Shifts created for these caregivers don't appear for logged-in test accounts
 *
 * The fix:
 * 1. Look up current Firebase UIDs for test account emails
 * 2. Update caregiver_assignments with correct UIDs
 * 3. Update scheduledShifts with correct UIDs
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fixCaregiverDataLinkage.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

// Test account emails (caregivers 1-10)
const CAREGIVER_EMAILS = [
  'ramanac+c1@gmail.com',
  'ramanac+c2@gmail.com',
  'ramanac+c3@gmail.com',
  'ramanac+c4@gmail.com',
  'ramanac+c5@gmail.com',
  'ramanac+c6@gmail.com',
  'ramanac+c7@gmail.com',
  'ramanac+c8@gmail.com',
  'ramanac+c9@gmail.com',
  'ramanac+c10@gmail.com',
];

interface EmailToUid {
  email: string;
  uid: string;
  displayName: string;
}

async function main() {
  console.log('========================================');
  console.log('Fix Caregiver Data Linkage (BUG-003)');
  console.log('========================================\n');

  try {
    // Step 1: Get current UIDs for all caregiver emails
    console.log('Step 1: Looking up current Firebase UIDs...\n');
    const emailToUidMap = new Map<string, EmailToUid>();

    for (const email of CAREGIVER_EMAILS) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        emailToUidMap.set(email, {
          email,
          uid: userRecord.uid,
          displayName: userRecord.displayName || email
        });
        console.log(`  ✓ ${email} -> ${userRecord.uid}`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          console.log(`  ✗ ${email} - User not found`);
        } else {
          console.log(`  ✗ ${email} - Error: ${err.message}`);
        }
      }
    }

    console.log(`\nFound ${emailToUidMap.size} valid caregiver accounts.\n`);

    if (emailToUidMap.size === 0) {
      console.log('No caregiver accounts found. Exiting.');
      return;
    }

    // Step 2: Get all caregiver_assignments and check for mismatches
    console.log('Step 2: Checking caregiver_assignments for mismatches...\n');

    const assignmentsSnapshot = await db.collection('caregiver_assignments').get();
    let assignmentsFixed = 0;

    for (const doc of assignmentsSnapshot.docs) {
      const data = doc.data();
      const currentCaregiverId = data.caregiverId;

      // Look for a matching user document with this caregiverId
      const userDoc = await db.collection('users').doc(currentCaregiverId).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const userEmail = userData?.email;

        // Check if this email is in our test accounts
        if (userEmail && emailToUidMap.has(userEmail)) {
          const correctUid = emailToUidMap.get(userEmail)!.uid;

          if (currentCaregiverId !== correctUid) {
            console.log(`  Assignment ${doc.id}:`);
            console.log(`    Email: ${userEmail}`);
            console.log(`    Current UID: ${currentCaregiverId}`);
            console.log(`    Correct UID: ${correctUid}`);
            console.log(`    -> Updating...`);

            await db.collection('caregiver_assignments').doc(doc.id).update({
              caregiverId: correctUid,
              updatedAt: Timestamp.now()
            });

            assignmentsFixed++;
            console.log(`    ✓ Fixed!\n`);
          }
        }
      } else {
        // User document doesn't exist - check if caregiverId looks like a name instead of UID
        if (currentCaregiverId && !currentCaregiverId.match(/^[a-zA-Z0-9]{20,}$/)) {
          console.log(`  Assignment ${doc.id} has invalid caregiverId: "${currentCaregiverId}"`);
          console.log(`    -> This may be a display name instead of UID. Manual fix required.`);
        }
      }
    }

    console.log(`Fixed ${assignmentsFixed} caregiver_assignments.\n`);

    // Step 3: Fix scheduledShifts with mismatched caregiverIds
    console.log('Step 3: Checking scheduledShifts for mismatches...\n');

    const shiftsSnapshot = await db.collection('scheduledShifts').get();
    let shiftsFixed = 0;

    for (const doc of shiftsSnapshot.docs) {
      const data = doc.data();
      const currentCaregiverId = data.caregiverId;
      const caregiverName = data.caregiverName;

      // Check if caregiverId is actually a name (like "Caregiver 1")
      if (currentCaregiverId && !currentCaregiverId.match(/^[a-zA-Z0-9]{20,}$/)) {
        // This looks like a name, not a UID
        // Try to find the correct UID based on the caregiverName
        const match = caregiverName?.match(/Caregiver (\d+)/);
        if (match) {
          const caregiverNum = parseInt(match[1]);
          if (caregiverNum >= 1 && caregiverNum <= 10) {
            const email = `ramanac+c${caregiverNum}@gmail.com`;
            const uidInfo = emailToUidMap.get(email);

            if (uidInfo) {
              console.log(`  Shift ${doc.id}:`);
              console.log(`    Current caregiverId: "${currentCaregiverId}" (looks like name)`);
              console.log(`    Caregiver name: ${caregiverName}`);
              console.log(`    Correct UID: ${uidInfo.uid}`);
              console.log(`    -> Updating...`);

              await db.collection('scheduledShifts').doc(doc.id).update({
                caregiverId: uidInfo.uid,
                updatedAt: Timestamp.now()
              });

              shiftsFixed++;
              console.log(`    ✓ Fixed!\n`);
            }
          }
        }
      } else {
        // caregiverId looks like a UID, check if it matches the user document
        if (currentCaregiverId) {
          const userDoc = await db.collection('users').doc(currentCaregiverId).get();

          if (!userDoc.exists) {
            // UID doesn't exist in users collection - try to fix based on name
            const match = caregiverName?.match(/Caregiver (\d+)/);
            if (match) {
              const caregiverNum = parseInt(match[1]);
              if (caregiverNum >= 1 && caregiverNum <= 10) {
                const email = `ramanac+c${caregiverNum}@gmail.com`;
                const uidInfo = emailToUidMap.get(email);

                if (uidInfo && uidInfo.uid !== currentCaregiverId) {
                  console.log(`  Shift ${doc.id}:`);
                  console.log(`    Current caregiverId: ${currentCaregiverId} (user not found)`);
                  console.log(`    Caregiver name: ${caregiverName}`);
                  console.log(`    Correct UID: ${uidInfo.uid}`);
                  console.log(`    -> Updating...`);

                  await db.collection('scheduledShifts').doc(doc.id).update({
                    caregiverId: uidInfo.uid,
                    updatedAt: Timestamp.now()
                  });

                  shiftsFixed++;
                  console.log(`    ✓ Fixed!\n`);
                }
              }
            }
          }
        }
      }
    }

    console.log(`Fixed ${shiftsFixed} scheduledShifts.\n`);

    // Step 4: Fix shiftSessions as well
    console.log('Step 4: Checking shiftSessions for mismatches...\n');

    const sessionsSnapshot = await db.collection('shiftSessions').get();
    let sessionsFixed = 0;

    for (const doc of sessionsSnapshot.docs) {
      const data = doc.data();
      const currentCaregiverId = data.caregiverId;

      // Check if caregiverId looks like a name
      if (currentCaregiverId && !currentCaregiverId.match(/^[a-zA-Z0-9]{20,}$/)) {
        const match = currentCaregiverId.match(/Caregiver (\d+)/i);
        if (match) {
          const caregiverNum = parseInt(match[1]);
          if (caregiverNum >= 1 && caregiverNum <= 10) {
            const email = `ramanac+c${caregiverNum}@gmail.com`;
            const uidInfo = emailToUidMap.get(email);

            if (uidInfo) {
              console.log(`  Session ${doc.id}:`);
              console.log(`    Current caregiverId: "${currentCaregiverId}"`);
              console.log(`    Correct UID: ${uidInfo.uid}`);

              await db.collection('shiftSessions').doc(doc.id).update({
                caregiverId: uidInfo.uid,
                updatedAt: Timestamp.now()
              });

              sessionsFixed++;
              console.log(`    ✓ Fixed!\n`);
            }
          }
        }
      }
    }

    console.log(`Fixed ${sessionsFixed} shiftSessions.\n`);

    // Summary
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Caregiver accounts found: ${emailToUidMap.size}`);
    console.log(`Assignments fixed: ${assignmentsFixed}`);
    console.log(`Scheduled shifts fixed: ${shiftsFixed}`);
    console.log(`Shift sessions fixed: ${sessionsFixed}`);
    console.log('========================================');
    console.log('\nData linkage fix complete!');

  } catch (error) {
    console.error('Error during fix:', error);
    process.exit(1);
  }
}

main();
