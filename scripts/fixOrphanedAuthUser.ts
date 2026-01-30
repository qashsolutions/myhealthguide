/**
 * Fix Orphaned Auth User Script
 *
 * Creates a Firestore user document for an existing Firebase Auth user
 * who is missing their Firestore document.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/fixOrphanedAuthUser.ts <email>
 *
 * Example:
 *   npx ts-node --project tsconfig.scripts.json scripts/fixOrphanedAuthUser.ts mjalan@gmail.com
 *
 * PREREQUISITES:
 * 1. Firebase service account key at scripts/serviceAccountKey.json
 *    OR set FIREBASE_ADMIN_CREDENTIALS_JSON env var
 *    OR set GOOGLE_APPLICATION_CREDENTIALS to the file path
 */

import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// ============= Constants =============
// Mirrored from src/lib/subscription/subscriptionService.ts (scripts can't use path aliases)
const TRIAL_DAYS = 45; // TRIAL_DURATION_DAYS

// ============= Initialize Firebase Admin =============
let app: App;
let db: Firestore;
let auth: Auth;

function initFirebase() {
  const path = require('path');
  const fs = require('fs');

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    // Check for credentials JSON from environment (inline JSON)
    const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON;

    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);
      app = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id,
      });
      console.log('Using FIREBASE_ADMIN_CREDENTIALS_JSON env var');
    } else {
      // Try GOOGLE_APPLICATION_CREDENTIALS file path
      const googleCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (googleCredPath && fs.existsSync(googleCredPath)) {
        const credentials = JSON.parse(fs.readFileSync(googleCredPath, 'utf8'));
        app = initializeApp({
          credential: cert(credentials),
          projectId: credentials.project_id,
        });
        console.log(`Using GOOGLE_APPLICATION_CREDENTIALS: ${googleCredPath}`);
      } else {
        // Try to read from scripts/serviceAccountKey.json first
        const scriptsCredPath = path.join(__dirname, 'serviceAccountKey.json');
        if (fs.existsSync(scriptsCredPath)) {
          const credentials = JSON.parse(fs.readFileSync(scriptsCredPath, 'utf8'));
          app = initializeApp({
            credential: cert(credentials),
            projectId: credentials.project_id,
          });
          console.log(`Using scripts/serviceAccountKey.json`);
        } else {
          // Try to read from local firebase-service-account.json
          const credPath = path.join(__dirname, '../firebase-service-account.json');

          if (fs.existsSync(credPath)) {
            const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
            app = initializeApp({
              credential: cert(credentials),
              projectId: credentials.project_id,
            });
            console.log(`Using firebase-service-account.json`);
          } else {
            throw new Error(
              'No Firebase credentials found. Set FIREBASE_ADMIN_CREDENTIALS_JSON env var, GOOGLE_APPLICATION_CREDENTIALS, or create scripts/serviceAccountKey.json'
            );
          }
        }
      }
    }
  }

  db = getFirestore(app);
  auth = getAuth(app);

  console.log('Firebase Admin initialized\n');
}

// ============= Helper Functions =============
function generateId(): string {
  return db.collection('_').doc().id;
}

function getTrialEndDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function createUserDocument(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  const nameParts = displayName ? displayName.split(' ') : ['User'];
  const firstName = nameParts[0] || 'User';
  const lastName = nameParts.slice(1).join(' ') || '';

  const trialEndDate = getTrialEndDate(TRIAL_DAYS);
  const passwordExpiry = getTrialEndDate(75); // 75 days for HIPAA compliance

  const userData = {
    id: uid,
    email,
    phoneNumber: '',
    phoneNumberHash: '',
    emailVerified: true, // Assume verified since they can reset password
    phoneVerified: false,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    firstName,
    lastName,
    groups: [],
    agencies: [],
    preferences: {
      theme: 'light',
      notifications: {
        sms: true,
        email: true,
      },
    },
    trialStartDate: new Date(),
    trialEndDate,
    gracePeriodStartDate: null,
    gracePeriodEndDate: null,
    dataExportRequested: false,
    subscriptionStatus: 'trial',
    subscriptionTier: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    pendingPlanChange: null,
    storageUsed: 0,
    storageLimit: 25 * 1024 * 1024, // 25 MB for trial
    lastPasswordChange: new Date(),
    passwordExpiresAt: passwordExpiry,
    passwordResetRequired: false,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  await db.collection('users').doc(uid).set(userData);
  console.log(`  ✅ Created user document for ${email}`);
}

async function createGroupForUser(
  uid: string,
  firstName: string
): Promise<string> {
  const groupId = generateId();
  const trialEndDate = getTrialEndDate(TRIAL_DAYS);

  const groupData = {
    id: groupId,
    name: `${firstName}'s Family`,
    type: 'family',
    agencyId: null,
    adminId: uid,
    members: [
      {
        userId: uid,
        role: 'admin',
        permissionLevel: 'admin',
        permissions: ['view_all', 'edit_medications', 'edit_supplements', 'edit_diet', 'log_doses', 'manage_members', 'manage_settings', 'view_insights'],
        addedAt: new Date(),
        addedBy: uid,
        approvalStatus: 'approved',
      },
    ],
    memberIds: [uid],
    writeMemberIds: [uid],
    elders: [],
    subscription: {
      tier: 'family',
      status: 'trial',
      trialEndsAt: trialEndDate,
      currentPeriodEnd: trialEndDate,
      stripeCustomerId: '',
      stripeSubscriptionId: '',
    },
    settings: {
      notificationRecipients: [uid],
      notificationPreferences: {
        enabled: true,
        frequency: 'realtime',
        types: ['missed_doses', 'diet_alerts', 'supplement_alerts'],
      },
    },
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    inviteCodeGeneratedAt: new Date(),
    inviteCodeGeneratedBy: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('groups').doc(groupId).set(groupData);
  console.log(`  ✅ Created group: ${firstName}'s Family`);
  return groupId;
}

async function createAgencyForUser(
  uid: string,
  firstName: string,
  groupId: string
): Promise<string> {
  const agencyId = generateId();
  const trialEndDate = getTrialEndDate(TRIAL_DAYS);

  const agencyData = {
    id: agencyId,
    name: `${firstName}'s Family`,
    superAdminId: uid,
    type: 'individual',
    groupIds: [groupId],
    caregiverIds: [uid],
    maxEldersPerCaregiver: 3,
    subscription: {
      tier: 'family',
      status: 'trial',
      trialEndsAt: trialEndDate,
      currentPeriodEnd: trialEndDate,
      stripeCustomerId: '',
      stripeSubscriptionId: '',
    },
    settings: {
      notificationPreferences: {
        enabled: true,
        frequency: 'realtime',
        types: ['missed_doses', 'diet_alerts', 'supplement_alerts'],
      },
    },
    activeElderCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('agencies').doc(agencyId).set(agencyData);
  console.log(`  ✅ Created agency: ${firstName}'s Family`);
  return agencyId;
}

async function updateUserWithGroupAndAgency(
  uid: string,
  groupId: string,
  agencyId: string
): Promise<void> {
  await db.collection('users').doc(uid).update({
    groups: [{
      groupId,
      role: 'admin',
      permissionLevel: 'admin',
      joinedAt: new Date(),
    }],
    agencies: [{
      agencyId,
      role: 'super_admin',
      joinedAt: new Date(),
    }],
  });
  console.log(`  ✅ Updated user with group and agency memberships`);
}

async function updateGroupWithAgency(
  groupId: string,
  agencyId: string
): Promise<void> {
  await db.collection('groups').doc(groupId).update({
    agencyId,
  });
  console.log(`  ✅ Updated group with agency ID`);
}

// ============= Main Function =============
async function fixOrphanedUser(email: string): Promise<void> {
  console.log('========================================');
  console.log('Fix Orphaned Auth User');
  console.log('========================================\n');

  // Step 1: Look up the Firebase Auth user
  console.log(`Looking up Firebase Auth user: ${email}`);
  let authUser;
  try {
    authUser = await auth.getUserByEmail(email);
    console.log(`  ✅ Found Auth user: ${authUser.uid}`);
    console.log(`  Display name: ${authUser.displayName || '(not set)'}`);
    console.log(`  Email verified: ${authUser.emailVerified}`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`  ❌ No Firebase Auth user found with email: ${email}`);
      console.error('  This user needs to sign up first.');
      process.exit(1);
    }
    throw error;
  }

  // Step 2: Check if Firestore document exists
  console.log(`\nChecking Firestore document...`);
  const userDoc = await db.collection('users').doc(authUser.uid).get();
  if (userDoc.exists) {
    console.log(`  ⚠️  User document already exists!`);
    console.log(`  If user is still having issues, there may be another problem.`);
    console.log(`  Existing document data:`);
    const data = userDoc.data();
    console.log(`    - Email: ${data?.email}`);
    console.log(`    - Subscription Status: ${data?.subscriptionStatus}`);
    console.log(`    - Groups: ${data?.groups?.length || 0}`);
    console.log(`    - Agencies: ${data?.agencies?.length || 0}`);
    process.exit(0);
  }

  console.log(`  ❌ No Firestore document found - this is the problem!`);

  // Step 3: Create Firestore document
  console.log(`\nCreating Firestore document...`);
  const displayName = authUser.displayName || email.split('@')[0];
  const firstName = displayName.split(' ')[0];

  await createUserDocument(authUser.uid, email, displayName);

  // Step 4: Create group
  console.log(`\nCreating group...`);
  const groupId = await createGroupForUser(authUser.uid, firstName);

  // Step 5: Create agency
  console.log(`\nCreating agency...`);
  const agencyId = await createAgencyForUser(authUser.uid, firstName, groupId);

  // Step 6: Update group with agency ID
  console.log(`\nLinking group to agency...`);
  await updateGroupWithAgency(groupId, agencyId);

  // Step 7: Update user with group and agency memberships
  console.log(`\nUpdating user memberships...`);
  await updateUserWithGroupAndAgency(authUser.uid, groupId, agencyId);

  console.log('\n========================================');
  console.log('SUCCESS!');
  console.log('========================================');
  console.log(`\nUser ${email} has been fixed!`);
  console.log('They can now sign in and will have:');
  console.log('  - 45-day free trial');
  console.log('  - Their own family group');
  console.log('  - Admin permissions');
  console.log('\nThey should sign in again at https://www.myguide.health/login');
}

// ============= CLI Entry Point =============
async function main(): Promise<void> {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx ts-node --project tsconfig.scripts.json scripts/fixOrphanedAuthUser.ts <email>');
    console.error('Example: npx ts-node --project tsconfig.scripts.json scripts/fixOrphanedAuthUser.ts mjalan@gmail.com');
    process.exit(1);
  }

  // Validate email format
  if (!email.includes('@')) {
    console.error('Invalid email format');
    process.exit(1);
  }

  try {
    initFirebase();
    await fixOrphanedUser(email);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
