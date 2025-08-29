import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

/**
 * Firebase Client SDK Configuration
 * Used for Beehive authentication and real-time features
 */

// Your new Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDT-wnOiaMtzb72nXfT-QvuoKpEHis9C0k",
  authDomain: "healthguide-bc3ba.firebaseapp.com",
  projectId: "healthguide-bc3ba",
  storageBucket: "healthguide-bc3ba.firebasestorage.app",
  messagingSenderId: "401590339271",
  appId: "1:401590339271:web:6e9586220e7da02c5ca0e2",
  measurementId: "G-KCKRVBNXLR"
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics only in browser and if supported
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;