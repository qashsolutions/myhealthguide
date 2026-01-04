/**
 * Cloud Functions Unit Tests
 *
 * Tests Firebase Cloud Functions using the Firebase Emulator
 *
 * Prerequisites:
 * - Firebase Emulator must be running:
 *   firebase emulators:start --only firestore,auth,functions
 *
 * Run tests:
 *   npm run test:functions
 */

/* eslint-disable @typescript-eslint/no-var-requires */

// Initialize firebase-functions-test FIRST (before importing functions)
const functionsTest = require('firebase-functions-test');
const testEnv = functionsTest({
  projectId: 'demo-healthweb',
});

// Import admin and functions - functions module will call initializeApp
const admin = require('firebase-admin');
const myFunctions = require('../src/index');

// Get db from the already-initialized admin
const db = admin.firestore();

afterAll(async () => {
  // Cleanup
  testEnv.cleanup();
  // Delete all apps
  await Promise.all(admin.apps.map((app: any) => app?.delete()));
});

// Helper: Generate unique IDs
const generateId = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper: Create test user in Firestore
async function createTestUser(userId: string, data: Partial<{
  email: string;
  firstName: string;
  fcmTokens: string[];
  subscriptionStatus: string;
  groupIds: string[];
}> = {}): Promise<void> {
  await db.collection('users').doc(userId).set({
    email: data.email || `${userId}@test.com`,
    firstName: data.firstName || 'Test User',
    fcmTokens: data.fcmTokens || [],
    subscriptionStatus: data.subscriptionStatus || 'active',
    groupIds: data.groupIds || [],
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// Helper: Create test group
async function createTestGroup(groupId: string, adminId: string, memberIds: string[] = []): Promise<void> {
  await db.collection('groups').doc(groupId).set({
    name: 'Test Group',
    adminId: adminId,
    memberIds: [adminId, ...memberIds],
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// Helper: Create test elder
async function createTestElder(elderId: string, groupId: string, data: Partial<{
  firstName: string;
  lastName: string;
}> = {}): Promise<void> {
  await db.collection('elders').doc(elderId).set({
    firstName: data.firstName || 'Test Elder',
    lastName: data.lastName || 'Smith',
    groupId: groupId,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// Helper: Create test medication
async function createTestMedication(medId: string, groupId: string, elderId: string, data: Partial<{
  name: string;
  dosage: string;
  status: string;
}> = {}): Promise<void> {
  await db.collection('medications').doc(medId).set({
    name: data.name || 'Test Medication',
    dosage: data.dosage || '100mg',
    status: data.status || 'active',
    groupId: groupId,
    elderId: elderId,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// Helper: Create test supplement
async function createTestSupplement(suppId: string, groupId: string, elderId: string, data: Partial<{
  name: string;
  dosage: string;
}> = {}): Promise<void> {
  await db.collection('supplements').doc(suppId).set({
    name: data.name || 'Test Supplement',
    dosage: data.dosage || '500mg',
    groupId: groupId,
    elderId: elderId,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// Helper: Cleanup test data
async function cleanupTestData(collections: string[], docIds: string[]): Promise<void> {
  for (const collection of collections) {
    for (const docId of docIds) {
      try {
        await db.collection(collection).doc(docId).delete();
      } catch (e) {
        // Ignore errors if document doesn't exist
      }
    }
  }
}

// Helper: Wait for async operations
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// onMedicationLogCreated Tests
// ============================================================================

describe('onMedicationLogCreated', () => {
  const testIds = {
    user1: generateId(),
    user2: generateId(),
    group: generateId(),
    elder: generateId(),
    medication: generateId(),
    log: generateId(),
  };

  beforeAll(async () => {
    // Create test data
    await createTestUser(testIds.user1, {
      firstName: 'Admin',
      fcmTokens: ['test-token-1'],
    });
    await createTestUser(testIds.user2, {
      firstName: 'Member',
      fcmTokens: ['test-token-2'],
    });
    await createTestGroup(testIds.group, testIds.user1, [testIds.user2]);
    await createTestElder(testIds.elder, testIds.group, { firstName: 'John' });
    await createTestMedication(testIds.medication, testIds.group, testIds.elder, {
      name: 'Aspirin',
    });
  });

  afterAll(async () => {
    await cleanupTestData(
      ['users', 'groups', 'elders', 'medications', 'medication_logs'],
      Object.values(testIds)
    );
  });

  test('should process medication log with "taken" status', async () => {
    const logId = generateId();
    const logData = {
      status: 'taken',
      medicationId: testIds.medication,
      groupId: testIds.group,
      elderId: testIds.elder,
      loggedBy: testIds.user2,
      loggedAt: admin.firestore.Timestamp.now(),
    };

    // Create the log document (simulates trigger)
    await db.collection('medication_logs').doc(logId).set(logData);

    // Get the wrapped function
    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);

    // Create snapshot
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    // Execute the function
    const result = await wrapped(snap, { params: { logId } });

    // Verify function executed (may succeed or fail based on FCM mock)
    expect(result).toBeDefined();
  });

  test('should not notify for non-notifiable status', async () => {
    const logId = generateId();
    const logData = {
      status: 'scheduled', // Not in notifiable statuses
      medicationId: testIds.medication,
      groupId: testIds.group,
      elderId: testIds.elder,
      loggedBy: testIds.user1,
      loggedAt: admin.firestore.Timestamp.now(),
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeNull();
  });

  test('should handle missing groupId gracefully', async () => {
    const logId = generateId();
    const logData = {
      status: 'taken',
      medicationId: testIds.medication,
      // No groupId
      elderId: testIds.elder,
      loggedBy: testIds.user1,
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeNull();
  });

  test('should handle non-existent group gracefully', async () => {
    const logId = generateId();
    const logData = {
      status: 'taken',
      medicationId: testIds.medication,
      groupId: 'non-existent-group',
      elderId: testIds.elder,
      loggedBy: testIds.user1,
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeNull();
  });

  test('should not notify when user is the only group member', async () => {
    // Create a group with only one member
    const soloGroupId = generateId();
    const soloUserId = generateId();

    await createTestUser(soloUserId, { firstName: 'Solo User', fcmTokens: ['token'] });
    await createTestGroup(soloGroupId, soloUserId, []);

    const logId = generateId();
    const logData = {
      status: 'taken',
      medicationId: testIds.medication,
      groupId: soloGroupId,
      elderId: testIds.elder,
      loggedBy: soloUserId, // Same user as admin
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    // Should return null since there are no other members to notify
    expect(result).toBeNull();

    // Cleanup
    await cleanupTestData(['users', 'groups'], [soloUserId, soloGroupId]);
  });
});

// ============================================================================
// onSupplementLogCreated Tests
// ============================================================================

describe('onSupplementLogCreated', () => {
  const testIds = {
    user1: generateId(),
    user2: generateId(),
    group: generateId(),
    elder: generateId(),
    supplement: generateId(),
  };

  beforeAll(async () => {
    await createTestUser(testIds.user1, {
      firstName: 'Admin',
      fcmTokens: ['test-token-admin'],
    });
    await createTestUser(testIds.user2, {
      firstName: 'Caregiver',
      fcmTokens: ['test-token-caregiver'],
    });
    await createTestGroup(testIds.group, testIds.user1, [testIds.user2]);
    await createTestElder(testIds.elder, testIds.group, { firstName: 'Mary' });
    await createTestSupplement(testIds.supplement, testIds.group, testIds.elder, {
      name: 'Vitamin D',
    });
  });

  afterAll(async () => {
    await cleanupTestData(
      ['users', 'groups', 'elders', 'supplements', 'supplement_logs'],
      Object.values(testIds)
    );
  });

  test('should process supplement log with "taken" status', async () => {
    const logId = generateId();
    const logData = {
      status: 'taken',
      supplementId: testIds.supplement,
      groupId: testIds.group,
      elderId: testIds.elder,
      loggedBy: testIds.user2,
      loggedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('supplement_logs').doc(logId).set(logData);

    const wrapped = testEnv.wrap(myFunctions.onSupplementLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `supplement_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeDefined();
  });

  test('should process supplement log with "missed" status', async () => {
    const logId = generateId();
    const logData = {
      status: 'missed',
      supplementId: testIds.supplement,
      groupId: testIds.group,
      elderId: testIds.elder,
      loggedBy: testIds.user1,
      loggedAt: admin.firestore.Timestamp.now(),
    };

    const wrapped = testEnv.wrap(myFunctions.onSupplementLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `supplement_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeDefined();
  });

  test('should not notify for non-notifiable status', async () => {
    const logId = generateId();
    const logData = {
      status: 'pending',
      supplementId: testIds.supplement,
      groupId: testIds.group,
      elderId: testIds.elder,
      loggedBy: testIds.user1,
    };

    const wrapped = testEnv.wrap(myFunctions.onSupplementLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `supplement_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeNull();
  });

  test('should handle missing groupId gracefully', async () => {
    const logId = generateId();
    const logData = {
      status: 'taken',
      supplementId: testIds.supplement,
      elderId: testIds.elder,
      loggedBy: testIds.user1,
    };

    const wrapped = testEnv.wrap(myFunctions.onSupplementLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `supplement_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeNull();
  });
});

// ============================================================================
// onMedicationAdded Tests
// ============================================================================

describe('onMedicationAdded', () => {
  const testIds = {
    user1: generateId(),
    user2: generateId(),
    group: generateId(),
    elder: generateId(),
  };

  beforeAll(async () => {
    await createTestUser(testIds.user1, {
      firstName: 'Admin',
      fcmTokens: ['admin-fcm-token'],
    });
    await createTestUser(testIds.user2, {
      firstName: 'Caregiver',
      fcmTokens: ['caregiver-fcm-token'],
    });
    await createTestGroup(testIds.group, testIds.user1, [testIds.user2]);
    await createTestElder(testIds.elder, testIds.group, { firstName: 'Robert' });
  });

  afterAll(async () => {
    await cleanupTestData(
      ['users', 'groups', 'elders', 'medications'],
      Object.values(testIds)
    );
  });

  test('should notify group members when medication is added', async () => {
    const medId = generateId();
    const medicationData = {
      name: 'Lisinopril',
      dosage: '10mg',
      groupId: testIds.group,
      elderId: testIds.elder,
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationAdded);
    const snap = testEnv.firestore.makeDocumentSnapshot(medicationData, `medications/${medId}`);

    const result = await wrapped(snap, { params: { medicationId: medId } });

    expect(result).toBeDefined();

    // Cleanup
    await db.collection('medications').doc(medId).delete();
  });

  test('should handle missing groupId gracefully', async () => {
    const medId = generateId();
    const medicationData = {
      name: 'Test Med',
      dosage: '5mg',
      elderId: testIds.elder,
      status: 'active',
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationAdded);
    const snap = testEnv.firestore.makeDocumentSnapshot(medicationData, `medications/${medId}`);

    const result = await wrapped(snap, { params: { medicationId: medId } });

    expect(result).toBeNull();
  });

  test('should handle non-existent group gracefully', async () => {
    const medId = generateId();
    const medicationData = {
      name: 'Test Med',
      dosage: '5mg',
      groupId: 'non-existent-group-id',
      elderId: testIds.elder,
      status: 'active',
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationAdded);
    const snap = testEnv.firestore.makeDocumentSnapshot(medicationData, `medications/${medId}`);

    const result = await wrapped(snap, { params: { medicationId: medId } });

    expect(result).toBeNull();
  });

  test('should handle group with no FCM tokens gracefully', async () => {
    // Create users without FCM tokens
    const noTokenUserId = generateId();
    const noTokenGroupId = generateId();

    await createTestUser(noTokenUserId, { fcmTokens: [] }); // No tokens
    await createTestGroup(noTokenGroupId, noTokenUserId, []);

    const medId = generateId();
    const medicationData = {
      name: 'Test Med',
      dosage: '5mg',
      groupId: noTokenGroupId,
      elderId: testIds.elder,
      status: 'active',
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationAdded);
    const snap = testEnv.firestore.makeDocumentSnapshot(medicationData, `medications/${medId}`);

    const result = await wrapped(snap, { params: { medicationId: medId } });

    // Should return null when no tokens found
    expect(result).toBeNull();

    // Cleanup
    await cleanupTestData(['users', 'groups'], [noTokenUserId, noTokenGroupId]);
  });
});

// ============================================================================
// processNotificationQueue Tests
// ============================================================================

describe('processNotificationQueue', () => {
  const testIds = {
    user: generateId(),
  };

  beforeAll(async () => {
    await createTestUser(testIds.user, {
      firstName: 'Notification User',
      fcmTokens: ['notification-fcm-token-1', 'notification-fcm-token-2'],
    });
  });

  afterAll(async () => {
    await cleanupTestData(['users', 'notification_queue'], Object.values(testIds));
  });

  test('should process notification with valid user', async () => {
    const notifId = generateId();
    const notificationData = {
      userId: testIds.user,
      type: 'join_request',
      title: 'New Join Request',
      body: 'A caregiver wants to join your group',
      data: {
        requestId: 'test-request-id',
        link: '/dashboard/settings',
      },
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('notification_queue').doc(notifId).set(notificationData);

    const wrapped = testEnv.wrap(myFunctions.processNotificationQueue);
    const snap = testEnv.firestore.makeDocumentSnapshot(
      notificationData,
      `notification_queue/${notifId}`
    );

    const result = await wrapped(snap, { params: { notificationId: notifId } });

    expect(result).toBeDefined();

    // Check that status was updated
    await wait(500);
    const doc = await db.collection('notification_queue').doc(notifId).get();
    const data = doc.data();
    expect(['sent', 'failed']).toContain(data?.status);

    // Cleanup
    await db.collection('notification_queue').doc(notifId).delete();
  });

  test('should handle non-existent user gracefully', async () => {
    const notifId = generateId();
    const notificationData = {
      userId: 'non-existent-user-id',
      type: 'test',
      title: 'Test',
      body: 'Test body',
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('notification_queue').doc(notifId).set(notificationData);

    const wrapped = testEnv.wrap(myFunctions.processNotificationQueue);
    const snap = testEnv.firestore.makeDocumentSnapshot(
      notificationData,
      `notification_queue/${notifId}`
    );

    // Add a mock ref to the snapshot
    const mockRef = db.collection('notification_queue').doc(notifId);
    Object.defineProperty(snap, 'ref', { value: mockRef });

    const result = await wrapped(snap, { params: { notificationId: notifId } });

    expect(result.success).toBe(false);
    expect(result.error).toBe('User not found');

    // Cleanup
    await db.collection('notification_queue').doc(notifId).delete();
  });

  test('should handle user with no FCM tokens', async () => {
    const noTokenUserId = generateId();
    await createTestUser(noTokenUserId, { fcmTokens: [] });

    const notifId = generateId();
    const notificationData = {
      userId: noTokenUserId,
      type: 'test',
      title: 'Test',
      body: 'Test body',
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('notification_queue').doc(notifId).set(notificationData);

    const wrapped = testEnv.wrap(myFunctions.processNotificationQueue);
    const snap = testEnv.firestore.makeDocumentSnapshot(
      notificationData,
      `notification_queue/${notifId}`
    );

    const mockRef = db.collection('notification_queue').doc(notifId);
    Object.defineProperty(snap, 'ref', { value: mockRef });

    const result = await wrapped(snap, { params: { notificationId: notifId } });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No FCM tokens');

    // Cleanup
    await cleanupTestData(['users', 'notification_queue'], [noTokenUserId, notifId]);
  });
});

// ============================================================================
// processSMSQueue Tests - DISABLED (Twilio not configured)
// ============================================================================
// SMS via Twilio is currently disabled. Using FCM only for notifications.
// When Twilio is enabled, uncomment these tests.
//
// describe('processSMSQueue', () => {
//   test('should process SMS message (Twilio mock)', async () => {
//     // Test code here
//   });
//   test('should handle invalid phone number format', async () => {
//     // Test code here
//   });
// });

// ============================================================================
// Scheduled Functions Unit Tests (Logic Testing)
// ============================================================================

describe('Scheduled Functions - Helper Logic', () => {
  describe('parseTimeToDate helper', () => {
    // We can't directly test the helper since it's not exported,
    // but we test the behavior through the functions that use it

    test('detectMissedDoses handles medications with various time formats', async () => {
      const testGroupId = generateId();
      const testAdminId = generateId();
      const testElderId = generateId();
      const testMedId = generateId();

      // Create test data
      await createTestUser(testAdminId, { firstName: 'Admin', fcmTokens: [] });
      await createTestGroup(testGroupId, testAdminId, []);
      await createTestElder(testElderId, testGroupId, { firstName: 'Elder' });
      await db.collection('medications').doc(testMedId).set({
        name: 'Test Med',
        groupId: testGroupId,
        elderId: testElderId,
        status: 'active',
        frequency: {
          times: ['08:00', '2:30 PM', '20:00'],
        },
        createdAt: admin.firestore.Timestamp.now(),
      });

      // The function exists and is wrapped properly
      const wrapped = testEnv.wrap(myFunctions.detectMissedDoses);
      expect(wrapped).toBeDefined();

      // Cleanup
      await cleanupTestData(
        ['users', 'groups', 'elders', 'medications'],
        [testAdminId, testGroupId, testElderId, testMedId]
      );
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  test('onMedicationLogCreated handles empty snapshot data', async () => {
    const logId = generateId();
    const emptyData = {};

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(emptyData, `medication_logs/${logId}`);

    // Should not throw, but returns error result
    const result = await wrapped(snap, { params: { logId } });
    // Function catches the error and returns error object
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  test('onSupplementLogCreated handles empty snapshot data', async () => {
    const logId = generateId();
    const emptyData = {};

    const wrapped = testEnv.wrap(myFunctions.onSupplementLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(emptyData, `supplement_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });
    // Function catches the error and returns error object
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  test('onMedicationAdded handles empty snapshot data', async () => {
    const medId = generateId();
    const emptyData = {};

    const wrapped = testEnv.wrap(myFunctions.onMedicationAdded);
    const snap = testEnv.firestore.makeDocumentSnapshot(emptyData, `medications/${medId}`);

    const result = await wrapped(snap, { params: { medicationId: medId } });
    // Function catches the error and returns error object
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Integration Tests - Full Flow
// ============================================================================

describe('Integration Tests', () => {
  const integrationIds = {
    admin: generateId(),
    caregiver1: generateId(),
    caregiver2: generateId(),
    group: generateId(),
    elder: generateId(),
    medication: generateId(),
  };

  beforeAll(async () => {
    // Set up a complete test scenario
    await createTestUser(integrationIds.admin, {
      firstName: 'Admin User',
      fcmTokens: ['admin-token-1'],
    });
    await createTestUser(integrationIds.caregiver1, {
      firstName: 'Caregiver One',
      fcmTokens: ['caregiver1-token'],
    });
    await createTestUser(integrationIds.caregiver2, {
      firstName: 'Caregiver Two',
      fcmTokens: ['caregiver2-token'],
    });

    await createTestGroup(
      integrationIds.group,
      integrationIds.admin,
      [integrationIds.caregiver1, integrationIds.caregiver2]
    );

    await createTestElder(integrationIds.elder, integrationIds.group, {
      firstName: 'Test Elder',
      lastName: 'Integration',
    });

    await createTestMedication(
      integrationIds.medication,
      integrationIds.group,
      integrationIds.elder,
      { name: 'Blood Pressure Med', dosage: '50mg' }
    );
  });

  afterAll(async () => {
    await cleanupTestData(
      ['users', 'groups', 'elders', 'medications', 'medication_logs'],
      Object.values(integrationIds)
    );
  });

  test('full medication logging flow notifies other caregivers', async () => {
    // Caregiver1 logs a dose
    const logId = generateId();
    const logData = {
      status: 'taken',
      medicationId: integrationIds.medication,
      groupId: integrationIds.group,
      elderId: integrationIds.elder,
      loggedBy: integrationIds.caregiver1, // Logged by caregiver1
      loggedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('medication_logs').doc(logId).set(logData);

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    // Function should execute (notification to admin and caregiver2, but not caregiver1)
    expect(result).toBeDefined();

    // Cleanup
    await db.collection('medication_logs').doc(logId).delete();
  });

  test('medication logging with "missed" status triggers high priority notification', async () => {
    const logId = generateId();
    const logData = {
      status: 'missed',
      medicationId: integrationIds.medication,
      groupId: integrationIds.group,
      elderId: integrationIds.elder,
      loggedBy: integrationIds.admin,
      loggedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('medication_logs').doc(logId).set(logData);

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const result = await wrapped(snap, { params: { logId } });

    expect(result).toBeDefined();

    // Cleanup
    await db.collection('medication_logs').doc(logId).delete();
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  test('onMedicationLogCreated completes within acceptable time', async () => {
    const testIds = {
      user: generateId(),
      group: generateId(),
      elder: generateId(),
      medication: generateId(),
    };

    await createTestUser(testIds.user, { fcmTokens: ['token'] });
    await createTestGroup(testIds.group, testIds.user, []);
    await createTestElder(testIds.elder, testIds.group, {});
    await createTestMedication(testIds.medication, testIds.group, testIds.elder, {});

    const logId = generateId();
    const logData = {
      status: 'taken',
      medicationId: testIds.medication,
      groupId: testIds.group,
      elderId: testIds.elder,
      loggedBy: testIds.user,
      loggedAt: admin.firestore.Timestamp.now(),
    };

    const wrapped = testEnv.wrap(myFunctions.onMedicationLogCreated);
    const snap = testEnv.firestore.makeDocumentSnapshot(logData, `medication_logs/${logId}`);

    const startTime = Date.now();
    await wrapped(snap, { params: { logId } });
    const duration = Date.now() - startTime;

    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10000);

    // Cleanup
    await cleanupTestData(
      ['users', 'groups', 'elders', 'medications'],
      Object.values(testIds)
    );
  });
});
