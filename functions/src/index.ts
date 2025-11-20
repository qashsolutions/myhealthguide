/**
 * Firebase Cloud Functions for MyGuide Health
 * Handles push notifications and background tasks
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

          // Calculate grace period end (48 hours from now)
          const gracePeriodEnd = new Date(now);
          gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 48);

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
          body = 'Your 14-day trial ends in 3 days. Subscribe now to keep your health data and continue using all features.';
        } else if (daysRemaining === 1) {
          shouldNotify = true;
          title = '⚠️ Trial Ending Tomorrow';
          body = 'Your trial ends tomorrow! Subscribe now or download your data before it\'s deleted in 48 hours.';
        } else if (daysRemaining === 0) {
          shouldNotify = true;
          title = '🚨 Trial Expires Today';
          body = 'Your trial expires tonight at midnight. Subscribe now or export your data - it will be deleted in 48 hours!';
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
