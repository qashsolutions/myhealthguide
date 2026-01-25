import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
// Guard against build-time initialization when API key is not available
let app: FirebaseApp;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    // During build time, create a dummy app to prevent errors
    // The actual app will be initialized at runtime when env vars are available
    console.warn('[Firebase Config] API key not available, skipping initialization (expected during build)');
    app = null as unknown as FirebaseApp;
  } else {
    app = initializeApp(firebaseConfig);
  }
} else {
  app = getApps()[0];
}

// Initialize App Check with reCAPTCHA v3
// This protects your Firebase resources from abuse by bots
if (app && typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  try {
    // Use debug token for localhost development
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN) {
      // For localhost, set the actual debug token from environment
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
      console.log('⚠️ App Check debug mode enabled for localhost');
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.log('✅ Firebase App Check initialized successfully');
  } catch (error) {
    console.error('❌ Firebase App Check initialization failed:', error);
    // Don't throw - allow app to continue without App Check in development
  }
}

// Initialize services (only if app was initialized)
export const auth: Auth = app ? getAuth(app) : null as unknown as Auth;

// Initialize Firestore with offline persistence and long polling
// - persistentLocalCache: Enables IndexedDB for offline data access
// - persistentMultipleTabManager: Allows multiple tabs to share the cache
// - experimentalForceLongPolling: Avoids QUIC protocol errors on restrictive networks
export const db: Firestore = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null as unknown as Firestore;

export const storage: FirebaseStorage = app ? getStorage(app) : null as unknown as FirebaseStorage;

// Export app for FCM and other services
export { app };
export default app;
