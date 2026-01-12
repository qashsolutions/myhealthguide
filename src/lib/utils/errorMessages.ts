/**
 * User-friendly error message mapper for Firebase/Firestore errors
 *
 * Converts technical error codes to simple, actionable messages
 */

// Firebase Auth error code to user-friendly message mapping
const firebaseAuthErrors: Record<string, string> = {
  // Account & Credential Errors
  'auth/account-exists-with-different-credential':
    'This phone number is already linked to another account. Please sign in with your original account or use a different phone number.',
  'auth/credential-already-in-use':
    'This phone number is already linked to another account. Please use a different phone number.',
  'auth/email-already-in-use':
    'This email address is already registered. Please sign in or use a different email.',
  'auth/user-not-found':
    'No account found with this email. Please check your email or sign up for a new account.',
  'auth/wrong-password':
    'Incorrect password. Please try again or use "Forgot Password" to reset it.',
  'auth/invalid-credential':
    'Invalid login credentials. Please check your email and password.',
  'auth/user-disabled':
    'This account has been disabled. Please contact support for assistance.',

  // Verification Errors
  'auth/invalid-verification-code':
    'The verification code is incorrect. Please check and try again.',
  'auth/code-expired':
    'The verification code has expired. Please request a new code.',
  'auth/missing-verification-code':
    'Please enter the verification code sent to your phone.',
  'auth/invalid-verification-id':
    'Verification session expired. Please request a new code.',

  // Rate Limiting
  'auth/too-many-requests':
    'Too many attempts. Please wait a few minutes before trying again.',
  'auth/quota-exceeded':
    'Service temporarily unavailable. Please try again in a few minutes.',

  // Session & Token Errors
  'auth/user-token-expired':
    'Your session has expired. Please sign in again.',
  'auth/requires-recent-login':
    'For security, please sign out and sign in again before making this change.',
  'auth/invalid-user-token':
    'Your session is invalid. Please sign in again.',
  'auth/session-expired':
    'Your session has expired. Please sign in again.',

  // Email Errors
  'auth/invalid-email':
    'Please enter a valid email address.',
  'auth/email-change-needs-verification':
    'Please verify your new email address.',

  // Password Errors
  'auth/weak-password':
    'Password is too weak. Please use at least 8 characters with letters and numbers.',

  // Phone Errors
  'auth/invalid-phone-number':
    'Please enter a valid US phone number (10 digits).',
  'auth/missing-phone-number':
    'Please enter your phone number.',
  'auth/phone-number-already-exists':
    'This phone number is already registered with another account.',

  // Provider Errors
  'auth/provider-already-linked':
    'This authentication method is already linked to your account.',
  'auth/no-such-provider':
    'This authentication method is not linked to your account.',

  // Network Errors
  'auth/network-request-failed':
    'Network error. Please check your internet connection and try again.',
  'auth/timeout':
    'Request timed out. Please try again.',

  // reCAPTCHA Errors
  'auth/captcha-check-failed':
    'Security verification failed. Please refresh the page and try again.',
  'auth/recaptcha-not-enabled':
    'Security verification not available. Please try again later.',

  // General Errors
  'auth/operation-not-allowed':
    'This operation is not available. Please contact support.',
  'auth/internal-error':
    'Something went wrong. Please try again.',
  'auth/invalid-api-key':
    'Configuration error. Please contact support.',
};

// Firestore error code to user-friendly message mapping
const firestoreErrors: Record<string, string> = {
  'permission-denied':
    'You don\'t have permission to perform this action. Please sign in again.',
  'not-found':
    'The requested data was not found.',
  'already-exists':
    'This record already exists.',
  'resource-exhausted':
    'Too many requests. Please wait a moment and try again.',
  'failed-precondition':
    'This action cannot be completed right now. Please try again.',
  'aborted':
    'The operation was interrupted. Please try again.',
  'out-of-range':
    'Invalid data provided.',
  'unimplemented':
    'This feature is not available yet.',
  'internal':
    'Something went wrong. Please try again.',
  'unavailable':
    'Service temporarily unavailable. Please try again in a moment.',
  'data-loss':
    'Data error occurred. Please contact support.',
  'unauthenticated':
    'Please sign in to continue.',
};

/**
 * Convert Firebase/Firestore error to user-friendly message
 *
 * @param error - The error object or string
 * @returns User-friendly error message
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return parseErrorString(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    const errorObj = error as any;

    // Check for Firebase error code
    if (errorObj.code) {
      // Auth errors
      if (firebaseAuthErrors[errorObj.code]) {
        return firebaseAuthErrors[errorObj.code];
      }

      // Firestore errors
      if (firestoreErrors[errorObj.code]) {
        return firestoreErrors[errorObj.code];
      }
    }

    // Check for Firebase error in message
    const message = errorObj.message || '';
    return parseErrorString(message);
  }

  // Handle objects with code property
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;

    if (errorObj.code) {
      if (firebaseAuthErrors[errorObj.code]) {
        return firebaseAuthErrors[errorObj.code];
      }
      if (firestoreErrors[errorObj.code]) {
        return firestoreErrors[errorObj.code];
      }
    }

    if (errorObj.message) {
      return parseErrorString(errorObj.message);
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Parse error string for Firebase error patterns
 */
function parseErrorString(message: string): string {
  // Pattern: "Firebase: Error (auth/error-code)."
  const firebaseMatch = message.match(/Firebase: Error \(([^)]+)\)/);
  if (firebaseMatch) {
    const code = firebaseMatch[1];
    if (firebaseAuthErrors[code]) {
      return firebaseAuthErrors[code];
    }
  }

  // Pattern: "auth/error-code" anywhere in string
  const authCodeMatch = message.match(/auth\/[a-z-]+/);
  if (authCodeMatch) {
    const code = authCodeMatch[0];
    if (firebaseAuthErrors[code]) {
      return firebaseAuthErrors[code];
    }
  }

  // Check for common Firestore permission error
  if (message.toLowerCase().includes('missing or insufficient permissions') ||
      message.toLowerCase().includes('permission-denied') ||
      message.toLowerCase().includes('permission denied')) {
    return 'You don\'t have permission to perform this action. Please sign in again.';
  }

  // Check for network errors
  if (message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('fetch') ||
      message.toLowerCase().includes('connection')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // If message is already user-friendly (doesn't contain technical terms), return as-is
  if (!message.includes('Firebase') &&
      !message.includes('auth/') &&
      !message.includes('firestore') &&
      !message.includes('permission') &&
      message.length < 150) {
    return message;
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if error is a specific Firebase error code
 */
export function isFirebaseError(error: unknown, code: string): boolean {
  if (!error) return false;

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    if (errorObj.code === code) return true;
    if (errorObj.message?.includes(code)) return true;
  }

  if (typeof error === 'string' && error.includes(code)) {
    return true;
  }

  return false;
}
