import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  ConfirmationResult
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { User } from '@/types';
import { hashPhoneNumber, formatPhoneNumber } from '@/lib/utils/phoneUtils';
import { GroupService } from './groups';
import { AgencyService } from './agencies';

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
    const phoneHash = userData.phoneNumber ? hashPhoneNumber(userData.phoneNumber) : '';

    // Set trial dates - 14 days from now
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      phoneNumber: userData.phoneNumber || '',
      phoneNumberHash: phoneHash,
      emailVerified: false,
      phoneVerified: false,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
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
      trialStartDate: now,              // Set to current date
      trialEndDate: trialEnd,            // Set to 14 days from now
      gracePeriodStartDate: null,        // Set when trial expires
      gracePeriodEndDate: null,          // Set when trial expires (48 hours after)
      dataExportRequested: false,        // User hasn't requested export yet
      subscriptionStatus: 'trial',       // Trial status
      subscriptionTier: null,            // No paid tier during trial
      storageUsed: 0,                    // No storage used yet
      storageLimit: 25 * 1024 * 1024,    // 25 MB for trial
      createdAt: now,
      lastLoginAt: now
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), user);

    // Create a default group and agency for the user
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create group first
    const group = await GroupService.createGroup({
      name: `${userData.firstName}'s Family`,
      type: 'family',
      adminId: firebaseUser.uid,
      members: [{
        userId: firebaseUser.uid,
        role: 'admin',
        permissionLevel: 'admin',
        permissions: [],
        addedAt: new Date(),
        addedBy: firebaseUser.uid,
        approvalStatus: 'approved'
      }],
      memberIds: [firebaseUser.uid],
      writeMemberIds: [],
      elders: [],
      subscription: {
        tier: 'family',
        status: 'trial',
        trialEndsAt: trialEndDate,
        currentPeriodEnd: trialEndDate,
        stripeCustomerId: '',
        stripeSubscriptionId: ''
      },
      settings: {
        notificationRecipients: [firebaseUser.uid],
        notificationPreferences: {
          enabled: true,
          frequency: 'realtime',
          types: ['missed_doses', 'diet_alerts', 'supplement_alerts']
        }
      },
      inviteCode: '',
      inviteCodeGeneratedAt: new Date(),
      inviteCodeGeneratedBy: firebaseUser.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    }, firebaseUser.uid);

    // Create agency (individual family type)
    const agency = await AgencyService.createAgency({
      name: `${userData.firstName}'s Family`,
      superAdminId: firebaseUser.uid,
      type: 'individual',
      groupIds: [group.id],
      caregiverIds: [firebaseUser.uid],
      maxEldersPerCaregiver: 3,
      subscription: {
        tier: 'family',
        status: 'trial',
        trialEndsAt: trialEndDate,
        currentPeriodEnd: trialEndDate,
        stripeCustomerId: '',
        stripeSubscriptionId: ''
      },
      settings: {
        notificationPreferences: {
          enabled: true,
          frequency: 'realtime',
          types: ['missed_doses', 'diet_alerts', 'supplement_alerts']
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update group with agency ID
    await GroupService.updateGroupSettings(group.id, {
      agencyId: agency.id
    } as any);

    // Update user with group and agency memberships
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      groups: [{
        groupId: group.id,
        role: 'admin',
        permissionLevel: 'admin',
        joinedAt: new Date()
      }],
      agencies: [{
        agencyId: agency.id,
        role: 'super_admin',
        joinedAt: new Date()
      }]
    });

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

  // ============= PHONE AUTHENTICATION =============

  /**
   * Initialize RecaptchaVerifier for phone auth
   * Must be called on client side with a DOM element
   */
  static setupRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    if (typeof window === 'undefined') {
      throw new Error('RecaptchaVerifier can only be initialized in browser');
    }

    // Clear any existing recaptcha
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    return new RecaptchaVerifier(auth, containerId, {
      size: 'normal',
      callback: () => {
        // reCAPTCHA solved - allow signInWithPhoneNumber
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
  }

  /**
   * Send SMS verification code to phone number
   */
  static async sendPhoneVerification(
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier
      );
      return confirmationResult;
    } catch (error: any) {
      console.error('Error sending phone verification:', error);
      throw new Error(error.message || 'Failed to send verification code');
    }
  }

  /**
   * Verify SMS code and sign in with phone
   */
  static async verifyPhoneCode(
    confirmationResult: ConfirmationResult,
    code: string
  ): Promise<FirebaseUser> {
    try {
      const result = await confirmationResult.confirm(code);
      return result.user;
    } catch (error: any) {
      console.error('Error verifying code:', error);
      throw new Error(error.message || 'Invalid verification code');
    }
  }

  /**
   * Sign in with phone number (complete flow)
   * Returns existing user or creates new user
   */
  static async signInWithPhone(
    phoneNumber: string,
    verificationCode: string,
    confirmationResult: ConfirmationResult,
    userData?: {
      firstName: string;
      lastName: string;
      email: string;
    }
  ): Promise<User> {
    try {
      // Verify the SMS code
      const firebaseUser = await this.verifyPhoneCode(confirmationResult, verificationCode);

      // Check if user document exists
      let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        // Existing user - update last login
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lastLoginAt: new Date()
        });
        return userDoc.data() as User;
      }

      // New user - check if phone number already used (trial enforcement)
      const phoneHash = hashPhoneNumber(phoneNumber);
      const phoneIndexRef = collection(db, 'phone_index');
      const phoneQuery = query(phoneIndexRef, where('phoneHash', '==', phoneHash));
      const phoneSnapshot = await getDocs(phoneQuery);

      if (!phoneSnapshot.empty) {
        // Phone number already used for trial
        throw new Error('This phone number has already been used for a trial account');
      }

      // Create new user document
      if (!userData) {
        throw new Error('User data required for new phone sign-ups');
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const user: User = {
        id: firebaseUser.uid,
        email: userData.email || '',
        phoneNumber: phoneNumber,
        phoneNumberHash: phoneHash,
        emailVerified: false,
        phoneVerified: true,
        emailVerifiedAt: null,
        phoneVerifiedAt: now,
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
        trialStartDate: now,
        trialEndDate: trialEnd,
        gracePeriodStartDate: null,        // Set when trial expires
        gracePeriodEndDate: null,          // Set when trial expires (48 hours after)
        dataExportRequested: false,        // User hasn't requested export yet
        subscriptionStatus: 'trial',
        subscriptionTier: null,
        storageUsed: 0,
        storageLimit: 25 * 1024 * 1024, // 25 MB
        createdAt: now,
        lastLoginAt: now
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), user);

      // Create phone index for trial enforcement
      await setDoc(doc(db, 'phone_index', phoneHash), {
        userId: firebaseUser.uid,
        phoneHash: phoneHash,
        createdAt: now
      });

      // Create default group and agency
      const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Create group first
      const group = await GroupService.createGroup({
        name: `${userData.firstName}'s Family`,
        type: 'family',
        adminId: firebaseUser.uid,
        members: [{
          userId: firebaseUser.uid,
          role: 'admin',
          permissionLevel: 'admin',
          permissions: [],
          addedAt: now,
          addedBy: firebaseUser.uid,
          approvalStatus: 'approved'
        }],
        memberIds: [firebaseUser.uid],
        writeMemberIds: [],
        elders: [],
        subscription: {
          tier: 'family',
          status: 'trial',
          trialEndsAt: trialEndDate,
          currentPeriodEnd: trialEndDate,
          stripeCustomerId: '',
          stripeSubscriptionId: ''
        },
        settings: {
          notificationRecipients: [firebaseUser.uid],
          notificationPreferences: {
            enabled: true,
            frequency: 'realtime',
            types: ['missed_doses', 'diet_alerts', 'supplement_alerts']
          }
        },
        inviteCode: '',
        inviteCodeGeneratedAt: now,
        inviteCodeGeneratedBy: firebaseUser.uid,
        createdAt: now,
        updatedAt: now
      }, firebaseUser.uid);

      // Create agency (individual family type)
      const agency = await AgencyService.createAgency({
        name: `${userData.firstName}'s Family`,
        superAdminId: firebaseUser.uid,
        type: 'individual',
        groupIds: [group.id],
        caregiverIds: [firebaseUser.uid],
        maxEldersPerCaregiver: 3,
        subscription: {
          tier: 'family',
          status: 'trial',
          trialEndsAt: trialEndDate,
          currentPeriodEnd: trialEndDate,
          stripeCustomerId: '',
          stripeSubscriptionId: ''
        },
        settings: {
          notificationPreferences: {
            enabled: true,
            frequency: 'realtime',
            types: ['missed_doses', 'diet_alerts', 'supplement_alerts']
          }
        },
        createdAt: now,
        updatedAt: now
      });

      // Update group with agency ID
      await GroupService.updateGroupSettings(group.id, {
        agencyId: agency.id
      } as any);

      // Update user with group and agency memberships
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        groups: [{
          groupId: group.id,
          role: 'admin',
          permissionLevel: 'admin',
          joinedAt: now
        }],
        agencies: [{
          agencyId: agency.id,
          role: 'super_admin',
          joinedAt: now
        }]
      });

      return user;
    } catch (error: any) {
      console.error('Error signing in with phone:', error);
      throw error;
    }
  }

  /**
   * Link phone number to existing email account
   */
  static async linkPhoneToAccount(
    phoneNumber: string,
    verificationCode: string,
    confirmationResult: ConfirmationResult
  ): Promise<void> {
    try {
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        verificationCode
      );

      if (!auth.currentUser) {
        throw new Error('No user signed in');
      }

      await linkWithCredential(auth.currentUser, credential);

      // Update user document with phone number
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        phoneNumber: phoneNumber,
        phoneNumberHash: hashPhoneNumber(phoneNumber)
      });
    } catch (error: any) {
      console.error('Error linking phone:', error);
      throw new Error(error.message || 'Failed to link phone number');
    }
  }

  /**
   * Mark email as verified
   */
  static async markEmailVerified(userId: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
      emailVerified: true,
      emailVerifiedAt: new Date()
    });
  }

  /**
   * Mark phone as verified
   */
  static async markPhoneVerified(userId: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId), {
      phoneVerified: true,
      phoneVerifiedAt: new Date()
    });
  }

  /**
   * Send phone verification code
   */
  static async sendPhoneVerificationCode(
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    return await this.sendPhoneVerification(phoneNumber, recaptchaVerifier);
  }

  /**
   * Verify phone code and mark as verified
   */
  static async verifyPhoneCodeAndUpdate(
    confirmationResult: ConfirmationResult,
    code: string,
    userId: string
  ): Promise<void> {
    await this.verifyPhoneCode(confirmationResult, code);
    await this.markPhoneVerified(userId);
  }

  /**
   * Add phone number to existing user account
   */
  static async addPhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    const phoneHash = hashPhoneNumber(phoneNumber);
    await updateDoc(doc(db, 'users', userId), {
      phoneNumber: phoneNumber,
      phoneNumberHash: phoneHash
    });

    // Create phone index entry
    await setDoc(doc(db, 'phone_index', phoneHash), {
      userId: userId,
      phoneHash: phoneHash,
      createdAt: new Date()
    });
  }
}
