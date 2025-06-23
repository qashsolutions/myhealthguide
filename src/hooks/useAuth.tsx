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
  const checkServerSession = useCallback(async () => {
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
        return true;
      } else {
        console.log('[useAuth] No valid server session:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[useAuth] Session check error:', error);
      return false;
    }
  }, []);

  // Check server-side session on mount and set up periodic checks
  useEffect(() => {
    console.log('[useAuth] Initializing auth state');
    setLoading(true);
    
    // Initial session check
    checkServerSession().finally(() => {
      setLoading(false);
    });
    
    // Set up periodic session checks every 30 seconds
    // This ensures we catch session changes even if user has multiple tabs
    const interval = setInterval(() => {
      console.log('[useAuth] Periodic session check');
      checkServerSession();
    }, 30000); // 30 seconds
    
    // Also check session when window regains focus
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
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
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
          
          // Force a session check to ensure cookie was set properly
          setTimeout(() => {
            console.log('[useAuth] Verifying session after login...');
            checkServerSession();
          }, 500);
        }
        return true;
      } else {
        console.error('[useAuth] Login failed:', data.error);
        setError(data.error || 'Login failed');
        return false;
      }
    } catch (err) {
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
      
      // Even if logout fails, clear local state and redirect
      setUser(null);
      router.push(ROUTES.HOME);
    }
  }, [router]);

  // Accept disclaimer
  const acceptDisclaimer = useCallback(async () => {
    if (!user) return;

    try {
      await acceptDisclaimerInDb(user.id);
      
      // Refresh user data from Firestore to ensure state is in sync
      const refreshedUser = await getCurrentUser();
      if (refreshedUser) {
        setUser(refreshedUser);
      }
      
      // Store in session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED, 'true');
      }
    } catch (err) {
      console.error('Accept disclaimer error:', err);
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

  // Refresh user data
  const refreshUser = useCallback(async () => {
    console.log('[useAuth] Refreshing user data');
    try {
      // Use the checkServerSession function which already handles everything
      await checkServerSession();
    } catch (err) {
      console.error('[useAuth] Refresh user error:', err);
    }
  }, [checkServerSession]);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    disclaimerAccepted: user?.disclaimerAccepted || 
      (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED) === 'true'),
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
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireDisclaimer?: boolean }
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, disclaimerAccepted, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          router.push(`${ROUTES.AUTH}?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else if (options?.requireDisclaimer && !disclaimerAccepted) {
          router.push(ROUTES.MEDICAL_DISCLAIMER);
        }
      }
    }, [isAuthenticated, disclaimerAccepted, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner" />
        </div>
      );
    }

    if (!isAuthenticated || (options?.requireDisclaimer && !disclaimerAccepted)) {
      return null;
    }

    return <Component {...props} />;
  };
}