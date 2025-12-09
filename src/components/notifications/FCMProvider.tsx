'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFCMToken, setupForegroundMessageListener } from '@/lib/firebase/fcm';

/**
 * FCM Provider Component
 * Handles Firebase Cloud Messaging setup after user authentication
 * - Requests notification permission
 * - Gets and saves FCM token to user profile
 * - Sets up foreground message listener
 *
 * NOTE: Only requests permission for users with active subscriptions
 * to avoid showing browser notification prompts to trial/free users
 */
export function FCMProvider() {
  const { user } = useAuth();

  useEffect(() => {
    // Only setup FCM if user is authenticated
    if (!user?.id) {
      return;
    }

    // Only request notification permission for users with a subscription
    // (includes 'active' and 'trial' with a Stripe subscription)
    const hasSubscription = user.subscriptionStatus === 'active' ||
      (user.subscriptionStatus === 'trial' && user.stripeSubscriptionId);

    // Setup FCM token
    const setupFCM = async () => {
      // Skip FCM setup for non-subscribed users to avoid browser permission prompt
      if (!hasSubscription) {
        console.log('ℹ️ Skipping FCM setup - user not subscribed');
        return;
      }

      try {
        console.log('Setting up FCM for user:', user.id);

        // Get FCM token and save to Firestore
        const token = await getFCMToken(user.id);

        if (token) {
          console.log('✅ FCM token obtained and saved to user profile');
        } else {
          console.log('ℹ️ FCM token not obtained (permission may be denied)');
        }
      } catch (error) {
        console.error('Error setting up FCM:', error);
      }
    };

    // Call setup function
    setupFCM();

    // Setup foreground message listener
    const unsubscribe = setupForegroundMessageListener((payload) => {
      console.log('📬 Foreground notification received:', payload);

      // Extract notification data
      const { notification, data } = payload;

      // Show browser notification if available
      if (notification) {
        const { title, body } = notification;

        // You can customize this to show a toast/banner instead
        if ('Notification' in window && Notification.permission === 'granted') {
          const notif = new Notification(title || 'MyGuide Health', {
            body: body || '',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: data?.tag || 'myguide-notification',
            data: data
          });

          // Handle notification click
          notif.onclick = () => {
            window.focus();
            if (data?.url) {
              window.location.href = data.url;
            }
            notif.close();
          };
        }
      }

      // You can also dispatch a custom event here to show in-app notifications
      // Example: window.dispatchEvent(new CustomEvent('fcm-message', { detail: payload }));
    });

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id]);

  // This component doesn't render anything
  return null;
}
