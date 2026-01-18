/**
 * Firebase Seeding Script for Test Accounts
 *
 * Creates 77 test accounts as defined in healthguide_refactor_3.md
 *
 * PREREQUISITES:
 * 1. Create a Firebase service account with these roles:
 *    - Firebase Authentication Admin
 *    - Cloud Firestore Admin
 *    - Service Account Token Creator (for custom tokens)
 *
 * 2. Download the JSON key file and either:
 *    - Place it as `firebase-service-account.json` in project root, OR
 *    - Set FIREBASE_ADMIN_CREDENTIALS_JSON env var with the JSON content, OR
 *    - Set GOOGLE_APPLICATION_CREDENTIALS to the file path
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/seedTestAccounts.ts
 *
 * To create a proper service account:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate new private key"
 * 3. Save the file as firebase-service-account.json in project root
 */

import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// ============= Constants =============
const DEFAULT_PASSWORD = 'AbcD12!$';
const TRIAL_DAYS = 45;
const AGENCY_TRIAL_DAYS = 30;

// ============= Types =============
interface SeedUser {
  email: string;
  displayName: string;
  role: 'admin' | 'member' | 'super_admin' | 'caregiver' | 'family_member';
  planType: 'family_a' | 'family_b' | 'multi_agency';
  groupId?: string;
  agencyId?: string;
}

interface SeedElder {
  id: string;
  name: string;
  planType: 'family_a' | 'family_b' | 'multi_agency';
  groupId: string;
  agencyId?: string;
}

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
            // Try vertex-ai-key.json as a fallback
            const vertexPath = path.join(__dirname, '../vertex-ai-key.json');
            if (fs.existsSync(vertexPath)) {
              const credentials = JSON.parse(fs.readFileSync(vertexPath, 'utf8'));
              app = initializeApp({
                credential: cert(credentials),
                projectId: credentials.project_id,
              });
              console.log(`Using vertex-ai-key.json`);
            } else {
              throw new Error(
                'No Firebase credentials found. Set FIREBASE_ADMIN_CREDENTIALS_JSON env var, GOOGLE_APPLICATION_CREDENTIALS, or create firebase-service-account.json'
              );
            }
          }
        }
      }
    }
  }

  db = getFirestore(app);
  auth = getAuth(app);

  console.log('Firebase Admin initialized');
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

async function createAuthUser(email: string, displayName: string): Promise<string> {
  try {
    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log(`  User ${email} already exists, using existing uid: ${existingUser.uid}`);
      return existingUser.uid;
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    // Create new user
    const userRecord = await auth.createUser({
      email,
      password: DEFAULT_PASSWORD,
      displayName,
      emailVerified: true,
    });

    console.log(`  Created auth user: ${email} (${userRecord.uid})`);
    return userRecord.uid;
  } catch (error: any) {
    console.error(`  Error creating auth user ${email}:`, error.message);
    throw error;
  }
}

