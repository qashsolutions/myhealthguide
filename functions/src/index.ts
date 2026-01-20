/**
 * Firebase Cloud Functions for MyGuide Health
 * Handles push notifications and background tasks
 *
 * NOTIFICATION STRATEGY (Jan 2026):
 * - FCM (Firebase Cloud Messaging) for push notifications
 * - Email via Firebase Trigger Email extension (writes to 'mail' collection)
 * - FCM requires users to install the PWA and enable notifications
 * - Email sent to users with email on file
 * - Twilio SMS integration is commented out but preserved for future use
 * - When Twilio is needed, uncomment the relevant code and configure credentials
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// import { defineString } from 'firebase-functions/params';

// ============= TWILIO SMS - DISABLED (Using FCM Only) =============
// Uncomment when ready to use Twilio for SMS notifications
// import * as twilio from 'twilio';
// const twilioAccountSid = defineString('TWILIO_ACCOUNT_SID');
// const twilioAuthToken = defineString('TWILIO_AUTH_TOKEN');
// const twilioPhoneNumber = defineString('TWILIO_PHONE_NUMBER');
// ===================================================================

// Initialize Firebase Admin SDK
admin.initializeApp();

// ============= SCHEDULED FUNCTIONS =============

/**
 * Daily Scheduled Job: Check and expire trials
 * Runs every day at midnight PST
 *
 * Checks all users with 'trial' status and expired trialEndDate,
 * then marks them as 'expired' and starts 48-hour grace period
 */
