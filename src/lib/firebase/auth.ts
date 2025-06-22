import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { User, SignupData, LoginData, AuthResponse } from '@/types';
import { ERROR_MESSAGES } from '@/lib/constants';

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

// Sign up new user
export const signUp = async (data: SignupData): Promise<AuthResponse> => {
  try {
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    
    const firebaseUser = userCredential.user;
    
    // Update display name
    await updateProfile(firebaseUser, {
      displayName: data.name,
    });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber || null,
      emailVerified: false,
      disclaimerAccepted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Skip Firebase email verification - using Resend instead
    // await sendEmailVerification(firebaseUser);
    
    // Get ID token for API calls
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