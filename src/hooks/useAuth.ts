'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { 
  subscribeToAuthState, 
  getCurrentUser, 
  logOut as firebaseLogOut,
  getIdToken,
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

  // Subscribe to auth state changes
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = subscribeToAuthState(async (authUser) => {
      setUser(authUser);
      setLoading(false);
      
      // Store auth state in localStorage for persistence
      if (authUser) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'authenticated');
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED);
      }
    });

    return () => unsubscribe();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // User will be updated via auth state listener
        return true;
      } else {
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
    try {
      await firebaseLogOut();
      setUser(null);
      router.push(ROUTES.HOME);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out');
    }
  }, [router]);

  // Accept disclaimer
  const acceptDisclaimer = useCallback(async () => {
    if (!user) return;

    try {
      await acceptDisclaimerInDb(user.id);
      
      // Update local user state
      setUser({
        ...user,
        disclaimerAccepted: true,
        disclaimerAcceptedAt: new Date(),
      });
      
      // Store in session
      sessionStorage.setItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED, 'true');
    } catch (err) {
      console.error('Accept disclaimer error:', err);
      setError('Failed to accept disclaimer');
    }
  }, [user]);

  // Get auth token for API calls
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getIdToken();
    } catch (err) {
      console.error('Get auth token error:', err);
      return null;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    disclaimerAccepted: user?.disclaimerAccepted || 
      sessionStorage.getItem(STORAGE_KEYS.DISCLAIMER_ACCEPTED) === 'true',
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