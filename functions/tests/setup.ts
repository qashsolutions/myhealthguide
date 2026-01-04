/**
 * Jest Setup File for Cloud Functions Tests
 * Configures Firebase Admin SDK to use the local emulator
 */

// Set environment variables for Firebase Emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
process.env.FUNCTIONS_EMULATOR_HOST = '127.0.0.1:5001';

// Disable Twilio for tests
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = '+15555555555';

// Set project ID
process.env.GCLOUD_PROJECT = 'demo-healthweb';
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'demo-healthweb',
});

// Suppress console.log during tests (comment out to debug)
// global.console.log = jest.fn();

// Increase test timeout for emulator operations
jest.setTimeout(60000);
