/**
 * Firebase-Supabase Authentication Integration
 * Syncs Firebase Auth users with Supabase database
 */

import { auth } from '@/lib/firebase';
import { supabase, getServiceSupabase } from '@/lib/supabase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';

export type UserRole = 'patient' | 'caregiver' | 'admin';

interface BeehiveUser {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  firebase_uid: string;
  created_at: string;
  is_active: boolean;
}

/**
 * Create or update user in Supabase after Firebase auth
 */
export async function syncUserToSupabase(
  firebaseUser: FirebaseUser,
  role?: UserRole,
  additionalData?: any
): Promise<BeehiveUser | null> {
  try {
    const serviceSupabase = getServiceSupabase();
    
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .single();

    if (existingUser) {
      // Update last login
      const { data: updatedUser, error: updateError } = await serviceSupabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          email: firebaseUser.email || existingUser.email,
          phone: firebaseUser.phoneNumber || existingUser.phone,
        })
        .eq('firebase_uid', firebaseUser.uid)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedUser;
    }

    // Create new user if doesn't exist
    if (!role) {
      throw new Error('Role is required for new users');
    }

    const { data: newUser, error: createError } = await serviceSupabase
      .from('users')
      .insert({
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        phone: additionalData?.phone || firebaseUser.phoneNumber || '',
        role,
        email_verified: firebaseUser.emailVerified,
        phone_verified: !!additionalData?.phone || !!firebaseUser.phoneNumber,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        ...additionalData
      })
      .select()
      .single();

    if (createError) throw createError;
    return newUser;
  } catch (error) {
    console.error('Error syncing user to Supabase:', error);
    return null;
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  role: UserRole,
  phone?: string
): Promise<{ user: BeehiveUser | null; error: string | null }> {
  try {
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // If phone provided, update the user record with phone
    const additionalData = phone ? { phone } : undefined;
    
    // Sync to Supabase
    const beehiveUser = await syncUserToSupabase(userCredential.user, role, additionalData);
    
    if (!beehiveUser) {
      throw new Error('Failed to create user profile');
    }

    return { user: beehiveUser, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { 
      user: null, 
      error: error.message || 'Failed to sign up' 
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: BeehiveUser | null; error: string | null }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user in Supabase
    const beehiveUser = await syncUserToSupabase(userCredential.user);
    
    if (!beehiveUser) {
      throw new Error('User profile not found');
    }

    return { user: beehiveUser, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { 
      user: null, 
      error: error.message || 'Failed to sign in' 
    };
  }
}

/**
 * Set up phone authentication
 */
export function setupPhoneAuth(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    }
  });
}

/**
 * Send phone verification code
 */
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
) {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return { confirmationResult, error: null };
  } catch (error: any) {
    console.error('Phone verification error:', error);
    return { confirmationResult: null, error: error.message };
  }
}

/**
 * Verify phone code and complete sign in
 */
export async function verifyPhoneCode(
  confirmationResult: any,
  code: string,
  role?: UserRole
): Promise<{ user: BeehiveUser | null; error: string | null }> {
  try {
    const result = await confirmationResult.confirm(code);
    
    // Sync to Supabase
    const beehiveUser = await syncUserToSupabase(result.user, role);
    
    if (!beehiveUser) {
      throw new Error('Failed to create/update user profile');
    }

    return { user: beehiveUser, error: null };
  } catch (error: any) {
    console.error('Phone verification error:', error);
    return { 
      user: null, 
      error: error.message || 'Invalid verification code' 
    };
  }
}

/**
 * Get current user from Supabase
 */
export async function getCurrentBeehiveUser(): Promise<BeehiveUser | null> {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }

  try {
    const serviceSupabase = getServiceSupabase();
    const { data, error } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthChanges(
  callback: (user: BeehiveUser | null) => void
): () => void {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const beehiveUser = await getCurrentBeehiveUser();
      callback(beehiveUser);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

/**
 * Check if user has completed profile
 */
export async function hasCompletedProfile(userId: string, role: UserRole): Promise<boolean> {
  try {
    const serviceSupabase = getServiceSupabase();
    
    if (role === 'caregiver') {
      const { data, error } = await serviceSupabase
        .from('caregiver_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      return !!data && !error;
    } else if (role === 'patient') {
      const { data, error } = await serviceSupabase
        .from('patient_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      return !!data && !error;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if caregiver has completed assessment
 */
export async function hasCompletedAssessment(caregiverId: string): Promise<boolean> {
  try {
    const serviceSupabase = getServiceSupabase();
    
    const { data, error } = await serviceSupabase
      .from('psychometric_assessments')
      .select('id, completed_at')
      .eq('caregiver_id', caregiverId)
      .not('completed_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    return !!data && data.length > 0 && !error;
  } catch {
    return false;
  }
}