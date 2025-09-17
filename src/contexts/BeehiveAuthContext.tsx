'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface BeehiveUser {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?: string;
  emailVerified?: boolean;
}

interface BeehiveAuthContextType {
  user: BeehiveUser | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const BeehiveAuthContext = createContext<BeehiveAuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  logOut: async () => {},
});

export const useBeehiveAuth = () => useContext(BeehiveAuthContext);

export function BeehiveAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BeehiveUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          role: userData?.role,
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Send email verification
      await sendEmailVerification(firebaseUser);

      // Create user document in Firestore with basic info
      const userDoc = {
        email: email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        role: userData.role || 'care_seeker',
        ageVerified: true,
        emailVerified: false,
        profileComplete: false,
        status: 'active',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        termsAcceptedAt: serverTimestamp(),
        privacyAcceptedAt: serverTimestamp(),
        zipCode: userData.zipCode || '',
      };

      // Add care seeker preferences
      if (userData.role === 'care_seeker') {
        Object.assign(userDoc, {
          preferences: {
            caregiverGenderPreference: userData.caregiverGenderPreference || '',
            languagePreferences: userData.languagePreferences || [],
            serviceTypesNeeded: userData.serviceTypesNeeded || [],
            scheduleNeeds: userData.scheduleNeeds || '',
            budgetRange: userData.budgetRange || '',
          }
        });
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);

      // Create caregiver document if role is caregiver
      if (userData.role === 'caregiver') {
        await setDoc(doc(db, 'caregivers', firebaseUser.uid), {
          userId: firebaseUser.uid,
          yearsOfExperience: userData.yearsOfExperience || '',
          certifications: userData.certifications || [],
          servicesOffered: userData.servicesOffered || [],
          languagesSpoken: userData.languagesSpoken || [],
          availability: userData.availability || [],
          hourlyRate: userData.hourlyRate || '',
          backgroundCheckStatus: userData.backgroundCheckStatus || false,
          genderIdentity: userData.genderIdentity || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Update last active timestamp
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          lastActive: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <BeehiveAuthContext.Provider value={{ user, loading, signUp, signIn, logOut }}>
      {children}
    </BeehiveAuthContext.Provider>
  );
}