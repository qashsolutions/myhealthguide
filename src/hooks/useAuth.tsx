'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCurrentUser, 
  logOut as firebaseLogOut,
  acceptDisclaimer as acceptDisclaimerInDb
} from '@/lib/firebase/auth';
import { User } from '@/types';
import { ROUTES, STORAGE_KEYS } from '@/lib/constants';

/**
 * Authentication hook and context
 * Manages user authentication state across the app
 * FIXED: Resolved endless polling loop and state inconsistency issues
 */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  disclaimerAccepted: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  acceptDisclaimer: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define checkServerSession as a reusable function
  // FIXED: Added proper state cleanup when session is invalid
  const checkServerSession = useCallback(async () => {
    // Don't run on server-side
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      console.log('[useAuth] Checking server session...');
      
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Ensure cookies are sent with the request
      });
      
      console.log('[useAuth] Session check response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.user) {
        // We have a valid server session
        console.log('[useAuth] Valid server session found:', data.data.user.email);
        setUser(data.data.user);
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'authenticated');
        
        // If disclaimer is accepted, store it
        if (data.data.user.disclaimerAccepted) {
          sessionStorage.setItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED, 'true');
        }
        
        // Clear any previous errors since session is valid
        setError(null);
        return true;
      } else {
        // FIXED: Clear user state when session is invalid to prevent inconsistent state
        console.log('[useAuth] No valid server session:', data.error);
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
        return false;
      }
    } catch (error) {
      console.error('[useAuth] Session check error:', error);
      
      // FIXED: Clear user state on network errors to prevent stale authentication
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
      return false;
    }
  }, []);

  // Check server-side session on mount and set up periodic checks
  // FIXED: Reduced polling frequency from 30 seconds to 5 minutes to reduce server load
  useEffect(() => {
    // Skip session checks during server-side rendering
    if (typeof window === 'undefined') {
      console.log('[useAuth] Skipping session check during SSR');
      setLoading(false);
      return;
    }
    
    console.log('[useAuth] Initializing auth state');
    setLoading(true);
    
    // Initial session check
    checkServerSession().finally(() => {
      setLoading(false);
    });
    
    // FIXED: Reduced periodic session checks from every 30 seconds to every 5 minutes
    // This reduces server load while still catching session changes
    const interval = setInterval(() => {
      console.log('[useAuth] Periodic session check (5 min interval)');
      checkServerSession();
    }, 300000); // 5 minutes instead of 30 seconds
    
    // Also check session when window regains focus (keep this for better UX)
    const handleFocus = () => {
      console.log('[useAuth] Window focused, checking session');
      checkServerSession();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkServerSession]);

  // Login function
  // FIXED: Removed unnecessary session re-check after login that was causing immediate failures
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('[useAuth] Attempting login for:', email);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Ensure cookies are included in the request
      });

      const data = await response.json();

      if (data.success) {
        console.log('[useAuth] Login successful, updating user state');
        
        // Update user state directly from server response
        if (data.data?.user) {
          setUser(data.data.user);
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'authenticated');
          
          // Store disclaimer status if present
          if (data.data.user.disclaimerAccepted) {
            sessionStorage.setItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED, 'true');
          }
          
          console.log('[useAuth] User state updated successfully');
          
          // FIXED: Removed the setTimeout session re-check that was causing immediate 401 errors
          // The login response already contains the user data, no need to re-verify immediately
        }
        return true;
      } else {
        console.error('[useAuth] Login failed:', data.error);
        setError(data.error || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('[useAuth] Login network error:', err);
      setError('Network error. Please try again.');
      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    console.log('[useAuth] Starting logout process');
    
    try {
      // Call the centralized logout function which handles server logout
      await firebaseLogOut();
      
      // Clear local state
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
      sessionStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
      
      console.log('[useAuth] Logout successful, redirecting to home');
      router.push(ROUTES.HOME);
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      setError('Failed to log out');
      
      // Even if logout fails, clear local state and redirect for security
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
      sessionStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
      router.push(ROUTES.HOME);
    }
  }, [router]);

  // Accept disclaimer
  const acceptDisclaimer = useCallback(async () => {
    if (!user) {
      console.error('[useAuth] Cannot accept disclaimer: No user found');
      return;
    }

    try {
      console.log('[useAuth] Accepting disclaimer');
      await acceptDisclaimerInDb(); // No userId parameter needed
      
      // Refresh user data from server to ensure state is in sync
      const refreshedUser = await getCurrentUser();
      if (refreshedUser) {
        setUser(refreshedUser);
        console.log('[useAuth] User data refreshed after disclaimer acceptance');
      }
      
      // Store in session storage for immediate UI updates
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED, 'true');
      }
      
      console.log('[useAuth] Disclaimer accepted successfully');
    } catch (err) {
      console.error('[useAuth] Accept disclaimer error:', err);
      setError('Failed to accept disclaimer');
    }
  }, [user]);

  // Get auth token for API calls - now returns null as tokens are server-managed
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    console.warn('[useAuth] getAuthToken is deprecated - auth is handled server-side');
    // Tokens are now managed server-side via httpOnly cookies
    // This function is kept for backward compatibility
    return null;
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    console.log('[useAuth] Refreshing user data from server');
    try {
      // Use the checkServerSession function which already handles everything
      await checkServerSession();
    } catch (err) {
      console.error('[useAuth] Refresh user error:', err);
    }
  }, [checkServerSession]);

  // FIXED: Added better computed values for authentication state
  const isAuthenticated = !!user;
  const disclaimerAccepted = user?.disclaimerAccepted || 
    (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED) === 'true');

  const value: AuthContextValue = {
    user,
    loading,
    error,
    isAuthenticated,
    disclaimerAccepted,
    login,
    logout,
    acceptDisclaimer,
    getAuthToken,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// HOC for protected routes
// FIXED: Added better loading handling and clearer redirect logic
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireDisclaimer?: boolean }
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, disclaimerAccepted, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // Wait for loading to complete before making redirect decisions
      if (!loading) {
        if (!isAuthenticated) {
          // User is not authenticated, redirect to auth page with return URL
          console.log('[withAuth] User not authenticated, redirecting to auth');
          router.push(`${ROUTES.AUTH}?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else if (options?.requireDisclaimer && !disclaimerAccepted) {
          // User is authenticated but hasn't accepted disclaimer
          console.log('[withAuth] User needs to accept disclaimer, redirecting');
          router.push(ROUTES.MEDICAL_DISCLAIMER);
        }
      }
    }, [isAuthenticated, disclaimerAccepted, loading, router]);

    // Show loading spinner while determining auth state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner" />
        </div>
      );
    }

    // Don't render component if user doesn't meet requirements
    if (!isAuthenticated || (options?.requireDisclaimer && !disclaimerAccepted)) {
      return null;
    }

    // All checks passed, render the protected component
    return <Component {...props} />;
  };
}