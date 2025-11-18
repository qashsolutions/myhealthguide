'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { AuthService } from '@/lib/firebase/auth';
import { User } from '@/types';
import {
  initializeSession,
  associateSessionWithUser,
  endSession,
  trackSessionActivity
} from '@/lib/session/sessionManager';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userData = await AuthService.getCurrentUserData();
          setUser(userData);

          // Initialize/associate session with user
          if (typeof window !== 'undefined') {
            associateSessionWithUser(userData.id);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    // Initialize session on app load (even if not logged in)
    if (typeof window !== 'undefined') {
      initializeSession();
    }

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    }
  ): Promise<User> => {
    const newUser = await AuthService.createUser(email, password, userData);
    setUser(newUser);
    return newUser;
  };

  const signIn = async (email: string, password: string): Promise<User> => {
    const loggedInUser = await AuthService.signIn(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signOut = async (): Promise<void> => {
    // End session before signing out
    if (typeof window !== 'undefined') {
      await endSession();
    }

    await AuthService.signOut();
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    if (firebaseUser) {
      const userData = await AuthService.getCurrentUserData();
      setUser(userData);
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
