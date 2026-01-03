/**
 * Firestore Security Rules Tests
 *
 * Tests the Firestore security rules against the local emulator.
 * Covers key scenarios:
 * - Authenticated user can read/write their own data
 * - User cannot access another user's data
 * - Group member access permissions
 * - Caregiver access to patient data
 * - Agency/Super Admin access
 * - Unauthenticated access is denied
 *
 * Run with: npm test -- --testPathPattern=firestore.rules
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
  RulesTestContext,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

// Test constants
const PROJECT_ID = 'healthweb-test';
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');

// Test user IDs
const USER_A_ID = 'user-a-123';
const USER_B_ID = 'user-b-456';
const ADMIN_USER_ID = 'admin-user-789';
const CAREGIVER_USER_ID = 'caregiver-user-101';
const SUPER_ADMIN_ID = 'super-admin-202';

// Test document IDs
const GROUP_ID = 'test-group-001';
const ELDER_ID = 'test-elder-001';
const MEDICATION_ID = 'test-medication-001';
const AGENCY_ID = 'test-agency-001';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    // Read the rules file
    const rules = fs.readFileSync(RULES_PATH, 'utf8');

    // Initialize test environment with emulator
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Helper to get authenticated context with sign-in provider token
  function getAuthenticatedContext(
    uid: string,
    additionalClaims: Record<string, unknown> = {}
  ): RulesTestContext {
    return testEnv.authenticatedContext(uid, {
      firebase: {
        sign_in_provider: 'password',
      },
      ...additionalClaims,
    });
  }

  // Helper to set up test data using admin context
  async function setupTestData() {
    const adminDb = testEnv.unauthenticatedContext().firestore();

    // Bypass security rules for setup using admin operations
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // Create User A with active trial
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      await db.doc(`users/${USER_A_ID}`).set({
        id: USER_A_ID,
        email: 'user-a@test.com',
        subscriptionStatus: 'trial',
        trialEndDate: trialEndDate,
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date(),
      });

      // Create User B with active subscription
      await db.doc(`users/${USER_B_ID}`).set({
        id: USER_B_ID,
        email: 'user-b@test.com',
        subscriptionStatus: 'active',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
      });

      // Create Admin User (group admin) with active subscription
      await db.doc(`users/${ADMIN_USER_ID}`).set({
        id: ADMIN_USER_ID,
        email: 'admin@test.com',
        subscriptionStatus: 'active',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date(),
      });

      // Create Caregiver User (agency member)
      await db.doc(`users/${CAREGIVER_USER_ID}`).set({
        id: CAREGIVER_USER_ID,
        email: 'caregiver@test.com',
        subscriptionStatus: 'trial',
        trialEndDate: trialEndDate,
        agencies: [{ agencyId: AGENCY_ID, role: 'caregiver' }],
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
      });

      // Create Super Admin User
      await db.doc(`users/${SUPER_ADMIN_ID}`).set({
        id: SUPER_ADMIN_ID,
        email: 'superadmin@test.com',
        subscriptionStatus: 'active',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date(),
      });

      // Create Group with admin and members
      await db.doc(`groups/${GROUP_ID}`).set({
        id: GROUP_ID,
        name: 'Test Family Group',
        adminId: ADMIN_USER_ID,
        memberIds: [ADMIN_USER_ID, USER_A_ID],
        writeMemberIds: [ADMIN_USER_ID],
        createdAt: new Date(),
      });

      // Create Elder
      await db.doc(`elders/${ELDER_ID}`).set({
        id: ELDER_ID,
        name: 'Test Elder',
        groupId: GROUP_ID,
        createdAt: new Date(),
      });

      // Create Medication
      await db.doc(`medications/${MEDICATION_ID}`).set({
        id: MEDICATION_ID,
        name: 'Test Medication',
        groupId: GROUP_ID,
        elderId: ELDER_ID,
        createdAt: new Date(),
      });

      // Create Agency
      await db.doc(`agencies/${AGENCY_ID}`).set({
        id: AGENCY_ID,
        name: 'Test Care Agency',
        superAdminId: SUPER_ADMIN_ID,
        caregiverIds: [CAREGIVER_USER_ID],
        groupIds: [GROUP_ID],
        createdAt: new Date(),
      });

      // Create Caregiver Elder Access (for assigned elder access)
      await db.doc(`users/${CAREGIVER_USER_ID}/elder_access/${ELDER_ID}`).set({
        elderId: ELDER_ID,
        groupId: GROUP_ID,
        assignedAt: new Date(),
      });

      // Create Caregiver Group Access
      await db.doc(`users/${CAREGIVER_USER_ID}/group_access/${GROUP_ID}`).set({
        groupId: GROUP_ID,
        assignedAt: new Date(),
      });
    });
  }

  // ========== USERS COLLECTION TESTS ==========

  describe('Users Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('authenticated user can read their own profile', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(db.doc(`users/${USER_A_ID}`).get());
    });

    test('authenticated user CANNOT read another user profile', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(db.doc(`users/${USER_B_ID}`).get());
    });

    test('unauthenticated user CANNOT read any user profile', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc(`users/${USER_A_ID}`).get());
    });

    test('user can update their own profile (non-protected fields)', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc(`users/${USER_A_ID}`).update({
          displayName: 'Updated Name',
        })
      );
    });

    test('user CANNOT update protected fields (subscriptionStatus)', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(
        db.doc(`users/${USER_A_ID}`).update({
          subscriptionStatus: 'active',
        })
      );
    });

    test('user CANNOT update another user profile', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(
        db.doc(`users/${USER_B_ID}`).update({
          displayName: 'Hacked Name',
        })
      );
    });

    test('user can update ONLY verification fields during verification', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc(`users/${USER_A_ID}`).update({
          emailVerified: true,
          emailVerifiedAt: new Date(),
        })
      );
    });

    test('user can delete their own account (GDPR)', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(db.doc(`users/${USER_A_ID}`).delete());
    });

    test('user CANNOT delete another user account', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(db.doc(`users/${USER_B_ID}`).delete());
    });
  });

  // ========== GROUPS COLLECTION TESTS ==========

  describe('Groups Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('group admin can read their group', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc(`groups/${GROUP_ID}`).get());
    });

    test('group member can read their group', async () => {
      const memberContext = getAuthenticatedContext(USER_A_ID);
      const db = memberContext.firestore();

      await assertSucceeds(db.doc(`groups/${GROUP_ID}`).get());
    });

    test('non-member CANNOT read group', async () => {
      const nonMemberContext = getAuthenticatedContext(USER_B_ID);
      const db = nonMemberContext.firestore();

      await assertFails(db.doc(`groups/${GROUP_ID}`).get());
    });

    test('group admin can update group', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(
        db.doc(`groups/${GROUP_ID}`).update({
          name: 'Updated Group Name',
        })
      );
    });

    test('group member CANNOT update group (not admin)', async () => {
      const memberContext = getAuthenticatedContext(USER_A_ID);
      const db = memberContext.firestore();

      await assertFails(
        db.doc(`groups/${GROUP_ID}`).update({
          name: 'Should Not Work',
        })
      );
    });

    test('user can create a new group (becomes admin)', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc('groups/new-group-123').set({
          id: 'new-group-123',
          name: 'New Group',
          adminId: USER_A_ID,
          memberIds: [USER_A_ID],
          createdAt: new Date(),
        })
      );
    });

    test('user CANNOT create group with different admin', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(
        db.doc('groups/fake-admin-group').set({
          id: 'fake-admin-group',
          name: 'Fake Admin Group',
          adminId: USER_B_ID, // Different user
          memberIds: [USER_A_ID],
          createdAt: new Date(),
        })
      );
    });

    test('group admin can delete group (GDPR)', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc(`groups/${GROUP_ID}`).delete());
    });
  });

  // ========== ELDERS COLLECTION TESTS ==========

  describe('Elders Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('group admin can read elder', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc(`elders/${ELDER_ID}`).get());
    });

    test('group member can read elder', async () => {
      const memberContext = getAuthenticatedContext(USER_A_ID);
      const db = memberContext.firestore();

      await assertSucceeds(db.doc(`elders/${ELDER_ID}`).get());
    });

    test('assigned caregiver can read elder', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertSucceeds(db.doc(`elders/${ELDER_ID}`).get());
    });

    test('non-member CANNOT read elder', async () => {
      const nonMemberContext = getAuthenticatedContext(USER_B_ID);
      const db = nonMemberContext.firestore();

      await assertFails(db.doc(`elders/${ELDER_ID}`).get());
    });

    test('group admin can create elder', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(
        db.doc('elders/new-elder-123').set({
          id: 'new-elder-123',
          name: 'New Elder',
          groupId: GROUP_ID,
          createdAt: new Date(),
        })
      );
    });

    test('assigned caregiver can update elder', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertSucceeds(
        db.doc(`elders/${ELDER_ID}`).update({
          name: 'Updated Elder Name',
        })
      );
    });

    test('group admin can delete elder (GDPR)', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc(`elders/${ELDER_ID}`).delete());
    });
  });

  // ========== MEDICATIONS COLLECTION TESTS ==========

  describe('Medications Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('group admin can read medication', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc(`medications/${MEDICATION_ID}`).get());
    });

    test('group member can read medication', async () => {
      const memberContext = getAuthenticatedContext(USER_A_ID);
      const db = memberContext.firestore();

      await assertSucceeds(db.doc(`medications/${MEDICATION_ID}`).get());
    });

    test('non-member CANNOT read medication', async () => {
      const nonMemberContext = getAuthenticatedContext(USER_B_ID);
      const db = nonMemberContext.firestore();

      await assertFails(db.doc(`medications/${MEDICATION_ID}`).get());
    });

    test('group member with write permission can create medication', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(
        db.doc('medications/new-med-123').set({
          id: 'new-med-123',
          name: 'New Medication',
          groupId: GROUP_ID,
          elderId: ELDER_ID,
          createdAt: new Date(),
        })
      );
    });

    test('group member with write permission can delete medication', async () => {
      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc(`medications/${MEDICATION_ID}`).delete());
    });
  });

  // ========== AGENCY COLLECTION TESTS ==========

  describe('Agencies Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('super admin can read their agency', async () => {
      const superAdminContext = getAuthenticatedContext(SUPER_ADMIN_ID);
      const db = superAdminContext.firestore();

      await assertSucceeds(db.doc(`agencies/${AGENCY_ID}`).get());
    });

    test('caregiver in agency can read agency', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertSucceeds(db.doc(`agencies/${AGENCY_ID}`).get());
    });

    test('non-agency user CANNOT read agency', async () => {
      const nonAgencyContext = getAuthenticatedContext(USER_A_ID);
      const db = nonAgencyContext.firestore();

      await assertFails(db.doc(`agencies/${AGENCY_ID}`).get());
    });

    test('super admin can update agency', async () => {
      const superAdminContext = getAuthenticatedContext(SUPER_ADMIN_ID);
      const db = superAdminContext.firestore();

      await assertSucceeds(
        db.doc(`agencies/${AGENCY_ID}`).update({
          name: 'Updated Agency Name',
        })
      );
    });

    test('caregiver CANNOT update agency', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertFails(
        db.doc(`agencies/${AGENCY_ID}`).update({
          name: 'Should Not Work',
        })
      );
    });

    test('user can create agency (becomes super admin)', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc('agencies/new-agency-123').set({
          id: 'new-agency-123',
          name: 'New Agency',
          superAdminId: USER_A_ID,
          caregiverIds: [],
          groupIds: [],
          createdAt: new Date(),
        })
      );
    });

    test('super admin can delete agency', async () => {
      const superAdminContext = getAuthenticatedContext(SUPER_ADMIN_ID);
      const db = superAdminContext.firestore();

      await assertSucceeds(db.doc(`agencies/${AGENCY_ID}`).delete());
    });
  });

  // ========== SESSIONS COLLECTION TESTS ==========

  describe('Sessions Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('anyone can create a session (for anonymous tracking)', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertSucceeds(
        db.doc('sessions/anon-session-123').set({
          deviceId: 'device-123',
          startedAt: new Date(),
          pageViews: [],
        })
      );
    });

    test('authenticated user can read their own session', async () => {
      // First create a session with userId
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('sessions/user-session-123').set({
          userId: USER_A_ID,
          deviceId: 'device-123',
          startedAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(db.doc('sessions/user-session-123').get());
    });

    test('user CANNOT read another user session', async () => {
      // First create a session with different userId
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('sessions/other-session-123').set({
          userId: USER_B_ID,
          deviceId: 'device-456',
          startedAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(db.doc('sessions/other-session-123').get());
    });

    test('authenticated user can update session (for association)', async () => {
      // First create anonymous session
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('sessions/pending-session').set({
          deviceId: 'device-789',
          startedAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc('sessions/pending-session').update({
          userId: USER_A_ID,
        })
      );
    });
  });

  // ========== CAREGIVER ACCESS TESTS ==========

  describe('Caregiver Access', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('caregiver can read their elder_access documents', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertSucceeds(
        db.doc(`users/${CAREGIVER_USER_ID}/elder_access/${ELDER_ID}`).get()
      );
    });

    test('caregiver CANNOT read another user elder_access', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      // Try to read admin's elder_access (shouldn't exist, but rules should deny)
      await assertFails(
        db.doc(`users/${ADMIN_USER_ID}/elder_access/${ELDER_ID}`).get()
      );
    });

    test('caregiver can read their group_access documents', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertSucceeds(
        db.doc(`users/${CAREGIVER_USER_ID}/group_access/${GROUP_ID}`).get()
      );
    });

    test('caregiver CANNOT create elder_access (server only)', async () => {
      const caregiverContext = getAuthenticatedContext(CAREGIVER_USER_ID);
      const db = caregiverContext.firestore();

      await assertFails(
        db.doc(`users/${CAREGIVER_USER_ID}/elder_access/new-elder`).set({
          elderId: 'new-elder',
          groupId: GROUP_ID,
          assignedAt: new Date(),
        })
      );
    });
  });

  // ========== UNAUTHENTICATED ACCESS TESTS ==========

  describe('Unauthenticated Access Denial', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('unauthenticated CANNOT read users', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc(`users/${USER_A_ID}`).get());
    });

    test('unauthenticated CANNOT read groups', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc(`groups/${GROUP_ID}`).get());
    });

    test('unauthenticated CANNOT read elders', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc(`elders/${ELDER_ID}`).get());
    });

    test('unauthenticated CANNOT read medications', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc(`medications/${MEDICATION_ID}`).get());
    });

    test('unauthenticated CANNOT read agencies', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc(`agencies/${AGENCY_ID}`).get());
    });

    test('unauthenticated CANNOT write to users', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(
        db.doc('users/hacker-user').set({
          email: 'hacker@evil.com',
        })
      );
    });

    test('unauthenticated CANNOT write to groups', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(
        db.doc('groups/hacker-group').set({
          name: 'Hacker Group',
        })
      );
    });
  });

  // ========== DEFAULT DENY TESTS ==========

  describe('Default Deny Rule', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('unauthenticated CANNOT access undefined collections', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();

      await assertFails(db.doc('unknown_collection/doc123').get());
      await assertFails(db.doc('unknown_collection/doc123').set({ data: 'test' }));
    });

    test('authenticated CANNOT access undefined collections', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(db.doc('unknown_collection/doc123').get());
      await assertFails(db.doc('unknown_collection/doc123').set({ data: 'test' }));
    });
  });

  // ========== MEDICAL DATA TESTS ==========

  describe('Medical Data Collections', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('group member can create diet entry', async () => {
      const memberContext = getAuthenticatedContext(USER_A_ID);
      const db = memberContext.firestore();

      await assertSucceeds(
        db.doc('diet_entries/diet-123').set({
          id: 'diet-123',
          groupId: GROUP_ID,
          elderId: ELDER_ID,
          meal: 'breakfast',
          items: ['eggs', 'toast'],
          timestamp: new Date(),
        })
      );
    });

    test('non-member CANNOT create diet entry', async () => {
      const nonMemberContext = getAuthenticatedContext(USER_B_ID);
      const db = nonMemberContext.firestore();

      await assertFails(
        db.doc('diet_entries/diet-hacker').set({
          id: 'diet-hacker',
          groupId: GROUP_ID,
          elderId: ELDER_ID,
          meal: 'lunch',
          items: ['hacked'],
          timestamp: new Date(),
        })
      );
    });

    test('group admin can read drug interactions', async () => {
      // First create a drug interaction
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('drugInteractions/interaction-123').set({
          id: 'interaction-123',
          groupId: GROUP_ID,
          elderId: ELDER_ID,
          drugs: ['aspirin', 'ibuprofen'],
          severity: 'moderate',
          createdAt: new Date(),
        });
      });

      const adminContext = getAuthenticatedContext(ADMIN_USER_ID);
      const db = adminContext.firestore();

      await assertSucceeds(db.doc('drugInteractions/interaction-123').get());
    });
  });

  // ========== NOTIFICATION TESTS ==========

  describe('User Notifications Collection', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('user can read their own notifications', async () => {
      // Create a notification for user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('user_notifications/notif-123').set({
          id: 'notif-123',
          userId: USER_A_ID,
          type: 'medication_reminder',
          message: 'Time to take medication',
          read: false,
          createdAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(db.doc('user_notifications/notif-123').get());
    });

    test('user CANNOT read another user notifications', async () => {
      // Create a notification for different user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('user_notifications/notif-other').set({
          id: 'notif-other',
          userId: USER_B_ID,
          type: 'alert',
          message: 'Private notification',
          read: false,
          createdAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(db.doc('user_notifications/notif-other').get());
    });

    test('user can mark their notification as read', async () => {
      // Create a notification for user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('user_notifications/notif-mark-read').set({
          id: 'notif-mark-read',
          userId: USER_A_ID,
          type: 'reminder',
          message: 'Test',
          read: false,
          createdAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc('user_notifications/notif-mark-read').update({
          read: true,
        })
      );
    });

    test('user CANNOT update notification with non-allowed fields', async () => {
      // Create a notification for user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('user_notifications/notif-no-hack').set({
          id: 'notif-no-hack',
          userId: USER_A_ID,
          type: 'reminder',
          message: 'Test',
          read: false,
          createdAt: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(
        db.doc('user_notifications/notif-no-hack').update({
          message: 'Hacked message',
        })
      );
    });
  });

  // ========== AUDIT LOG TESTS ==========

  describe('PHI Audit Logs (HIPAA Compliance)', () => {
    beforeEach(async () => {
      await setupTestData();
    });

    test('user can create PHI audit log for their own actions', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(
        db.doc('phi_audit_logs/audit-123').set({
          id: 'audit-123',
          userId: USER_A_ID,
          groupId: GROUP_ID,
          action: 'view_medication',
          resourceType: 'medication',
          resourceId: MEDICATION_ID,
          timestamp: new Date(),
        })
      );
    });

    test('user CANNOT create audit log for another user', async () => {
      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(
        db.doc('phi_audit_logs/fake-audit').set({
          id: 'fake-audit',
          userId: USER_B_ID, // Different user
          groupId: GROUP_ID,
          action: 'fake_action',
          resourceType: 'medication',
          resourceId: MEDICATION_ID,
          timestamp: new Date(),
        })
      );
    });

    test('audit logs are immutable (no update)', async () => {
      // Create an audit log
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('phi_audit_logs/immutable-audit').set({
          id: 'immutable-audit',
          userId: USER_A_ID,
          groupId: GROUP_ID,
          action: 'view',
          timestamp: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertFails(
        db.doc('phi_audit_logs/immutable-audit').update({
          action: 'modified',
        })
      );
    });

    test('user can delete their own audit logs (GDPR)', async () => {
      // Create an audit log
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('phi_audit_logs/delete-audit').set({
          id: 'delete-audit',
          userId: USER_A_ID,
          groupId: GROUP_ID,
          action: 'view',
          timestamp: new Date(),
        });
      });

      const userContext = getAuthenticatedContext(USER_A_ID);
      const db = userContext.firestore();

      await assertSucceeds(db.doc('phi_audit_logs/delete-audit').delete());
    });
  });
});