export const checkExpiredTrials = functions.pubsub
  .schedule('0 0 * * *') // Every day at midnight
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting checkExpiredTrials job...');

    try {
      const now = new Date();
      const usersRef = admin.firestore().collection('users');

      // Find all users with trial status
      const trialUsersSnapshot = await usersRef
        .where('subscriptionStatus', '==', 'trial')
        .get();

      let expiredCount = 0;
      const batch = admin.firestore().batch();

      for (const userDoc of trialUsersSnapshot.docs) {
        const userData = userDoc.data();
        const trialEndDate = userData.trialEndDate?.toDate();

        // Check if trial has expired
        if (trialEndDate && trialEndDate < now) {
          console.log(`Expiring trial for user: ${userDoc.id}`);

          // Calculate grace period end (24 hours from now)
          const gracePeriodEnd = new Date(now);
          gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 24);

          // Update user to expired status with grace period
          batch.update(userDoc.ref, {
            subscriptionStatus: 'expired',
            gracePeriodStartDate: admin.firestore.Timestamp.fromDate(now),
            gracePeriodEndDate: admin.firestore.Timestamp.fromDate(gracePeriodEnd),
            dataExportRequested: false
          });

          expiredCount++;
        }
      }

      // Commit all updates
      if (expiredCount > 0) {
        await batch.commit();
        console.log(`Successfully expired ${expiredCount} trial accounts`);
      } else {
        console.log('No trials to expire');
      }

      return { success: true, expiredCount };
    } catch (error) {
      console.error('Error in checkExpiredTrials:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Daily Scheduled Job: Send trial expiration warnings
 * Runs every day at 9 AM PST
 *
 * Sends notifications to users at:
 * - 3 days before expiration
 * - 1 day before expiration
 * - On expiration day (before midnight check)
 */
export const sendTrialExpirationWarnings = functions.pubsub
  .schedule('0 9 * * *') // Every day at 9 AM
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting sendTrialExpirationWarnings job...');

    try {
      const now = new Date();
      const usersRef = admin.firestore().collection('users');

      // Find all users with active trial status
      const trialUsersSnapshot = await usersRef
        .where('subscriptionStatus', '==', 'trial')
        .get();

      let notificationsSent = 0;

      for (const userDoc of trialUsersSnapshot.docs) {
        const userData = userDoc.data();
        const trialEndDate = userData.trialEndDate?.toDate();

        if (!trialEndDate) continue;

        // Calculate days until expiration
        const diffTime = trialEndDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Send notification at 3 days, 1 day, and 0 days (today)
        let shouldNotify = false;
        let title = '';
        let body = '';

        if (daysRemaining === 3) {
          shouldNotify = true;
          title = '⏰ Trial Ending in 3 Days';
          body = 'Your 45-day trial ends in 3 days. Subscribe now to keep your health data and continue using all features.';
        } else if (daysRemaining === 1) {
          shouldNotify = true;
          title = '⚠️ Trial Ending Tomorrow';
          body = 'Your trial ends tomorrow! Subscribe now or download your data before it\'s deleted after the trial ends.';
        } else if (daysRemaining === 0) {
          shouldNotify = true;
          title = '🚨 Trial Expires Today';
          body = 'Your trial expires tonight at midnight. Subscribe now or export your data - it will be deleted in 24 hours!';
        }

        if (shouldNotify) {
          // Get user's FCM tokens
          const fcmTokens = userData.fcmTokens || [];

          if (fcmTokens.length > 0) {
            const payload: admin.messaging.MulticastMessage = {
              tokens: fcmTokens,
              notification: {
                title,
                body
              },
              data: {
                type: 'trial_expiration_warning',
                daysRemaining: daysRemaining.toString(),
                url: '/dashboard/settings'
              },
              webpush: {
                fcmOptions: {
                  link: '/dashboard/settings'
                },
                notification: {
                  icon: '/icon-192x192.png',
                  badge: '/icon-192x192.png',
                  requireInteraction: true
                }
              }
            };

            try {
              await admin.messaging().sendEachForMulticast(payload);
              console.log(`Sent ${daysRemaining}-day warning to user ${userDoc.id}`);
              notificationsSent++;
            } catch (error) {
              console.error(`Failed to send notification to user ${userDoc.id}:`, error);
            }
          }
        }
      }

      console.log(`Sent ${notificationsSent} trial expiration warnings`);
      return { success: true, notificationsSent };
    } catch (error) {
      console.error('Error in sendTrialExpirationWarnings:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Daily Scheduled Job: Cleanup expired accounts
 * Runs every day at 1 AM PST
 *
 * Permanently deletes all data for users who:
 * - Have 'expired' subscription status
 * - Grace period has ended (48 hours after expiration)
 * - Have NOT subscribed to a paid plan
 */
export const cleanupExpiredAccounts = functions.pubsub
  .schedule('0 1 * * *') // Every day at 1 AM
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting cleanupExpiredAccounts job...');

    try {
      const now = new Date();
      const usersRef = admin.firestore().collection('users');

      // Find users with expired status whose grace period has ended
      const expiredUsersSnapshot = await usersRef
        .where('subscriptionStatus', '==', 'expired')
        .get();

      let deletedCount = 0;

      for (const userDoc of expiredUsersSnapshot.docs) {
        const userData = userDoc.data();
        const gracePeriodEndDate = userData.gracePeriodEndDate?.toDate();

        // Check if grace period has ended
        if (gracePeriodEndDate && gracePeriodEndDate < now) {
          console.log(`Deleting data for user: ${userDoc.id}`);

          try {
            // Delete all user data using comprehensive deletion
            await deleteAllUserData(userDoc.id, userData);

            console.log(`Successfully deleted all data for user ${userDoc.id}`);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete data for user ${userDoc.id}:`, error);
          }
        }
      }

      console.log(`Deleted ${deletedCount} expired accounts`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error in cleanupExpiredAccounts:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Helper: Delete all user data (comprehensive deletion)
 * Mirrors the DataDeletionService logic from client-side
 */
async function deleteAllUserData(userId: string, userData: any): Promise<void> {
  const db = admin.firestore();

  // Get all groups where user is admin
  const groupsSnapshot = await db.collection('groups')
    .where('adminId', '==', userId)
    .get();

  // Delete each group and its associated data
  for (const groupDoc of groupsSnapshot.docs) {
    const groupId = groupDoc.id;

    // Delete elders in this group
    await deleteCollection(db.collection('elders').where('groupId', '==', groupId));

    // Delete medications
    await deleteCollection(db.collection('medications').where('groupId', '==', groupId));

    // Delete medication logs
    await deleteCollection(db.collection('medication_logs').where('groupId', '==', groupId));

    // Delete supplements
    await deleteCollection(db.collection('supplements').where('groupId', '==', groupId));

    // Delete supplement logs
    await deleteCollection(db.collection('supplement_logs').where('groupId', '==', groupId));

    // Delete diet entries
    await deleteCollection(db.collection('diet_entries').where('groupId', '==', groupId));

    // Delete activity logs
    await deleteCollection(db.collection('activity_logs').where('groupId', '==', groupId));

    // Delete notification logs
    await deleteCollection(db.collection('notification_logs').where('groupId', '==', groupId));

    // Delete reminder schedules
    await deleteCollection(db.collection('reminder_schedules').where('groupId', '==', groupId));

    // Delete AI summaries
    await deleteCollection(db.collection('ai_summaries').where('groupId', '==', groupId));

    // Delete PHI audit logs for this group
    await deleteCollection(db.collection('phi_audit_logs').where('groupId', '==', groupId));

    // Delete the group itself
    await groupDoc.ref.delete();
    console.log(`Deleted group ${groupId}`);
  }

  // Delete user's invites
  await deleteCollection(db.collection('invites').where('createdBy', '==', userId));

  // Delete user's invite acceptances
  await deleteCollection(db.collection('invite_acceptances').where('userId', '==', userId));

  // Delete user's PHI audit logs
  await deleteCollection(db.collection('phi_audit_logs').where('userId', '==', userId));

  // Delete phone index
  const phoneHash = userData.phoneNumberHash;
  if (phoneHash) {
    try {
      await db.collection('phone_index').doc(phoneHash).delete();
    } catch (error) {
      console.error('Error deleting phone index:', error);
    }
  }

  // Delete user's session data
  await deleteCollection(db.collection('sessions').where('userId', '==', userId));

  // Finally, delete the user document
  await db.collection('users').doc(userId).delete();
  console.log(`Deleted user document ${userId}`);
}

/**
 * Helper: Delete all documents in a query
 * Uses batching to handle large collections (max 500 docs per batch)
 */
async function deleteCollection(query: admin.firestore.Query): Promise<number> {
  const snapshot = await query.get();

  if (snapshot.empty) {
    return 0;
  }

  const batchSize = 500;
  let deletedCount = 0;

  // Process in batches
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = admin.firestore().batch();
    const batchDocs = snapshot.docs.slice(i, i + batchSize);

    batchDocs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += batchDocs.length;
  }

  return deletedCount;
}

// ============= REALTIME TRIGGERS =============

/**
 * Send FCM notification when a medication log is created (dose taken/skipped/missed)
 *
 * Trigger: Firestore onCreate in 'medication_logs' collection
 *
 * Flow:
 * 1. Get the log data (status, medication info)
 * 2. Get all group members from the group
 * 3. Collect FCM tokens from all members EXCEPT the user who logged it
 * 4. Send push notification to other members
 * 5. Handle errors for invalid/expired tokens
 */
export const onMedicationLogCreated = functions.firestore
  .document('medication_logs/{logId}')
  .onCreate(async (snapshot, context) => {
    try {
      const logData = snapshot.data();
      const logId = context.params.logId;

      // Log for debugging
      console.log('New medication log:', {
        id: logId,
        status: logData.status,
        medicationId: logData.medicationId,
        groupId: logData.groupId,
        elderId: logData.elderId,
        loggedBy: logData.loggedBy
      });

      // Only notify for taken, skipped, or missed status
      const notifiableStatuses = ['taken', 'skipped', 'missed'];
      if (!notifiableStatuses.includes(logData.status)) {
        console.log('Status not notifiable:', logData.status);
        return null;
      }

      // Get groupId from log
      const groupId = logData.groupId;
      if (!groupId) {
        console.error('No groupId found in medication log');
        return null;
      }

      // Get group document to find all members
      const groupDoc = await admin.firestore().collection('groups').doc(groupId).get();

      if (!groupDoc.exists) {
        console.error('Group not found:', groupId);
        return null;
      }

      const groupData = groupDoc.data();
      if (!groupData) {
        console.error('Group data is empty');
        return null;
      }

      // Get member IDs from the group, excluding the user who logged
      const memberIds: string[] = (groupData.memberIds || []).filter(
        (id: string) => id !== logData.loggedBy
      );

      if (memberIds.length === 0) {
        console.log('No other members in group to notify');
        return null;
      }

      // Get medication name
      let medicationName = 'Medication';
      if (logData.medicationId) {
        const medDoc = await admin.firestore()
          .collection('medications')
          .doc(logData.medicationId)
          .get();
        if (medDoc.exists) {
          medicationName = medDoc.data()?.name || medicationName;
        }
      }

      // Get elder name
      let elderName = 'care recipient';
      if (logData.elderId) {
        const elderDoc = await admin.firestore()
          .collection('elders')
          .doc(logData.elderId)
          .get();
        if (elderDoc.exists) {
          const elderData = elderDoc.data();
          elderName = elderData?.firstName || elderName;
        }
      }

      // Get logger name
      let loggerName = 'A caregiver';
      if (logData.loggedBy) {
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(logData.loggedBy)
          .get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          loggerName = userData?.firstName || userData?.email?.split('@')[0] || loggerName;
        }
      }

      // Collect FCM tokens from other group members
      const tokens: string[] = [];

      for (const memberId of memberIds) {
        try {
          const userDoc = await admin.firestore().collection('users').doc(memberId).get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            const userTokens = userData?.fcmTokens || [];

            if (Array.isArray(userTokens) && userTokens.length > 0) {
              tokens.push(...userTokens);
              console.log(`Added ${userTokens.length} token(s) for user ${memberId}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching user ${memberId}:`, error);
        }
      }

      console.log(`Total tokens collected: ${tokens.length}`);

      if (tokens.length === 0) {
        console.log('No FCM tokens found for other group members');
        return null;
      }

      // Build notification content based on status
      let title = '';
      let body = '';

      switch (logData.status) {
        case 'taken':
          title = '✅ Medication Taken';
          body = `${loggerName} logged ${medicationName} as taken for ${elderName}`;
          break;
        case 'skipped':
          title = '⏭️ Medication Skipped';
          body = `${loggerName} skipped ${medicationName} for ${elderName}`;
          break;
        case 'missed':
          title = '⚠️ Medication Missed';
          body = `${medicationName} was marked as missed for ${elderName}`;
          break;
      }

      // Prepare notification payload
      const payload: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
          title,
          body
        },
        data: {
          type: 'medication_logged',
          status: logData.status,
          logId: logId,
          medicationId: logData.medicationId || '',
          medicationName: medicationName,
          groupId: groupId,
          elderId: logData.elderId || '',
          url: '/dashboard/activity'
        },
        webpush: {
          fcmOptions: {
            link: '/dashboard/activity'
          },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [100, 50, 100],
            tag: `medication-log-${logId}`,
            requireInteraction: logData.status === 'missed'
          }
        }
      };

      // Send notification to all tokens
      console.log('Sending notifications to tokens:', tokens.length);
      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log('Notification sent:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // Handle invalid or expired tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = tokens[idx];
            failedTokens.push(token);

            console.error('Failed to send to token:', {
              token: token.substring(0, 20) + '...',
              error: resp.error?.message
            });

            // Remove invalid tokens
            if (
              resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered'
            ) {
              removeInvalidToken(token, memberIds).catch(err =>
                console.error('Error removing invalid token:', err)
              );
            }
          }
        });

        console.log('Failed tokens:', failedTokens.length);
      }

      return {
        success: true,
        tokensCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('Error in onMedicationLogCreated:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * Send FCM notification when a supplement log is created (dose taken/skipped/missed)
 *
 * Trigger: Firestore onCreate in 'supplement_logs' collection
 */
export const onSupplementLogCreated = functions.firestore
  .document('supplement_logs/{logId}')
  .onCreate(async (snapshot, context) => {
    try {
      const logData = snapshot.data();
      const logId = context.params.logId;

      console.log('New supplement log:', {
        id: logId,
        status: logData.status,
        supplementId: logData.supplementId,
        groupId: logData.groupId
      });

      // Only notify for taken, skipped, or missed status
      const notifiableStatuses = ['taken', 'skipped', 'missed'];
      if (!notifiableStatuses.includes(logData.status)) {
        return null;
      }

      const groupId = logData.groupId;
      if (!groupId) {
        console.error('No groupId found in supplement log');
        return null;
      }

      // Get group document
      const groupDoc = await admin.firestore().collection('groups').doc(groupId).get();
      if (!groupDoc.exists) {
        console.error('Group not found:', groupId);
        return null;
      }

      const groupData = groupDoc.data();
      if (!groupData) return null;

      // Get member IDs excluding the logger
      const memberIds: string[] = (groupData.memberIds || []).filter(
        (id: string) => id !== logData.loggedBy
      );

      if (memberIds.length === 0) {
        console.log('No other members in group to notify');
        return null;
      }

      // Get supplement name
      let supplementName = 'Supplement';
      if (logData.supplementId) {
        const suppDoc = await admin.firestore()
          .collection('supplements')
          .doc(logData.supplementId)
          .get();
        if (suppDoc.exists) {
          supplementName = suppDoc.data()?.name || supplementName;
        }
      }

      // Get elder name
      let elderName = 'care recipient';
      if (logData.elderId) {
        const elderDoc = await admin.firestore()
          .collection('elders')
          .doc(logData.elderId)
          .get();
        if (elderDoc.exists) {
          elderName = elderDoc.data()?.firstName || elderName;
        }
      }

      // Get logger name
      let loggerName = 'A caregiver';
      if (logData.loggedBy) {
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(logData.loggedBy)
          .get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          loggerName = userData?.firstName || userData?.email?.split('@')[0] || loggerName;
        }
      }

      // Collect FCM tokens
      const tokens: string[] = [];
      for (const memberId of memberIds) {
        try {
          const userDoc = await admin.firestore().collection('users').doc(memberId).get();
          if (userDoc.exists) {
            const userTokens = userDoc.data()?.fcmTokens || [];
            if (Array.isArray(userTokens)) {
              tokens.push(...userTokens);
            }
          }
        } catch (error) {
          console.error(`Error fetching user ${memberId}:`, error);
        }
      }

      if (tokens.length === 0) {
        console.log('No FCM tokens found for other group members');
        return null;
      }

      // Build notification content
      let title = '';
      let body = '';

      switch (logData.status) {
        case 'taken':
          title = '💊 Supplement Taken';
          body = `${loggerName} logged ${supplementName} as taken for ${elderName}`;
          break;
        case 'skipped':
          title = '⏭️ Supplement Skipped';
          body = `${loggerName} skipped ${supplementName} for ${elderName}`;
          break;
        case 'missed':
          title = '⚠️ Supplement Missed';
          body = `${supplementName} was marked as missed for ${elderName}`;
          break;
      }

      // Send notification
      const payload: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: {
          type: 'supplement_logged',
          status: logData.status,
          logId,
          supplementId: logData.supplementId || '',
          groupId,
          elderId: logData.elderId || '',
          url: '/dashboard/activity'
        },
        webpush: {
          fcmOptions: { link: '/dashboard/activity' },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: `supplement-log-${logId}`,
            requireInteraction: logData.status === 'missed'
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log('Supplement notification sent:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // Handle invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success &&
            (resp.error?.code === 'messaging/invalid-registration-token' ||
             resp.error?.code === 'messaging/registration-token-not-registered')) {
            removeInvalidToken(tokens[idx], memberIds).catch(err =>
              console.error('Error removing invalid token:', err)
            );
          }
        });
      }

      return { success: true, successCount: response.successCount };
    } catch (error) {
      console.error('Error in onSupplementLogCreated:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Send FCM notification when a new medication is added to a group
 *
 * Trigger: Firestore onCreate in 'medications' collection
 *
 * Flow:
 * 1. Get the medication data
 * 2. Get all group members from the group
 * 3. Collect FCM tokens from all members
 * 4. Send push notification to all tokens
 * 5. Handle errors for invalid/expired tokens
 */
export const onMedicationAdded = functions.firestore
  .document('medications/{medicationId}')
  .onCreate(async (snapshot, context) => {
    try {
      const medicationData = snapshot.data();
      const medicationId = context.params.medicationId;

      // Log for debugging
      console.log('New medication added:', {
        id: medicationId,
        name: medicationData.name,
        groupId: medicationData.groupId,
        elderId: medicationData.elderId
      });

      // Get groupId from medication
      const groupId = medicationData.groupId;
      if (!groupId) {
        console.error('No groupId found in medication');
        return null;
      }

      // Get group document to find all members
      const groupDoc = await admin.firestore().collection('groups').doc(groupId).get();

      if (!groupDoc.exists) {
        console.error('Group not found:', groupId);
        return null;
      }

      const groupData = groupDoc.data();
      if (!groupData) {
        console.error('Group data is empty');
        return null;
      }

      // Get member IDs from the group
      const memberIds: string[] = groupData.memberIds || [];

      if (memberIds.length === 0) {
        console.log('No members in group to notify');
        return null;
      }

      // Collect FCM tokens from all group members
      const tokens: string[] = [];
      const invalidUserIds: string[] = [];

      for (const memberId of memberIds) {
        try {
          const userDoc = await admin.firestore().collection('users').doc(memberId).get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            const userTokens = userData?.fcmTokens || [];

            // Add all user's tokens to the array
            if (Array.isArray(userTokens) && userTokens.length > 0) {
              tokens.push(...userTokens);
              console.log(`Added ${userTokens.length} token(s) for user ${memberId}`);
            }
          } else {
            invalidUserIds.push(memberId);
          }
        } catch (error) {
          console.error(`Error fetching user ${memberId}:`, error);
          invalidUserIds.push(memberId);
        }
      }

      console.log(`Total tokens collected: ${tokens.length}`);

      if (tokens.length === 0) {
        console.log('No FCM tokens found for group members');
        return null;
      }

      // Get elder name for notification
      let elderName = 'a care recipient';
      if (medicationData.elderId) {
        const elderData = groupData.elders?.find((e: any) => e.id === medicationData.elderId);
        if (elderData) {
          elderName = elderData.name;
        }
      }

      // Prepare notification payload
      const payload: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
          title: '💊 New Medication Added',
          body: `${medicationData.name} has been added for ${elderName}`
        },
        data: {
          type: 'medication_added',
          medicationId: medicationId,
          medicationName: medicationData.name,
          groupId: groupId,
          elderId: medicationData.elderId || '',
          url: '/dashboard/medications'
        },
        webpush: {
          fcmOptions: {
            link: '/dashboard/medications'
          },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: `medication-${medicationId}`,
            requireInteraction: false
          }
        }
      };

      // Send notification to all tokens
      console.log('Sending notifications to tokens:', tokens.length);
      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log('Notification sent:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // Handle invalid or expired tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = tokens[idx];
            failedTokens.push(token);

            console.error('Failed to send to token:', {
              token: token.substring(0, 20) + '...',
              error: resp.error?.message
            });

            // Remove invalid tokens from user profiles
            if (
              resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered'
            ) {
              // Find which user has this token and remove it
              removeInvalidToken(token, memberIds).catch(err =>
                console.error('Error removing invalid token:', err)
              );
            }
          }
        });

        console.log('Failed tokens:', failedTokens.length);
      }

      return {
        success: true,
        tokensCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('Error in onMedicationAdded:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

/**
 * Helper function to remove invalid FCM tokens from user profiles
 */
async function removeInvalidToken(token: string, userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    try {
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const fcmTokens = userData?.fcmTokens || [];

        if (fcmTokens.includes(token)) {
          // Remove the invalid token
          await userRef.update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
          });

          console.log(`Removed invalid token from user ${userId}`);
          break; // Token found and removed, exit loop
        }
      }
    } catch (error) {
      console.error(`Error removing token from user ${userId}:`, error);
    }
  }
}

// ============= AI HEALTH MONITORING SCHEDULED JOBS =============

/**
 * Hourly: Process FCM notification queue
 * Runs every hour to send queued push notifications
 */
export const processFCMNotificationQueue = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting processFCMNotificationQueue job...');

    try {
      const queueRef = admin.firestore().collection('fcm_notification_queue');
      const snapshot = await queueRef
        .where('status', '==', 'pending')
        .limit(100)
        .get();

      if (snapshot.empty) {
        console.log('No pending FCM notifications');
        return { success: true, sent: 0 };
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const notifDoc of snapshot.docs) {
        try {
          const notifData = notifDoc.data();

          // Get user's FCM tokens
          const userDoc = await admin.firestore()
            .collection('users')
            .doc(notifData.userId)
            .get();

          if (!userDoc.exists) {
            await notifDoc.ref.update({ status: 'failed', error: 'User not found' });
            failedCount++;
            continue;
          }

          const userData = userDoc.data();
          const tokens = userData?.fcmTokens || [];

          if (tokens.length === 0) {
            await notifDoc.ref.update({ status: 'failed', error: 'No FCM tokens' });
            failedCount++;
            continue;
          }

          // Send FCM notification
          const payload: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
              title: notifData.title,
              body: notifData.body
            },
            data: notifData.data || {},
            webpush: notifData.webpush || {}
          };

          const response = await admin.messaging().sendEachForMulticast(payload);

          // Update status
          await notifDoc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.Timestamp.now(),
            successCount: response.successCount,
            failureCount: response.failureCount
          });

          sentCount++;
        } catch (error) {
          console.error('Error sending FCM notification:', error);
          await notifDoc.ref.update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failedCount++;
        }
      }

      console.log(`FCM notifications sent: ${sentCount}, failed: ${failedCount}`);
      return { success: true, sent: sentCount, failed: failedCount };
    } catch (error) {
      console.error('Error in processFCMNotificationQueue:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Daily at 2 AM: Run Emergency Pattern Detection for all active elders
 */
export const runEmergencyPatternDetection = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting runEmergencyPatternDetection job...');

    try {
      // Get all active groups
      const groupsSnapshot = await admin.firestore()
        .collection('groups')
        .get();

      let patternsDetected = 0;
      let alertsCreated = 0;

      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;

        // Get all elders in this group
        const eldersSnapshot = await admin.firestore()
          .collection('elders')
          .where('groupId', '==', groupId)
          .get();

        for (const elderDoc of eldersSnapshot.docs) {
          try {
            const elderData = elderDoc.data();
            const elderId = elderDoc.id;

            // Call the detection logic (mimics detectEmergencyPatterns from client)
            const pattern = await detectEmergencyPatternForElder(
              groupId,
              elderId,
              elderData.name
            );

            if (pattern && pattern.riskScore >= 8) {
              patternsDetected++;

              // Create dashboard alert for group admin
              await admin.firestore().collection('alerts').add({
                userId: groupData.adminId,
                groupId,
                elderId,
                type: 'emergency_pattern',
                severity: pattern.severity === 'critical' ? 'critical' : 'warning',
                title: `⚠️  Emergency Pattern Detected: ${elderData.name}`,
                message: `Risk Score: ${pattern.riskScore}/15 - ${pattern.factors.length} concerning patterns detected`,
                data: {
                  patternId: pattern.id,
                  riskScore: pattern.riskScore,
                  factorCount: pattern.factors.length
                },
                actionUrl: '/dashboard/insights',
                status: 'active',
                read: false,
                dismissed: false,
                acknowledged: false,
                createdAt: admin.firestore.Timestamp.now(),
                expiresAt: admin.firestore.Timestamp.fromDate(
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                )
              });

              // Queue FCM notification
              await admin.firestore().collection('fcm_notification_queue').add({
                userId: groupData.adminId,
                groupId,
                title: `⚠️  Emergency Pattern: ${elderData.name}`,
                body: `Risk Score: ${pattern.riskScore}/15`,
                data: {
                  type: 'emergency_pattern',
                  severity: pattern.severity,
                  url: '/dashboard/insights'
                },
                webpush: {
                  fcmOptions: { link: '/dashboard/insights' },
                  notification: {
                    icon: '/icon-192x192.png',
                    requireInteraction: pattern.severity === 'critical'
                  }
                },
                status: 'pending',
                createdAt: admin.firestore.Timestamp.now()
              });

              alertsCreated++;
            }
          } catch (error) {
            console.error(`Error detecting pattern for elder ${elderDoc.id}:`, error);
          }
        }
      }

      console.log(`Emergency patterns detected: ${patternsDetected}, alerts created: ${alertsCreated}`);
      return { success: true, patternsDetected, alertsCreated };
    } catch (error) {
      console.error('Error in runEmergencyPatternDetection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Daily at 3 AM: Run Medication Refill Predictions for all medications
 */
export const runMedicationRefillPredictions = functions.pubsub
  .schedule('0 3 * * *') // Every day at 3 AM
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting runMedicationRefillPredictions job...');

    try {
      // Get all active medications
      const medicationsSnapshot = await admin.firestore()
        .collection('medications')
        .get();

      let predictionsRun = 0;
      let alertsCreated = 0;

      for (const medDoc of medicationsSnapshot.docs) {
        try {
          const medData = medDoc.data();
          const medicationId = medDoc.id;

          // Skip PRN medications
          if (medData.asNeeded) {
            continue;
          }

          // Run prediction logic
          const prediction = await predictMedicationRefill(
            medData.groupId,
            medData.elderId,
            medicationId
          );

          if (prediction && prediction.shouldAlert) {
            predictionsRun++;

            // Get group to find admin
            const groupDoc = await admin.firestore()
              .collection('groups')
              .doc(medData.groupId)
              .get();

            if (groupDoc.exists) {
              const groupData = groupDoc.data();

              // Map urgency
              const urgency = prediction.daysRemaining <= 3 ? 'critical' :
                             prediction.daysRemaining <= 7 ? 'high' :
                             prediction.daysRemaining <= 14 ? 'medium' : 'low';

              // Create dashboard alert
              await admin.firestore().collection('alerts').add({
                userId: groupData?.adminId,
                groupId: medData.groupId,
                elderId: medData.elderId,
                type: 'medication_refill',
                severity: urgency === 'critical' ? 'critical' : 'warning',
                title: urgency === 'critical' ? '🚨 Urgent: Medication Running Out' : '💊 Medication Refill Needed',
                message: `${medData.name}: ${prediction.daysRemaining} days of supply remaining`,
                data: {
                  medicationId,
                  medicationName: medData.name,
                  daysRemaining: prediction.daysRemaining,
                  urgency
                },
                actionUrl: '/dashboard/medications',
                status: 'active',
                read: false,
                dismissed: false,
                createdAt: admin.firestore.Timestamp.now(),
                expiresAt: admin.firestore.Timestamp.fromDate(
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                )
              });

              // Queue FCM if critical or high
              if (urgency === 'critical' || urgency === 'high') {
                await admin.firestore().collection('fcm_notification_queue').add({
                  userId: groupData?.adminId,
                  groupId: medData.groupId,
                  title: `💊 ${medData.name} Refill`,
                  body: `${prediction.daysRemaining} days remaining`,
                  data: {
                    type: 'medication_refill',
                    url: '/dashboard/medications'
                  },
                  webpush: {
                    fcmOptions: { link: '/dashboard/medications' },
                    notification: { icon: '/icon-192x192.png' }
                  },
                  status: 'pending',
                  createdAt: admin.firestore.Timestamp.now()
                });
              }

              alertsCreated++;
            }
          }
        } catch (error) {
          console.error(`Error predicting refill for medication ${medDoc.id}:`, error);
        }
      }

      console.log(`Refill predictions: ${predictionsRun}, alerts created: ${alertsCreated}`);
      return { success: true, predictionsRun, alertsCreated };
    } catch (error) {
      console.error('Error in runMedicationRefillPredictions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

// ============= HELPER FUNCTIONS FOR AI DETECTION =============

/**
 * Simplified emergency pattern detection
 * (Full logic would be imported from client-side detection library)
 */
async function detectEmergencyPatternForElder(
  groupId: string,
  elderId: string,
  elderName: string
): Promise<any | null> {
  // This is a simplified version. In production, you'd import the full detection logic
  // from your client-side library or duplicate it here.

  const factors = [];
  let riskScore = 0;

  // Check medication compliance (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const logsSnapshot = await admin.firestore()
    .collection('medication_logs')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .where('loggedAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
    .get();

  const totalDoses = logsSnapshot.size;
  const missedDoses = logsSnapshot.docs.filter(doc => doc.data().status === 'missed').length;

  if (totalDoses > 0) {
    const complianceRate = ((totalDoses - missedDoses) / totalDoses) * 100;

    if (complianceRate < 70) {
      factors.push({
        type: 'medication_compliance_decline',
        description: `Medication compliance dropped to ${complianceRate.toFixed(0)}% (last 7 days)`,
        points: 4,
        severity: 'critical'
      });
      riskScore += 4;
    }
  }

  // Check consecutive missed doses
  const recentMissed = logsSnapshot.docs
    .filter(doc => doc.data().status === 'missed')
    .slice(0, 3).length;

  if (recentMissed >= 3) {
    factors.push({
      type: 'consecutive_missed_doses',
      description: `${recentMissed} consecutive doses missed`,
      points: 3,
      severity: 'high'
    });
    riskScore += 3;
  }

  // Only return pattern if risk score >= 8
  if (riskScore < 8) {
    return null;
  }

  const severity = riskScore >= 12 ? 'critical' : riskScore >= 10 ? 'high' : 'medium';

  return {
    id: `pattern-${elderId}-${Date.now()}`,
    riskScore,
    severity,
    factors,
    recommendations: [
      'Contact healthcare provider if patterns persist',
      'Review medication schedule with elder',
      'Consider automated reminders'
    ],
    detectedAt: new Date()
  };
}

/**
 * Simplified medication refill prediction
 */
async function predictMedicationRefill(
  groupId: string,
  elderId: string,
  medicationId: string
): Promise<any | null> {
  // Get medication logs from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logsSnapshot = await admin.firestore()
    .collection('medication_logs')
    .where('groupId', '==', groupId)
    .where('elderId', '==', elderId)
    .where('medicationId', '==', medicationId)
    .where('loggedAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
    .get();

  if (logsSnapshot.size < 10) {
    return null; // Not enough data
  }

  const takenDoses = logsSnapshot.docs.filter(doc => doc.data().status === 'taken').length;
  const dailyUsageRate = takenDoses / 30;

  // Get medication doc
  const medDoc = await admin.firestore()
    .collection('medications')
    .doc(medicationId)
    .get();

  if (!medDoc.exists) {
    return null;
  }

  const medData = medDoc.data();
  const currentQuantity = medData?.currentQuantity || 0;

  if (dailyUsageRate === 0) {
    return null; // No usage
  }

  const daysRemaining = Math.floor(currentQuantity / dailyUsageRate);

  // Only alert if <= 14 days
  if (daysRemaining > 14) {
    return null;
  }

  return {
    medicationId,
    medicationName: medData?.name,
    currentQuantity,
    dailyUsageRate,
    daysRemaining,
    shouldAlert: true,
    estimatedRunOutDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000),
    confidence: logsSnapshot.size > 25 ? 'high' : 'medium'
  };
}

// ============= REAL-TIME NOTIFICATION PROCESSING =============

/**
 * Process notification_queue in real-time and send FCM push notifications immediately
 * Trigger: Firestore onCreate in 'notification_queue' collection
 *
 * This handles join requests, alerts, and other notifications that need immediate delivery.
 */
export const processNotificationQueue = functions.firestore
  .document('notification_queue/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notificationId = context.params.notificationId;
    const notificationData = snapshot.data();

    console.log('Processing notification:', {
      id: notificationId,
      type: notificationData.type,
      userId: notificationData.userId
    });

    try {
      // Get user's FCM tokens
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(notificationData.userId)
        .get();

      if (!userDoc.exists) {
        console.warn('User not found:', notificationData.userId);
        await snapshot.ref.update({
          status: 'failed',
          error: 'User not found',
          processedAt: admin.firestore.Timestamp.now()
        });
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens || [];

      if (fcmTokens.length === 0) {
        console.warn('No FCM tokens for user:', notificationData.userId);
        await snapshot.ref.update({
          status: 'no_tokens',
          processedAt: admin.firestore.Timestamp.now()
        });
        return { success: false, error: 'No FCM tokens' };
      }

      // Prepare FCM payload
      const payload: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: notificationData.title || 'MyGuide Health',
          body: notificationData.body || ''
        },
        data: {
          type: notificationData.type || 'general',
          ...(notificationData.data || {}),
          notificationId: notificationId
        },
        webpush: {
          fcmOptions: {
            link: notificationData.data?.link || '/dashboard'
          },
          notification: {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: `notification-${notificationData.type}-${notificationId}`,
            requireInteraction: notificationData.type === 'pending_approval'
          }
        }
      };

      // Send FCM notification
      console.log('Sending FCM to tokens:', fcmTokens.length);
      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log('FCM response:', {
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            console.error('Failed to send to token:', {
              token: fcmTokens[idx]?.substring(0, 20) + '...',
              error: resp.error?.message
            });

            // Remove invalid tokens
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              admin.firestore()
                .collection('users')
                .doc(notificationData.userId)
                .update({
                  fcmTokens: admin.firestore.FieldValue.arrayRemove(fcmTokens[idx])
                })
                .catch(err => console.error('Error removing invalid token:', err));
            }
          }
        });
      }

      // Update notification status
      await snapshot.ref.update({
        status: 'sent',
        processedAt: admin.firestore.Timestamp.now(),
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('Error processing notification:', error);

      await snapshot.ref.update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: admin.firestore.Timestamp.now()
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// ============= SMS DELIVERY VIA TWILIO - DISABLED =============
// Currently using FCM only. Uncomment when Twilio is configured.
// To enable:
// 1. Uncomment Twilio imports at top of file
// 2. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// 3. Uncomment the processSMSQueue function below
//
// /**
//  * Process SMS queue and send via Twilio
//  * Trigger: Firestore onCreate in 'sms_queue' collection
//  *
//  * This function is triggered when a document is added to sms_queue.
//  * It sends the SMS via Twilio API and updates the delivery status.
//  */
// export const processSMSQueue = functions.firestore
//   .document('sms_queue/{messageId}')
//   .onCreate(async (snapshot, context) => {
//     const messageId = context.params.messageId;
//     const messageData = snapshot.data();
//
//     console.log('Processing SMS:', {
//       id: messageId,
//       to: messageData.to
//     });
//
//     try {
//       // Initialize Twilio client with environment parameters
//       const accountSid = twilioAccountSid.value();
//       const authToken = twilioAuthToken.value();
//       const fromNumber = twilioPhoneNumber.value();
//
//       // Validate Twilio configuration
//       if (!accountSid || !authToken || !fromNumber) {
//         throw new Error('Twilio credentials not configured in environment');
//       }
//
//       // Create Twilio client
//       const client = twilio.default(accountSid, authToken);
//
//       // Send SMS via Twilio
//       const message = await client.messages.create({
//         body: messageData.body,
//         from: fromNumber,
//         to: messageData.to
//       });
//
//       console.log('✅ SMS sent successfully:', {
//         messageId: message.sid,
//         status: message.status,
//         to: messageData.to
//       });
//
//       // Update document with success status
//       await snapshot.ref.update({
//         delivery: {
//           state: 'SUCCESS',
//           endTime: admin.firestore.Timestamp.now(),
//           twilioMessageSid: message.sid,
//           twilioStatus: message.status
//         }
//       });
//
//       return { success: true, twilioSid: message.sid };
//     } catch (error) {
//       console.error('❌ Error sending SMS:', error);
//
//       // Update document with error status
//       await snapshot.ref.update({
//         delivery: {
//           state: 'ERROR',
//           endTime: admin.firestore.Timestamp.now(),
//           error: error instanceof Error ? error.message : 'Unknown error'
//         }
//       });
//
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       };
//     }
//   });
// ================================================================

// ============= MEDICATION REMINDERS =============

/**
 * Scheduled Job: Check and trigger medication reminders
 * Runs every 60 minutes to check for due reminders
 *
 * Flow:
 * 1. Query reminder_schedules where scheduledTime is within last hour
 * 2. For each reminder, create a user_notification
 * 3. Optionally queue FCM push notification
 * 4. Mark reminder as triggered for today
 */
export const checkMedicationReminders = functions.pubsub
  .schedule('0 * * * *') // Every hour at :00
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting checkMedicationReminders job...');

    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get all enabled reminder schedules
      const remindersSnapshot = await admin.firestore()
        .collection('reminder_schedules')
        .where('enabled', '==', true)
        .get();

      if (remindersSnapshot.empty) {
        console.log('No active reminders found');
        return { success: true, processed: 0 };
      }

      let processedCount = 0;
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminder = reminderDoc.data();
        const reminderId = reminderDoc.id;

        // Check if already triggered today
        const lastTriggeredDate = reminder.lastTriggeredDate;
        if (lastTriggeredDate === today) {
          continue; // Already fired today
        }

        // Get scheduled time and check if it's within our window
        const scheduledTime = reminder.scheduledTime?.toDate();
        if (!scheduledTime) continue;

        // Extract hour and minute from scheduled time
        const scheduledHour = scheduledTime.getHours();
        const scheduledMinute = scheduledTime.getMinutes();

        // Create today's scheduled datetime
        const todayScheduled = new Date(now);
        todayScheduled.setHours(scheduledHour, scheduledMinute, 0, 0);

        // Check if scheduled time is within our 1-hour window
        if (todayScheduled > oneHourAgo && todayScheduled <= now) {
          console.log(`Triggering reminder ${reminderId} scheduled for ${scheduledHour}:${scheduledMinute}`);

          // Get elder info for notification message
          let elderName = 'your loved one';
          if (reminder.elderId) {
            const elderDoc = await admin.firestore()
              .collection('elders')
              .doc(reminder.elderId)
              .get();
            if (elderDoc.exists) {
              const elderData = elderDoc.data();
              elderName = elderData?.firstName || elderName;
            }
          }

          // Create notification for each recipient
          for (const recipientId of reminder.recipients || []) {
            await admin.firestore().collection('user_notifications').add({
              userId: recipientId,
              groupId: reminder.groupId,
              elderId: reminder.elderId || null,
              type: 'medication_reminder',
              title: 'Medication Reminder',
              message: `Time to give ${elderName} their medication`,
              priority: 'high',
              actionUrl: `/dashboard/activity?elder=${reminder.elderId}`,
              read: false,
              dismissed: false,
              actionRequired: true,
              sourceCollection: 'reminder_schedules',
              sourceId: reminderId,
              expiresAt: null,
              createdAt: admin.firestore.Timestamp.now()
            });

            // Queue FCM push notification
            await admin.firestore().collection('fcm_notification_queue').add({
              userId: recipientId,
              title: 'Medication Reminder',
              body: `Time to give ${elderName} their medication`,
              data: {
                type: 'medication_reminder',
                groupId: reminder.groupId,
                elderId: reminder.elderId,
                reminderId: reminderId
              },
              status: 'pending',
              createdAt: admin.firestore.Timestamp.now()
            });
          }

          // Mark reminder as triggered today
          await reminderDoc.ref.update({
            lastTriggeredDate: today,
            lastTriggeredAt: admin.firestore.Timestamp.now()
          });

          processedCount++;
        }
      }

      console.log(`Processed ${processedCount} reminders`);
      return { success: true, processed: processedCount };
    } catch (error) {
      console.error('Error in checkMedicationReminders:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

// ============= MISSED DOSE DETECTION =============

/**
 * Scheduled Job: Detect missed medication doses
 * Runs hourly at :00 (e.g., 8:00, 9:00, 10:00)
 *
 * Flow:
 * 1. For each group/elder, check medications scheduled in the past hour
 * 2. If no medication_log exists for that time, it's missed
 * 3. Create user_notification for group admin
 * 4. Create alert in alerts collection
 */
export const detectMissedDoses = functions.pubsub
  .schedule('0 * * * *') // Every hour at :00
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting detectMissedDoses job...');

    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Get all active groups
      const groupsSnapshot = await admin.firestore()
        .collection('groups')
        .get();

      let totalMissed = 0;

      for (const groupDoc of groupsSnapshot.docs) {
        const group = groupDoc.data();
        const groupId = groupDoc.id;
        const adminId = group.adminId;

        // Get elders in this group
        const eldersSnapshot = await admin.firestore()
          .collection('elders')
          .where('groupId', '==', groupId)
          .get();

        for (const elderDoc of eldersSnapshot.docs) {
          const elder = elderDoc.data();
          const elderId = elderDoc.id;
          const elderName = elder.firstName || 'Elder';

          // Get active medications for this elder
          const medsSnapshot = await admin.firestore()
            .collection('medications')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('status', '==', 'active')
            .get();

          const missedMeds: string[] = [];

          for (const medDoc of medsSnapshot.docs) {
            const med = medDoc.data();
            const medId = medDoc.id;

            // Get scheduled times from frequency
            const scheduledTimes = med.frequency?.times || [];

            for (const timeStr of scheduledTimes) {
              // Parse time string (e.g., "08:00", "2:30 PM")
              const scheduledDate = parseTimeToDate(timeStr, now);
              if (!scheduledDate) continue;

              // Check if this time was in the past hour window
              if (scheduledDate >= twoHoursAgo && scheduledDate < oneHourAgo) {
                // Check if there's a log for this medication around this time
                const windowStart = new Date(scheduledDate.getTime() - 30 * 60 * 1000);
                const windowEnd = new Date(scheduledDate.getTime() + 60 * 60 * 1000);

                const logsSnapshot = await admin.firestore()
                  .collection('medication_logs')
                  .where('groupId', '==', groupId)
                  .where('elderId', '==', elderId)
                  .where('medicationId', '==', medId)
                  .where('scheduledTime', '>=', admin.firestore.Timestamp.fromDate(windowStart))
                  .where('scheduledTime', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
                  .limit(1)
                  .get();

                if (logsSnapshot.empty) {
                  missedMeds.push(med.name);
                }
              }
            }
          }

          // If there are missed medications, create notification
          if (missedMeds.length > 0) {
            const severity = missedMeds.length >= 3 ? 'high' : missedMeds.length >= 2 ? 'medium' : 'low';
            const priority = severity === 'high' ? 'critical' : severity === 'medium' ? 'high' : 'medium';

            // Create user notification
            await admin.firestore().collection('user_notifications').add({
              userId: adminId,
              groupId: groupId,
              elderId: elderId,
              type: 'missed_dose',
              title: 'Missed Dose Alert',
              message: `${elderName} missed: ${missedMeds.join(', ')}`,
              priority: priority,
              actionUrl: `/dashboard/activity?elder=${elderId}`,
              read: false,
              dismissed: false,
              actionRequired: true,
              expiresAt: null,
              createdAt: admin.firestore.Timestamp.now()
            });

            // Create alert in alerts collection
            await admin.firestore().collection('alerts').add({
              groupId: groupId,
              elderId: elderId,
              type: 'missed_dose',
              severity: severity,
              title: 'Missed Medication Dose',
              message: `${elderName} missed ${missedMeds.length} medication(s): ${missedMeds.join(', ')}`,
              data: {
                missedMedications: missedMeds,
                detectedAt: now.toISOString()
              },
              status: 'active',
              createdAt: admin.firestore.Timestamp.now()
            });

            // Queue FCM push notification
            await admin.firestore().collection('fcm_notification_queue').add({
              userId: adminId,
              title: 'Missed Dose Alert',
              body: `${elderName} missed: ${missedMeds.join(', ')}`,
              data: {
                type: 'missed_dose',
                groupId: groupId,
                elderId: elderId
              },
              status: 'pending',
              createdAt: admin.firestore.Timestamp.now()
            });

            totalMissed += missedMeds.length;
          }
        }
      }

      console.log(`Detected ${totalMissed} missed doses`);
      return { success: true, missedCount: totalMissed };
    } catch (error) {
      console.error('Error in detectMissedDoses:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Helper: Parse time string to Date object for today
 */
function parseTimeToDate(timeStr: string, referenceDate: Date): Date | null {
  try {
    // Handle formats like "08:00", "8:00 AM", "2:30 PM"
    let hours = 0;
    let minutes = 0;

    const lowerTime = timeStr.toLowerCase().trim();

    if (lowerTime.includes('am') || lowerTime.includes('pm')) {
      // 12-hour format
      const isPM = lowerTime.includes('pm');
      const timePart = lowerTime.replace(/am|pm/gi, '').trim();
      const parts = timePart.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1] ? parseInt(parts[1], 10) : 0;

      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      // 24-hour format
      const parts = timeStr.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    }

    if (isNaN(hours) || isNaN(minutes)) return null;

    const result = new Date(referenceDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  } catch {
    return null;
  }
}

// ============= WEEKLY SUMMARY AUTO-GENERATION =============

/**
 * Scheduled Job: Generate weekly summaries
 * Runs every Sunday at 8 AM
 *
 * Creates weekly summary and notification for each elder
 */
export const generateWeeklySummaries = functions.pubsub
  .schedule('0 8 * * 0') // Every Sunday at 8 AM
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('Starting generateWeeklySummaries job...');

    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      // Get all active groups
      const groupsSnapshot = await admin.firestore()
        .collection('groups')
        .get();

      let summariesGenerated = 0;

      for (const groupDoc of groupsSnapshot.docs) {
        const group = groupDoc.data();
        const groupId = groupDoc.id;
        const adminId = group.adminId;

        // Get elders in this group
        const eldersSnapshot = await admin.firestore()
          .collection('elders')
          .where('groupId', '==', groupId)
          .get();

        for (const elderDoc of eldersSnapshot.docs) {
          const elder = elderDoc.data();
          const elderId = elderDoc.id;
          const elderName = elder.firstName || 'Elder';

          // Calculate medication compliance
          const logsSnapshot = await admin.firestore()
            .collection('medication_logs')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(weekStart))
            .get();

          const totalDoses = logsSnapshot.size;
          const takenDoses = logsSnapshot.docs.filter(doc =>
            doc.data().status === 'taken'
          ).length;
          const complianceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

          // Create summary document
          const summaryRef = await admin.firestore().collection('weeklySummaries').add({
            groupId: groupId,
            elderId: elderId,
            elderName: elderName,
            weekStart: admin.firestore.Timestamp.fromDate(weekStart),
            weekEnd: admin.firestore.Timestamp.fromDate(now),
            medicationCompliance: complianceRate,
            totalDoses: totalDoses,
            takenDoses: takenDoses,
            missedDoses: totalDoses - takenDoses,
            createdAt: admin.firestore.Timestamp.now()
          });

          // Create notification
          const priority = complianceRate < 70 ? 'high' : 'low';
          await admin.firestore().collection('user_notifications').add({
            userId: adminId,
            groupId: groupId,
            elderId: elderId,
            type: 'weekly_summary',
            title: 'Weekly Summary Ready',
            message: `${elderName}: ${complianceRate}% medication compliance`,
            priority: priority,
            actionUrl: `/dashboard/insights?elder=${elderId}`,
            read: false,
            dismissed: false,
            actionRequired: complianceRate < 70,
            sourceCollection: 'weeklySummaries',
            sourceId: summaryRef.id,
            expiresAt: null,
            createdAt: admin.firestore.Timestamp.now()
          });

          summariesGenerated++;
        }
      }

      console.log(`Generated ${summariesGenerated} weekly summaries`);
      return { success: true, count: summariesGenerated };
    } catch (error) {
      console.error('Error in generateWeeklySummaries:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

// ============= EMAIL TEMPLATE FUNCTIONS =============

interface DailyReportEmailData {
  elderName: string;
  date: string;
  medicationsTotal: number;
  medicationsTaken: number;
  medicationsMissed: number;
  supplementsTaken: number;
  mealsLogged: number;
  activeAlerts: number;
  summaryText: string;
  alertMessages?: string[];
}

/**
 * Generate HTML email for daily family notes
 * Mobile-responsive with inline CSS (email clients don't support external CSS)
 * Uses MyGuide Health brand colors
 */
function generateDailyReportEmailHTML(data: DailyReportEmailData): string {
  const brandColor = '#2563eb'; // Blue-600
  const successColor = '#16a34a'; // Green-600
  const warningColor = '#dc2626'; // Red-600
  const bgColor = '#f3f4f6'; // Gray-100
  const cardBg = '#ffffff';
  const textColor = '#1f2937'; // Gray-800
  const textMuted = '#6b7280'; // Gray-500

  // Determine medication status color
  const medStatusColor = data.medicationsMissed > 0 ? warningColor : successColor;
  const medStatusText = data.medicationsMissed === 0
    ? '✓ All medications taken'
    : `⚠ ${data.medicationsMissed} missed`;

  // Build alert section if there are active alerts
  let alertSection = '';
  if (data.activeAlerts > 0) {
    alertSection = `
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; border-left: 4px solid ${warningColor};">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0; color: ${warningColor}; font-weight: 600; font-size: 14px;">
                  ⚠️ ${data.activeAlerts} Active Alert${data.activeAlerts > 1 ? 's' : ''}
                </p>
                <p style="margin: 8px 0 0 0; color: ${textColor}; font-size: 14px;">
                  Please check the app for details and recommended actions.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Care Update - ${data.elderName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${brandColor}; padding: 24px; text-align: center;">
              <img src="https://www.myguide.health/favicon-32x32.png" alt="MyGuide Health" style="width: 32px; height: 32px; margin-bottom: 8px;">
              <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">Daily Care Update</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${data.elderName} • ${data.date}</p>
            </td>
          </tr>

          <!-- Summary Banner -->
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <p style="margin: 0; color: ${textColor}; font-size: 16px; font-weight: 500;">${data.summaryText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${alertSection}

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Medications Card -->
                  <td width="50%" style="padding: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${brandColor};">${data.medicationsTaken}/${data.medicationsTotal}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Medications</p>
                          <p style="margin: 8px 0 0 0; font-size: 12px; color: ${medStatusColor}; font-weight: 500;">${medStatusText}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Supplements Card -->
                  <td width="50%" style="padding: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${brandColor};">${data.supplementsTaken}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Supplements</p>
                          <p style="margin: 8px 0 0 0; font-size: 12px; color: ${successColor}; font-weight: 500;">Logged today</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <!-- Meals Card -->
                  <td colspan="2" style="padding: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${brandColor};">${data.mealsLogged}</p>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Meals Logged</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 20px 24px 20px; text-align: center;">
              <a href="https://www.myguide.health/dashboard/activity" style="display: inline-block; background-color: ${brandColor}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                View Full Details
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: ${bgColor}; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: ${textMuted}; font-size: 12px;">
                You're receiving this because you're a member of ${data.elderName}'s care team on MyGuide Health.
              </p>
              <p style="margin: 8px 0 0 0; color: ${textMuted}; font-size: 12px;">
                <a href="https://www.myguide.health/dashboard/settings" style="color: ${brandColor}; text-decoration: none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Format date for email display
 */
function formatDateForEmail(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

// ============= DAILY FAMILY NOTES =============

/**
 * Core logic for sending daily family notes.
 * Extracted to be reusable by multiple scheduled triggers.
 * Includes duplicate prevention - skips if already sent today.
 * Sends both FCM push notifications AND email via Trigger Email extension.
 */
async function processDailyFamilyNotes(triggerTime: string): Promise<{ success: boolean; notesSent: number; skipped: number; error?: string }> {
  console.log(`Starting processDailyFamilyNotes (${triggerTime} trigger)...`);

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = admin.firestore.Timestamp.fromDate(todayStart);

    // Get all active groups
    const groupsSnapshot = await admin.firestore()
      .collection('groups')
      .get();

    let notesSent = 0;
    let skipped = 0;

    for (const groupDoc of groupsSnapshot.docs) {
      const group = groupDoc.data();
      const groupId = groupDoc.id;
      const memberIds: string[] = group.memberIds || [];
      const adminId = group.adminId;

      // Include admin in notification recipients
      const allRecipients = adminId && !memberIds.includes(adminId)
        ? [adminId, ...memberIds]
        : memberIds;

      if (allRecipients.length === 0) continue;

      // Get elders in this group
      const eldersSnapshot = await admin.firestore()
        .collection('elders')
        .where('groupId', '==', groupId)
        .get();

      for (const elderDoc of eldersSnapshot.docs) {
        const elder = elderDoc.data();
        const elderId = elderDoc.id;
        const elderName = elder.firstName || 'your loved one';

        // ============= DUPLICATE PREVENTION =============
        // Check if daily note already sent for this elder today
        const existingNoteSnapshot = await admin.firestore()
          .collection('daily_family_notes')
          .where('groupId', '==', groupId)
          .where('elderId', '==', elderId)
          .where('date', '==', todayTimestamp)
          .limit(1)
          .get();

        if (!existingNoteSnapshot.empty) {
          console.log(`Daily note already sent for elder ${elderId} today, skipping`);
          skipped++;
          continue;
        }
        // ================================================

        // Gather today's activity data
        const [medsSnapshot, supplementsSnapshot, dietSnapshot, alertsSnapshot] = await Promise.all([
          // Medication logs for today
          admin.firestore()
            .collection('medication_logs')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('createdAt', '>=', todayTimestamp)
            .get(),
          // Supplement logs for today
          admin.firestore()
            .collection('supplement_logs')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('createdAt', '>=', todayTimestamp)
            .get(),
          // Diet entries for today
          admin.firestore()
            .collection('diet_entries')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('createdAt', '>=', todayTimestamp)
            .get(),
          // Active alerts for this elder
          admin.firestore()
            .collection('alerts')
            .where('groupId', '==', groupId)
            .where('elderId', '==', elderId)
            .where('status', '==', 'active')
            .limit(3)
            .get()
        ]);

        // Calculate stats
        const totalMeds = medsSnapshot.size;
        const takenMeds = medsSnapshot.docs.filter(doc => doc.data().status === 'taken').length;
        const missedMeds = medsSnapshot.docs.filter(doc => doc.data().status === 'missed').length;
        const supplementsTaken = supplementsSnapshot.size;
        const mealsLogged = dietSnapshot.size;
        const activeAlerts = alertsSnapshot.size;

        // Skip if no activity today
        if (totalMeds === 0 && supplementsTaken === 0 && mealsLogged === 0) {
          console.log(`No activity for elder ${elderId}, skipping daily note`);
          continue;
        }

        // Generate summary message
        const summaryParts: string[] = [];

        // Medication summary
        if (totalMeds > 0) {
          if (missedMeds === 0) {
            summaryParts.push(`All ${takenMeds} medication${takenMeds > 1 ? 's' : ''} taken`);
          } else {
            summaryParts.push(`${takenMeds}/${totalMeds} meds taken, ${missedMeds} missed`);
          }
        }

        // Supplements
        if (supplementsTaken > 0) {
          summaryParts.push(`${supplementsTaken} supplement${supplementsTaken > 1 ? 's' : ''}`);
        }

        // Diet
        if (mealsLogged > 0) {
          summaryParts.push(`${mealsLogged} meal${mealsLogged > 1 ? 's' : ''} logged`);
        }

        const summaryText = summaryParts.join(' • ');

        // Determine priority based on missed doses and alerts
        const priority = missedMeds > 0 || activeAlerts > 0 ? 'high' : 'low';
        const requiresAction = missedMeds > 0 || activeAlerts > 0;

        // Store the daily note summary
        const noteRef = await admin.firestore().collection('daily_family_notes').add({
          groupId: groupId,
          elderId: elderId,
          elderName: elderName,
          date: todayTimestamp,
          stats: {
            medicationsTotal: totalMeds,
            medicationsTaken: takenMeds,
            medicationsMissed: missedMeds,
            supplementsTaken: supplementsTaken,
            mealsLogged: mealsLogged,
            activeAlerts: activeAlerts
          },
          summary: summaryText,
          triggerTime: triggerTime, // Track which trigger sent this
          createdAt: admin.firestore.Timestamp.now()
        });

        // Format date for email
        const formattedDate = formatDateForEmail(now);

        // Prepare email data (same for all recipients for this elder)
        const emailData: DailyReportEmailData = {
          elderName,
          date: formattedDate,
          medicationsTotal: totalMeds,
          medicationsTaken: takenMeds,
          medicationsMissed: missedMeds,
          supplementsTaken,
          mealsLogged,
          activeAlerts,
          summaryText
        };

        // Create notification for each recipient
        for (const recipientId of allRecipients) {
          // In-app notification
          await admin.firestore().collection('user_notifications').add({
            userId: recipientId,
            groupId: groupId,
            elderId: elderId,
            type: 'daily_family_note',
            title: `Daily Update: ${elderName}`,
            message: summaryText,
            priority: priority,
            actionUrl: `/dashboard/activity?elder=${elderId}`,
            read: false,
            dismissed: false,
            actionRequired: requiresAction,
            sourceCollection: 'daily_family_notes',
            sourceId: noteRef.id,
            expiresAt: null,
            createdAt: admin.firestore.Timestamp.now()
          });

          // Queue FCM push notification
          await admin.firestore().collection('fcm_notification_queue').add({
            userId: recipientId,
            title: `Daily Update: ${elderName}`,
            body: summaryText,
            data: {
              type: 'daily_family_note',
              groupId: groupId,
              elderId: elderId,
              noteId: noteRef.id
            },
            status: 'pending',
            createdAt: admin.firestore.Timestamp.now()
          });

          // ============= SEND EMAIL VIA TRIGGER EMAIL EXTENSION =============
          try {
            // Get user's email from their profile
            const userDoc = await admin.firestore()
              .collection('users')
              .doc(recipientId)
              .get();

            if (userDoc.exists) {
              const userData = userDoc.data();
              const userEmail = userData?.email;

              if (userEmail) {
                // Write to 'mail' collection - Firebase Trigger Email extension will send
                await admin.firestore().collection('mail').add({
                  to: userEmail,
                  message: {
                    subject: `Daily Care Update for ${elderName} - ${formattedDate}`,
                    html: generateDailyReportEmailHTML(emailData)
                  },
                  createdAt: admin.firestore.Timestamp.now(),
                  metadata: {
                    type: 'daily_family_note',
                    groupId: groupId,
                    elderId: elderId,
                    noteId: noteRef.id,
                    recipientId: recipientId
                  }
                });
                console.log(`Email queued for user ${recipientId} (${userEmail})`);
              } else {
                console.log(`Skipping email for user ${recipientId} - no email on file`);
              }
            } else {
              console.log(`Skipping email for user ${recipientId} - user document not found`);
            }
          } catch (emailError) {
            // Log error but don't fail the entire function
            console.error(`Error queuing email for user ${recipientId}:`, emailError);
          }
          // ================================================================
        }

        notesSent++;
        console.log(`Sent daily note for elder ${elderId}: ${summaryText}`);
      }
    }

    console.log(`Daily family notes complete: ${notesSent} sent, ${skipped} skipped (already sent)`);
    return { success: true, notesSent, skipped };
  } catch (error) {
    console.error('Error in processDailyFamilyNotes:', error);
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Scheduled Job: Send Daily Family Notes - Primary (7 PM)
 * Runs every day at 7 PM local time with 2 automatic retries
 *
 * Generates a summary of the day's care activities for each elder:
 * - Medications taken/missed
 * - Supplements logged
 * - Diet entries
 * - Any incidents or alerts
 *
 * Sends notification to all family members in the group
 */
export const sendDailyFamilyNotes = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB',
    // Retry policy: retry up to 2 times on failure
    failurePolicy: true
  })
  .pubsub
  .schedule('0 19 * * *') // Every day at 7 PM (19:00)
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    return processDailyFamilyNotes('7PM');
  });

/**
 * Scheduled Job: Send Daily Family Notes - Fallback 1 (8 PM)
 * Runs every day at 8 PM as first fallback
 * Skips if notes already sent at 7 PM (duplicate prevention)
 */
export const sendDailyFamilyNotes8PM = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB',
    failurePolicy: true
  })
  .pubsub
  .schedule('0 20 * * *') // Every day at 8 PM (20:00)
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    return processDailyFamilyNotes('8PM-fallback');
  });

/**
 * Scheduled Job: Send Daily Family Notes - Fallback 2 (9 PM)
 * Runs every day at 9 PM as final fallback
 * Skips if notes already sent at 7 PM or 8 PM (duplicate prevention)
 */
export const sendDailyFamilyNotes9PM = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB',
    failurePolicy: true
  })
  .pubsub
  .schedule('0 21 * * *') // Every day at 9 PM (21:00)
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    return processDailyFamilyNotes('9PM-fallback');
  });
