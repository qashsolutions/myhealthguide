import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '@/types';
import { hashPhoneNumber } from '@/lib/utils/phoneUtils';

export class AuthService {
  /**
   * Create a new user account
   */
  static async createUser(
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    }
  ): Promise<User> {
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    // Send email verification
    await sendEmailVerification(firebaseUser);

    // Create user document in Firestore
    const phoneHash = hashPhoneNumber(userData.phoneNumber);
    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      phoneNumber: userData.phoneNumber,
      phoneNumberHash: phoneHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      groups: [],
      agencies: [],
      preferences: {
        theme: 'light',
        notifications: {
          sms: true,
          email: true
        }
      },
      trialUsed: false,
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), user);

    return user;
  }

  /**
   * Sign in existing user
   */
  static async signIn(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    // Update last login
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const user = userDoc.data() as User;
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      { lastLoginAt: new Date() },
      { merge: true }
    );

    return user;
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  /**
   * Get current Firebase user
   */
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Get current user data from Firestore
   */
  static async getCurrentUserData(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) return null;

    return userDoc.data() as User;
  }
}
