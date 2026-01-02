// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Disable navigation preload to avoid "preloadResponse" errors
// This service worker only handles push notifications, not navigation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Disable navigation preload if supported
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (e) {
          // Ignore errors if already disabled
        }
      }
      // Claim all clients immediately
      await self.clients.claim();
    })()
  );
});

// Skip waiting to activate new service worker immediately
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Handle fetch events - properly consume preloadResponse to avoid cancellation errors
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // If there's a preload response, wait for it to settle before fetching
        // This prevents "preloadResponse cancelled" errors
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }
        } catch (e) {
          // Preload not available, continue with normal fetch
        }
        return fetch(event.request);
      })()
    );
  }
  // Let other requests pass through normally (don't call respondWith)
});

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: 'AIzaSyDT-wnOiaMtzb72nXfT-QvuoKpEHis9C0k',
  authDomain: 'healthguide-bc3ba.firebaseapp.com',
  projectId: 'healthguide-bc3ba',
  storageBucket: 'healthguide-bc3ba.firebasestorage.app',
  messagingSenderId: '401590339271',
  appId: '1:401590339271:web:6e9586220e7da02c5ca0e2'
};

// Initialize Firebase app in service worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'MyGuide Health';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: payload.data?.actions ? JSON.parse(payload.data.actions) : []
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Get the URL to open from the notification data
  const urlToOpen = event.notification.data?.url || '/dashboard';

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
