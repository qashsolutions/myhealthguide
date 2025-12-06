import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updatePassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  ConfirmationResult,
  reload
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

    // Send email verification - continueUrl redirects user back to verify page after Firebase's verification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
    const actionCodeSettings = {
      url: `${baseUrl}/verify`,
      handleCodeInApp: false
    };
    await sendEmailVerification(firebaseUser, actionCodeSettings);

    // Create user document in Firestore
    const phoneHash = userData.phoneNumber ? hashPhoneNumber(userData.phoneNumber) : '';

    // Set trial dates - 45 days from now
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    // Password expires in 75 days (HIPAA compliance)
    const passwordExpiry = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000);

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
      trialEndDate: trialEnd,            // Set to 45 days from now
      gracePeriodStartDate: null,        // Set when trial expires
      gracePeriodEndDate: null,          // Set when trial expires (48 hours after)
      dataExportRequested: false,        // User hasn't requested export yet
      subscriptionStatus: 'trial',       // Trial status
      subscriptionTier: null,            // No paid tier during trial
      // Stripe subscription tracking (null until user subscribes)
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStartDate: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      pendingPlanChange: null,
      storageUsed: 0,                    // No storage used yet
      storageLimit: 25 * 1024 * 1024,    // 25 MB for trial
      // Password management (HIPAA compliance)
      lastPasswordChange: now,           // Set to account creation
      passwordExpiresAt: passwordExpiry, // 75 days from now
      passwordResetRequired: false,      // No reset required initially
      createdAt: now,
      lastLoginAt: now
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), user);

    // Create a default group and agency for the user
    const trialEndDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

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

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) return null;

      return userDoc.data() as User;
    } catch (error: any) {
      console.error('Error fetching user data:', error?.message || error);
      throw error;
    }
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
      console.log('🔐 [AUTH-SERVICE] signInWithPhone called with phone:', phoneNumber);

      // Verify the SMS code
      const firebaseUser = await this.verifyPhoneCode(confirmationResult, verificationCode);
      console.log('✅ [AUTH-SERVICE] Phone verified! Firebase UID:', firebaseUser.uid);

      // Check if user document exists
      console.log('📄 [AUTH-SERVICE] Checking if user document exists...');
      let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      console.log('📄 [AUTH-SERVICE] User document exists:', userDoc.exists());

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
      const trialEnd = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      // Password expires in 75 days (HIPAA compliance) - for phone signups, set when they add email/password
      const passwordExpiry = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000);

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
        // Stripe subscription tracking (null until user subscribes)
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStartDate: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        pendingPlanChange: null,
        storageUsed: 0,
        storageLimit: 25 * 1024 * 1024, // 25 MB
        // Password management (HIPAA compliance)
        lastPasswordChange: now,           // Set to account creation
        passwordExpiresAt: passwordExpiry, // 75 days from now
        passwordResetRequired: false,      // No reset required initially
        createdAt: now,
        lastLoginAt: now
      };

      console.log('💾 [AUTH-SERVICE] Creating new user with phone:', phoneNumber);
      console.log('💾 [AUTH-SERVICE] Phone hash:', phoneHash);
      await setDoc(doc(db, 'users', firebaseUser.uid), user);
      console.log('✅ [AUTH-SERVICE] User document created successfully');

      // Create phone index for trial enforcement
      await setDoc(doc(db, 'phone_index', phoneHash), {
        userId: firebaseUser.uid,
        phoneHash: phoneHash,
        createdAt: now
      });

      // Create default group and agency
      const trialEndDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

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
    const credential = PhoneAuthProvider.credential(
      confirmationResult.verificationId,
      verificationCode
    );

    if (!auth.currentUser) {
      throw new Error('No user signed in');
    }

    await linkWithCredential(auth.currentUser, credential);

    // Update user document with phone number and mark as verified
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      phoneNumber: phoneNumber,
      phoneNumberHash: hashPhoneNumber(phoneNumber),
      phoneVerified: true,
      phoneVerifiedAt: new Date()
    });
  }

  /**
   * Link email/password to existing phone-auth account
   * This allows phone-auth users to add email as a second auth method
   */
  static async linkEmailToAccount(
    email: string,
    password: string
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('No user signed in');
      }

      console.log('=== linkEmailToAccount START ===');
      console.log('Current user UID:', auth.currentUser.uid);
      console.log('Current user email:', auth.currentUser.email);
      console.log('Current providers:', auth.currentUser.providerData.map(p => p.providerId));

      // Check if email provider is already linked
      const hasEmailProvider = auth.currentUser.providerData.some(
        p => p.providerId === 'password'
      );

      let linkedUser = auth.currentUser;

      if (!hasEmailProvider) {
        // Create email/password credential
        const credential = EmailAuthProvider.credential(email, password);

        // Link the credential to the current user
        console.log('Linking email credential to phone account...');
        const userCredential = await linkWithCredential(auth.currentUser, credential);
        linkedUser = userCredential.user;
        console.log('Email credential linked successfully');
        console.log('Linked user email:', linkedUser.email);
        console.log('Linked user providers:', linkedUser.providerData.map(p => p.providerId));
      } else {
        console.log('Email provider already linked, skipping linkWithCredential');
      }

      // Update user document with email
      await updateDoc(doc(db, 'users', linkedUser.uid), {
        email: email,
        emailVerified: false // Will be set to true after email verification
      });
      console.log('Firestore updated with email');

      // Use the linkedUser directly (from linkWithCredential result) instead of reloading
      // The linkedUser should already have the email set
      console.log('Sending verification email to:', linkedUser.email);

      if (!linkedUser.email) {
        // Try reloading as fallback
        console.log('Email not found on linkedUser, trying reload...');
        await reload(auth.currentUser);
        linkedUser = auth.currentUser;
        console.log('After reload, email:', linkedUser.email);
      }

      if (linkedUser.email) {
        // Action code settings for the verification email
        // continueUrl is where user goes after clicking "Continue" on Firebase's verification page
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
        const actionCodeSettings = {
          url: `${baseUrl}/verify`,
          handleCodeInApp: false
        };
        console.log('ActionCodeSettings:', actionCodeSettings);

        await sendEmailVerification(linkedUser, actionCodeSettings);
        console.log('Verification email sent successfully');
      } else {
        console.error('No email found even after reload');
        // Don't throw - the linking worked, just verification email failed
        // User can use Resend button
      }

      console.log('=== linkEmailToAccount END ===');
    } catch (error: any) {
      console.error('Error linking email:', error);
      console.error('Error code:', error.code);
      console.error('Full error:', JSON.stringify(error, null, 2));

      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already associated with another account');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 8 characters with letters and numbers');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('For security, please sign out and sign back in before adding email');
      } else if (error.code === 'auth/provider-already-linked') {
        // Provider already linked - just need to send verification
        console.log('Provider already linked, will try to send verification email');
        try {
          if (auth.currentUser) {
            await reload(auth.currentUser);
            if (auth.currentUser.email) {
              await sendEmailVerification(auth.currentUser);
              console.log('Verification email sent for already-linked provider');
              return; // Success!
            }
          }
        } catch (resendError) {
          console.error('Failed to resend for already-linked provider:', resendError);
        }
        throw new Error('Email is already linked. Click "Resend verification email" to get a new link.');
      } else if (error.code === 'auth/credential-already-in-use') {
        throw new Error('This email is already used by another account');
      } else {
        throw new Error(error.message || 'Failed to link email to account');
      }
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

    // Update user with phone number (includes phoneVerified: false for consistency)
    // Note: Only updating verification-related fields as per Firestore rules
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

  // ============= PASSWORD MANAGEMENT (HIPAA Compliance) =============

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.myguide.health';
    const actionCodeSettings = {
      url: `${baseUrl}/reset-password`,
      handleCodeInApp: false
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  }

  /**
   * Verify password reset code
   */
  static async verifyPasswordResetCode(code: string): Promise<string> {
    return await verifyPasswordResetCode(auth, code);
  }

  /**
   * Confirm password reset with new password
   */
  static async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one number');
    }

    // Confirm the password reset with Firebase
    await confirmPasswordReset(auth, code, newPassword);
  }

  /**
   * Change password for logged-in user
   */
  static async changePassword(newPassword: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('No user signed in');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one number');
    }

    // Update password in Firebase Auth
    await updatePassword(auth.currentUser, newPassword);

    // Update password tracking in Firestore
    const now = new Date();
    const passwordExpiry = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000); // 75 days

    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      lastPasswordChange: now,
      passwordExpiresAt: passwordExpiry,
      passwordResetRequired: false
    });
  }

  /**
   * Update password expiration after reset
   * Called after confirmPasswordReset to update Firestore
   */
  static async updatePasswordExpirationByEmail(email: string): Promise<void> {
    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn('User not found for password expiration update:', email);
      return;
    }

    const userDoc = snapshot.docs[0];
    const now = new Date();
    const passwordExpiry = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000); // 75 days

    await updateDoc(doc(db, 'users', userDoc.id), {
      lastPasswordChange: now,
      passwordExpiresAt: passwordExpiry,
      passwordResetRequired: false
    });
  }

  /**
   * Check if password is expired
   */
  static isPasswordExpired(user: User): boolean {
    if (!user.passwordExpiresAt) {
      return false; // If no expiry set, not expired
    }

    let expiryDate: Date;
    // Handle Firestore Timestamp conversion
    if (typeof user.passwordExpiresAt === 'object' && 'seconds' in user.passwordExpiresAt) {
      expiryDate = new Date((user.passwordExpiresAt as any).seconds * 1000);
    } else if (user.passwordExpiresAt instanceof Date) {
      expiryDate = user.passwordExpiresAt;
    } else {
      expiryDate = new Date(user.passwordExpiresAt);
    }

    return new Date() > expiryDate;
  }

  /**
   * Get days until password expires
   */
  static getDaysUntilPasswordExpires(user: User): number | null {
    if (!user.passwordExpiresAt) {
      return null;
    }

    let expiryDate: Date;
    // Handle Firestore Timestamp conversion
    if (typeof user.passwordExpiresAt === 'object' && 'seconds' in user.passwordExpiresAt) {
      expiryDate = new Date((user.passwordExpiresAt as any).seconds * 1000);
    } else if (user.passwordExpiresAt instanceof Date) {
      expiryDate = user.passwordExpiresAt;
    } else {
      expiryDate = new Date(user.passwordExpiresAt);
    }

    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}
