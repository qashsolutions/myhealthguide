import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { User, SignupData, LoginData, AuthResponse } from '@/types';
import { ERROR_MESSAGES, VALIDATION_MESSAGES } from '@/lib/constants';

/**
 * Firebase Authentication functions
 * Handles user signup, login, and session management
 */

// Convert Firebase user to our User type
export const mapFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: userData.name || firebaseUser.displayName || '',
      phoneNumber: userData.phoneNumber || firebaseUser.phoneNumber || undefined,
      emailVerified: firebaseUser.emailVerified,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      disclaimerAccepted: userData.disclaimerAccepted || false,
      disclaimerAcceptedAt: userData.disclaimerAcceptedAt?.toDate() || undefined,
    };
  } catch (error) {
    console.error('Error mapping Firebase user:', error);
    return null;
  }
};

// Action code settings for email link
export const actionCodeSettings = {
  url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health'}/auth/action`,
  handleCodeInApp: true,
};

// Sign up new user - just store data, email will be sent by API
export const signUp = async (data: SignupData): Promise<AuthResponse> => {
  try {
    // Store email and user data for completion after verification
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('emailForSignIn', data.email);
      window.localStorage.setItem('pendingUserData', JSON.stringify({
        name: data.name,
        phoneNumber: data.phoneNumber,
      }));
    }
    
    // Return success - the API will handle sending the magic link email
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Map Firebase error codes to user-friendly messages
    let message: string = ERROR_MESSAGES.SIGNUP_FAILED;
    
    if (error.code === 'auth/email-already-in-use') {
      message = ERROR_MESSAGES.SIGNUP_FAILED;
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak. Please use at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    }
    
    return {
      success: false,
      error: message,
      code: error.code,
    };
  }
};

// Sign in existing user
export const signIn = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    
    const firebaseUser = userCredential.user;
    
    // Get ID token for API calls
    const token = await firebaseUser.getIdToken();
    
    // Map to our User type
    const user = await mapFirebaseUser(firebaseUser);
    
    if (!user) {
      throw new Error('User profile not found');
    }
    
    // Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      user,
      token,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Map Firebase error codes to user-friendly messages
    let message: string = ERROR_MESSAGES.AUTH_FAILED;
    
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email. Please sign up first.';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed attempts. Please try again later.';
    }
    
    return {
      success: false,
      error: message,
      code: error.code,
    };
  }
};

// Sign out user
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<AuthResponse> => {
  try {
    await sendPasswordResetEmail(auth, email);
    
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    let message = 'Failed to send password reset email.';
    
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email address.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    }
    
    return {
      success: false,
      error: message,
      code: error.code,
    };
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Accept medical disclaimer
export const acceptDisclaimer = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      disclaimerAccepted: true,
      disclaimerAcceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Accept disclaimer error:', error);
    throw error;
  }
};

// Subscribe to auth state changes
export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = await mapFirebaseUser(firebaseUser);
      callback(user);
    } else {
      callback(null);
    }
  });
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }
  
  return mapFirebaseUser(firebaseUser);
};

// Complete signup with email link
export const completeSignupWithEmailLink = async (email: string, emailLink: string): Promise<AuthResponse> => {
  try {
    // Verify the link is valid
    if (!isSignInWithEmailLink(auth, emailLink)) {
      throw new Error('Invalid verification link');
    }

    // Sign in with the email link
    const result = await signInWithEmailLink(auth, email, emailLink);
    const firebaseUser = result.user;

    // Get stored user data
    let userData = { name: '', phoneNumber: undefined };
    if (typeof window !== 'undefined') {
      const storedData = window.localStorage.getItem('pendingUserData');
      if (storedData) {
        userData = JSON.parse(storedData);
        // Clean up stored data
        window.localStorage.removeItem('emailForSignIn');
        window.localStorage.removeItem('pendingUserData');
      }
    }

    // Update display name if available
    if (userData.name) {
      await updateProfile(firebaseUser, {
        displayName: userData.name,
      });
    }

    // Create user document in Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: email,
      name: userData.name || firebaseUser.displayName || '',
      phoneNumber: userData.phoneNumber || null,
      emailVerified: true, // Email is verified through magic link
      disclaimerAccepted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Get ID token
    const token = await firebaseUser.getIdToken();

    // Map to our User type
    const user = await mapFirebaseUser(firebaseUser);

    if (!user) {
      throw new Error('Failed to create user profile');
    }

    return {
      success: true,
      user,
      token,
    };
  } catch (error: any) {
    console.error('Complete signup error:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to complete signup',
      code: error.code,
    };
  }
};

// Generate email sign-in link for server-side use
export const generateSignInLink = async (email: string): Promise<string> => {
  return await sendSignInLinkToEmail(auth, email, actionCodeSettings).then(() => {
    // Firebase doesn't return the link, so we'll need to handle this differently
    // For now, return a success indicator
    return 'link-sent';
  });
};

// Get ID token for API calls
export const getIdToken = async (): Promise<string | null> => {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }
  
  try {
    return await firebaseUser.getIdToken();
  } catch (error) {
    console.error('Get ID token error:', error);
    return null;
  }
};

// Create user with email and password (client-side only)
export const createUser = async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name if provided
    if (displayName) {
      await updateProfile(firebaseUser, { displayName });
    }

    // Get ID token
    const token = await firebaseUser.getIdToken();

    return {
      success: true,
      token,
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        name: displayName || '',
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date(),
        updatedAt: new Date(),
        disclaimerAccepted: false,
      },
    };
  } catch (error: any) {
    console.error('Create user error:', error);
    
    let message: string = ERROR_MESSAGES.SIGNUP_FAILED;
    
    if (error.code === 'auth/email-already-in-use') {
      message = ERROR_MESSAGES.SIGNUP_FAILED;
    } else if (error.code === 'auth/weak-password') {
      message = 'Password must be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address';
    }
    
    return {
      success: false,
      error: message,
      code: error.code,
    };
  }
};

// Export isSignInWithEmailLink for external use
export { isSignInWithEmailLink };