async function createUserDocument(
  uid: string,
  email: string,
  displayName: string,
  role: string,
  planType: string,
  groupId?: string,
  agencyId?: string,
  agencyRole?: string,
  assignedElderIds?: string[]
): Promise<void> {
  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const trialDays = planType === 'multi_agency' ? AGENCY_TRIAL_DAYS : TRIAL_DAYS;
  const trialEndDate = getTrialEndDate(trialDays);

  // Build groups array for family plans
  const groups: any[] = [];
  if (groupId && planType !== 'multi_agency') {
    groups.push({
      groupId,
      role: role === 'admin' ? 'admin' : 'member',
      permissionLevel: role === 'admin' ? 'admin' : 'read',
      joinedAt: new Date(),
    });
  }

  // Build agencies array for multi-agency
  const agencies: any[] = [];
  if (agencyId && planType === 'multi_agency') {
    agencies.push({
      agencyId,
      role: agencyRole || role,
      joinedAt: new Date(),
      assignedElderIds: assignedElderIds || [],
      assignedGroupIds: groupId ? [groupId] : [],
    });
  }

  const userData = {
    id: uid,
    email,
    phoneNumber: '',
    phoneNumberHash: '',
    emailVerified: true,
    phoneVerified: true,
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    firstName,
    lastName,
    groups,
    agencies,
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
    subscriptionTier: planType === 'family_a' ? 'family' :
                      planType === 'family_b' ? 'single_agency' : 'multi_agency',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    pendingPlanChange: null,
    storageUsed: 0,
    storageLimit: planType === 'family_a' ? 26214400 :      // 25 MB for Family Plan A
                  planType === 'family_b' ? 52428800 :      // 50 MB for Family Plan B
                  524288000,                                 // 500 MB for Multi Agency
    lastPasswordChange: new Date(),
    passwordExpiresAt: getTrialEndDate(75),
    passwordResetRequired: false,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  await db.collection('users').doc(uid).set(userData);
  console.log(`  Created user document for ${email}`);
}

async function createGroup(
  groupId: string,
  name: string,
  adminId: string,
  planType: 'family_a' | 'family_b' | 'multi_agency',
  memberIds: string[],
  agencyId?: string
): Promise<void> {
  const tier = planType === 'family_a' ? 'family' :
               planType === 'family_b' ? 'single_agency' : 'multi_agency';

  const groupData = {
    id: groupId,
    name,
    type: planType === 'multi_agency' ? 'agency' : 'family',
    agencyId: agencyId || null,
    adminId,
    members: [
      {
        userId: adminId,
        role: 'admin',
        permissionLevel: 'admin',
        permissions: ['view_all', 'edit_medications', 'edit_supplements', 'edit_diet', 'log_doses', 'manage_members', 'manage_settings', 'view_insights'],
        addedAt: new Date(),
        addedBy: adminId,
        approvalStatus: 'approved',
      },
      ...memberIds.map(memberId => ({
        userId: memberId,
        role: 'member',
        permissionLevel: 'read',
        permissions: ['view_all', 'view_insights'],
        addedAt: new Date(),
        addedBy: adminId,
        approvalStatus: 'approved',
      })),
    ],
    memberIds: [adminId, ...memberIds],
    writeMemberIds: [adminId],
    elders: [],
    subscription: {
      tier,
      status: 'trial',
      trialEndsAt: getTrialEndDate(planType === 'multi_agency' ? AGENCY_TRIAL_DAYS : TRIAL_DAYS),
      currentPeriodEnd: getTrialEndDate(planType === 'multi_agency' ? AGENCY_TRIAL_DAYS : TRIAL_DAYS),
      stripeCustomerId: '',
      stripeSubscriptionId: '',
    },
    settings: {
      notificationRecipients: [adminId],
      notificationPreferences: {
        enabled: true,
        frequency: 'realtime',
        types: ['missed_doses', 'diet_alerts', 'supplement_alerts'],
      },
    },
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    inviteCodeGeneratedAt: new Date(),
    inviteCodeGeneratedBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('groups').doc(groupId).set(groupData);
  console.log(`  Created group: ${name}`);
}

async function createCaregiverAssignment(
  agencyId: string,
  caregiverId: string,
  elderIds: string[],
  groupId: string,
  superAdminId: string
): Promise<void> {
  const assignmentId = generateId();
  const assignmentData = {
    id: assignmentId,
    agencyId,
    caregiverId,
    elderIds,
    groupId,
    role: 'caregiver',
    assignedAt: new Date(),
    assignedBy: superAdminId,
    permissions: {
      canEditMedications: true,
      canLogDoses: true,
      canViewReports: true,
      canManageSchedules: true,
      canInviteMembers: true,
    },
    active: true,
  };

  await db.collection('caregiver_assignments').doc(assignmentId).set(assignmentData);
  console.log(`  Created caregiver assignment for elderIds: ${elderIds.join(', ')}`);
}

async function createAgency(
  agencyId: string,
  name: string,
  superAdminId: string,
  caregiverIds: string[],
  groupIds: string[]
): Promise<void> {
  const agencyData = {
    id: agencyId,
    name,
    superAdminId,
    type: 'professional',
    groupIds,
    caregiverIds,
    maxEldersPerCaregiver: 3,
    subscription: {
      tier: 'multi_agency',
      status: 'trial',
      trialEndsAt: getTrialEndDate(AGENCY_TRIAL_DAYS),
      currentPeriodEnd: getTrialEndDate(AGENCY_TRIAL_DAYS),
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
    activeElderCount: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('agencies').doc(agencyId).set(agencyData);
  console.log(`  Created agency: ${name}`);
}

async function createElder(
  elderId: string,
  groupId: string,
  name: string,
  caregiverId: string,
  memberIds: string[],
  agencyId?: string
): Promise<void> {
  const elderData = {
    id: elderId,
    groupId,
    name,
    notes: `Test loved one: ${name}`,
    createdAt: new Date(),
    primaryCaregiverId: caregiverId,
    primaryCaregiverAssignedAt: new Date(),
  };

  await db.collection('elders').doc(elderId).set(elderData);

  // Update group with elder reference
  await db.collection('groups').doc(groupId).update({
    elders: FieldValue.arrayUnion({
      id: elderId,
      name,
    }),
  });

  console.log(`  Created elder: ${name}`);
}

// ============= Main Seeding Functions =============

async function seedFamilyPlanA(): Promise<void> {
  console.log('\n=== Seeding Family Plan A ===');

  const groupId = generateId();

  // Create admin
  const adminUid = await createAuthUser('ramanac+a1@gmail.com', 'Family A Admin');
  await createUserDocument(adminUid, 'ramanac+a1@gmail.com', 'Family A Admin', 'admin', 'family_a', groupId);

  // Create member
  const memberUid = await createAuthUser('ramanac+a2@gmail.com', 'Family A Member');
  await createUserDocument(memberUid, 'ramanac+a2@gmail.com', 'Family A Member', 'member', 'family_a', groupId);

  // Create group
  await createGroup(groupId, 'Family A Group', adminUid, 'family_a', [memberUid]);

  // Create elder (loved one)
  const elderId = generateId();
  await createElder(elderId, groupId, 'Loved One A1', adminUid, [memberUid]);

  console.log('Family Plan A seeding complete');
}

async function seedFamilyPlanB(): Promise<void> {
  console.log('\n=== Seeding Family Plan B ===');

  const groupId = generateId();

  // Create admin
  const adminUid = await createAuthUser('ramanac+b1@gmail.com', 'Family B Admin');
  await createUserDocument(adminUid, 'ramanac+b1@gmail.com', 'Family B Admin', 'admin', 'family_b', groupId);

  // Create 3 members
  const memberUids: string[] = [];
  for (let i = 2; i <= 4; i++) {
    const memberUid = await createAuthUser(`ramanac+b${i}@gmail.com`, `Family B Member ${i - 1}`);
    await createUserDocument(memberUid, `ramanac+b${i}@gmail.com`, `Family B Member ${i - 1}`, 'member', 'family_b', groupId);
    memberUids.push(memberUid);
  }

  // Create group
  await createGroup(groupId, 'Family B Group', adminUid, 'family_b', memberUids);

  // Create elder (loved one)
  const elderId = generateId();
  await createElder(elderId, groupId, 'Loved One B1', adminUid, memberUids);

  console.log('Family Plan B seeding complete');
}

async function seedMultiAgency(): Promise<void> {
  console.log('\n=== Seeding Multi-Agency Plan ===');

  const agencyId = generateId();
  const caregiverUids: string[] = [];
  const allGroupIds: string[] = [];
  const allElderIds: string[] = [];

  // Create Agency Owner (Super Admin)
  const ownerUid = await createAuthUser('ramanac+owner@gmail.com', 'Agency Owner');

  // Create 10 Caregivers with 3 elders each (+ 2 members per elder)
  for (let c = 1; c <= 10; c++) {
    console.log(`\n--- Caregiver ${c} ---`);

    const caregiverEmail = `ramanac+c${c}@gmail.com`;
    const caregiverName = `Caregiver ${c}`;
    const caregiverUid = await createAuthUser(caregiverEmail, caregiverName);
    caregiverUids.push(caregiverUid);

    // Create group for this caregiver's elders
    const groupId = generateId();
    allGroupIds.push(groupId);

    const elderIdsForCaregiver: string[] = [];
    const memberUidsForGroup: string[] = [];

    // Create 3 elders per caregiver
    for (let e = 1; e <= 3; e++) {
      const elderId = generateId();
      elderIdsForCaregiver.push(elderId);
      allElderIds.push(elderId);

      // Create 2 members per elder
      const memberUidsForElder: string[] = [];
      for (let m = 1; m <= 2; m++) {
        const memberIdx = (e - 1) * 2 + m;
        const memberEmail = `ramanac+c${c}m${memberIdx}@gmail.com`;
        const memberName = `C${c} Elder${e} Member${m}`;
        const memberUid = await createAuthUser(memberEmail, memberName);

        await createUserDocument(
          memberUid,
          memberEmail,
          memberName,
          'family_member',
          'multi_agency',
          groupId,
          agencyId,
          'family_member',
          [elderId]
        );

        memberUidsForElder.push(memberUid);
        memberUidsForGroup.push(memberUid);
      }

      // Create elder (will be created after group)
    }

    // Create group first
    await createGroup(groupId, `Caregiver ${c} Group`, caregiverUid, 'multi_agency', memberUidsForGroup, agencyId);

    // Now create elders
    for (let e = 1; e <= 3; e++) {
      const elderId = elderIdsForCaregiver[e - 1];
      const elderName = `LO-C${c}-${e}`;
      const memberUidsForElder = memberUidsForGroup.slice((e - 1) * 2, e * 2);
      await createElder(elderId, groupId, elderName, caregiverUid, memberUidsForElder, agencyId);
    }

    // Create caregiver user document
    await createUserDocument(
      caregiverUid,
      caregiverEmail,
      caregiverName,
      'caregiver',
      'multi_agency',
      groupId,
      agencyId,
      'caregiver',
      elderIdsForCaregiver
    );

    // Create caregiver assignment (required for ElderContext to find assigned elders)
    await createCaregiverAssignment(agencyId, caregiverUid, elderIdsForCaregiver, groupId, ownerUid);
  }

  // Create owner user document (after all caregivers so we have all elder IDs)
  await createUserDocument(
    ownerUid,
    'ramanac+owner@gmail.com',
    'Agency Owner',
    'super_admin',
    'multi_agency',
    undefined,
    agencyId,
    'super_admin',
    allElderIds
  );

  // Create agency
  await createAgency(agencyId, 'Test Care Agency', ownerUid, caregiverUids, allGroupIds);

  console.log('\nMulti-Agency Plan seeding complete');
}

// ============= Main Entry Point =============
async function main(): Promise<void> {
  console.log('========================================');
  console.log('MyHealthGuide Test Account Seeding');
  console.log('========================================');
  console.log(`Password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log('');

  try {
    initFirebase();

    // Seed all plans
    await seedFamilyPlanA();
    await seedFamilyPlanB();
    await seedMultiAgency();

    console.log('\n========================================');
    console.log('SEEDING COMPLETE');
    console.log('========================================');
    console.log('');
    console.log('Test Accounts Created:');
    console.log('');
    console.log('Family Plan A (2 users):');
    console.log('  - ramanac+a1@gmail.com (Admin)');
    console.log('  - ramanac+a2@gmail.com (Member)');
    console.log('');
    console.log('Family Plan B (4 users):');
    console.log('  - ramanac+b1@gmail.com (Admin)');
    console.log('  - ramanac+b2@gmail.com (Member 1)');
    console.log('  - ramanac+b3@gmail.com (Member 2)');
    console.log('  - ramanac+b4@gmail.com (Member 3)');
    console.log('');
    console.log('Multi-Agency (71 users):');
    console.log('  - ramanac+owner@gmail.com (Agency Owner)');
    console.log('  - ramanac+c1@gmail.com to ramanac+c10@gmail.com (10 Caregivers)');
    console.log('  - ramanac+c1m1@gmail.com to ramanac+c10m6@gmail.com (60 Members)');
    console.log('');
    console.log('Total: 77 accounts');
    console.log('Password: AbcD1234');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
