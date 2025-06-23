/**
 * Client-side authentication functions
 * IMPORTANT: This file is being migrated to server-side only auth
 * All functions here now make API calls instead of using Firebase directly
 */

import { User, SignupData, LoginData, AuthResponse } from '@/types';
import { ERROR_MESSAGES, VALIDATION_MESSAGES } from '@/lib/constants';

/**
 * Authentication functions that communicate with server-side API
 * All Firebase operations are now handled on the server
 */

// Helper function to make authenticated API calls
const authFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Always include cookies for auth
  });
  
  // Log response details for debugging
  console.log(`[Auth API] ${options.method || 'GET'} ${url}:`, {
    status: response.status,
    ok: response.ok,
  });
  
  return response;
};

// Note: Action code settings are now handled server-side
// This is kept for backward compatibility but not used

// Sign up new user via API
export const signUp = async (data: SignupData): Promise<AuthResponse> => {
  console.log('[Auth] Initiating signup for:', data.email);
  
  try {
    const response = await authFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('[Auth] Signup successful:', data.email);
      
      // Store email locally for verification flow
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('emailForSignIn', data.email);
      }
      
      return {
        success: true,
        message: result.message,
      };
    } else {
      console.error('[Auth] Signup failed:', result.error);
      return {
        success: false,
        error: result.error || ERROR_MESSAGES.SIGNUP_FAILED,
        code: result.code,
      };
    }
  } catch (error: any) {
    console.error('[Auth] Signup network error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
      code: 'network-error',
    };
  }
};

// Sign in existing user via API
export const signIn = async (data: LoginData): Promise<AuthResponse> => {
  console.log('[Auth] Initiating login for:', data.email);
  
  try {
    const response = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('[Auth] Login successful:', data.email);
      console.log('[Auth] User data received:', result.data?.user?.email);
      
      return {
        success: true,
        user: result.data?.user,
        token: result.data?.token,
        message: result.message,
      };
    } else {
      console.error('[Auth] Login failed:', result.error);
      console.error('[Auth] Error code:', result.code);
      
      return {
        success: false,
        error: result.error || ERROR_MESSAGES.AUTH_FAILED,
        code: result.code,
        data: result.data, // May contain additional error context
      };
    }
  } catch (error: any) {
    console.error('[Auth] Login network error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
      code: 'network-error',
    };
  }
};

// Sign out user via API
export const logOut = async (): Promise<void> => {
  console.log('[Auth] Initiating logout');
  
  try {
    const response = await authFetch('/api/auth/logout', {
      method: 'POST',
    });
    
    if (response.ok) {
      console.log('[Auth] Logout successful');
      
      // Clear any local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('emailForSignIn');
        sessionStorage.clear();
      }
    } else {
      const result = await response.json();
      console.error('[Auth] Logout failed:', result.error);
      throw new Error(result.error || 'Logout failed');
    }
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    throw error;
  }
};

// Send password reset email via API
export const resetPassword = async (email: string): Promise<AuthResponse> => {
  console.log('[Auth] Requesting password reset for:', email);
  
  try {
    const response = await authFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('[Auth] Password reset email sent successfully');
      return {
        success: true,
        message: result.message,
      };
    } else {
      console.error('[Auth] Password reset failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to send password reset email.',
        code: result.code,
      };
    }
  } catch (error: any) {
    console.error('[Auth] Password reset network error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
      code: 'network-error',
    };
  }
};

// Update user profile via API
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  console.log('[Auth] Updating profile for user:', userId);
  
  try {
    const response = await authFetch('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ userId, updates }),
    });
    
    if (!response.ok) {
      const result = await response.json();
      console.error('[Auth] Profile update failed:', result.error);
      throw new Error(result.error || 'Failed to update profile');
    }
    
    console.log('[Auth] Profile updated successfully');
  } catch (error) {
    console.error('[Auth] Update profile error:', error);
    throw error;
  }
};

// Accept medical disclaimer via API
export const acceptDisclaimer = async (userId: string): Promise<void> => {
  console.log('[Auth] Accepting disclaimer for user:', userId);
  
  try {
    const response = await authFetch('/api/user/accept-disclaimer', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      const result = await response.json();
      console.error('[Auth] Accept disclaimer failed:', result.error);
      throw new Error(result.error || 'Failed to accept disclaimer');
    }
    
    console.log('[Auth] Disclaimer accepted successfully');
  } catch (error) {
    console.error('[Auth] Accept disclaimer error:', error);
    throw error;
  }
};

// Subscribe to auth state changes - now polls server session
// This is kept for backward compatibility but will be removed
export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  console.warn('[Auth] subscribeToAuthState is deprecated. Use server session instead.');
  
  // Return empty unsubscribe function
  return () => {
    console.log('[Auth] Unsubscribed from auth state (no-op)');
  };
};

// Get current user from server session
export const getCurrentUser = async (): Promise<User | null> => {
  console.log('[Auth] Getting current user from server');
  
  try {
    const response = await authFetch('/api/auth/session');
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data?.user) {
        console.log('[Auth] Current user found:', result.data.user.email);
        return result.data.user;
      }
    }
    
    console.log('[Auth] No current user found');
    return null;
  } catch (error) {
    console.error('[Auth] Error getting current user:', error);
    return null;
  }
};

// All Firebase operations are now server-side only
// Client-side Firebase functions have been removed