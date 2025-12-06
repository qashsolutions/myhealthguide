/**
 * Firebase Cloud Messaging (FCM) Utility
 * Handles web push notifications
 */

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from './config';

let messaging: Messaging | null = null;

/**
 * Initialize Firebase Messaging
 * Only works in browser context
 */
export const initializeMessaging = (): Messaging | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    if (!messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this browser');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Get FCM token for this device
 * @param userId - User ID to associate the token with
 * @returns FCM token or null
 */
export const getFCMToken = async (userId?: string): Promise<string | null> => {
  try {
    const messagingInstance = initializeMessaging();
    if (!messagingInstance) {
      console.warn('Messaging not initialized');
      return null;
    }

    // Check if we have permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Get VAPID key from environment
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
      } catch (swError) {
        console.error('Service Worker registration failed:', swError);
      }
    }

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    });

    if (token) {
      console.log('FCM Token obtained:', token.substring(0, 20) + '...');

      // Save token to user profile if userId provided
      if (userId) {
        await saveFCMTokenToUser(userId, token);
      }

      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Save FCM token to user's Firestore document
 */
const saveFCMTokenToUser = async (userId: string, token: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      lastTokenUpdate: new Date()
    });
    console.log('FCM token saved to user profile');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

/**
 * Setup foreground message listener
 * Call this in your main app component
 */
export const setupForegroundMessageListener = (
  onMessageReceived: (payload: any) => void
): (() => void) | null => {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    return null;
  }

  // Listen for foreground messages
  const unsubscribe = onMessage(messagingInstance, (payload) => {
    console.log('Foreground message received:', payload);

    // Show notification if app is in foreground
    if (payload.notification) {
      const { title, body } = payload.notification;

      // You can show a custom in-app notification here
      // or use the browser's Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title || 'MyGuide Health', {
          body: body || '',
          icon: '/icon-192x192.png',
          data: payload.data
        });
      }
    }

    // Call custom handler
    onMessageReceived(payload);
  });

  return unsubscribe;
};

/**
 * Check if notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission | null => {
  if (!isNotificationSupported()) {
    return null;
  }
  return Notification.permission;
};

/**
 * Remove FCM token from user profile (e.g., on logout)
 */
export const removeFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await doc(db, 'users', userId);

    // This requires custom logic to remove specific token from array
    // For now, we can clear all tokens or implement array-remove logic
    console.log('Token removal requested for user:', userId);
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};

const fcmService = {
  initializeMessaging,
  requestNotificationPermission,
  getFCMToken,
  setupForegroundMessageListener,
  isNotificationSupported,
  getNotificationPermission,
  removeFCMToken
};

export default fcmService;
