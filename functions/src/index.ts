/**
 * Firebase Cloud Functions for MyGuide Health
 * Handles push notifications and background tasks
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

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
