/**
 * Trial Period Management
 * Tracks 45-day trial from FIRST USE (not signup)
 */

import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from './config';

export class TrialService {
  /**
   * Activate trial on first actual use of the app
   * Call this when user first logs in after signup
   */
  static async activateTrialOnFirstUse(userId: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();

      // Only activate if trial not already started
      if (userData.trialStartDate === null) {
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 45); // 45 days from now

        await updateDoc(doc(db, 'users', userId), {
          trialStartDate: Timestamp.fromDate(now),
          trialEndDate: Timestamp.fromDate(trialEnd),
          subscriptionStatus: 'trial'
        });

        console.log(`Trial activated for user ${userId}: ${now.toISOString()} to ${trialEnd.toISOString()}`);
      }
    } catch (error) {
      console.error('Error activating trial:', error);
      throw error;
    }
  }

  /**
   * Check if user has active access (trial or subscription)
   */
  static async hasActiveAccess(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();

      // Check if has active subscription
      if (userData.subscriptionStatus === 'active') {
        return true;
      }

      // Check if in trial period
      if (userData.subscriptionStatus === 'trial' && userData.trialEndDate) {
        const trialEnd = userData.trialEndDate.toDate();
        return new Date() < trialEnd;
      }

      return false;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }

  /**
   * Get remaining trial days
   */
  static async getRemainingTrialDays(userId: string): Promise<number> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        return 0;
      }

      const userData = userDoc.data();

      if (userData.subscriptionStatus !== 'trial' || !userData.trialEndDate) {
        return 0;
      }

      const trialEnd = userData.trialEndDate.toDate();
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      console.error('Error getting remaining trial days:', error);
      return 0;
    }
  }

  /**
   * Check phone number uniqueness
   * Uses phoneNumberHash as the document ID in phone_index collection
   */
  static async isPhoneNumberAvailable(phoneNumberHash: string): Promise<boolean> {
    try {
      const phoneDoc = await getDoc(doc(db, 'phone_index', phoneNumberHash));
      return !phoneDoc.exists();
    } catch (error) {
      console.error('Error checking phone availability:', error);
      return false;
    }
  }

  /**
   * Register phone number (call during signup)
   */
  static async registerPhoneNumber(phoneNumberHash: string, userId: string): Promise<void> {
    try {
      await setDoc(doc(db, 'phone_index', phoneNumberHash), {
        userId,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error registering phone:', error);
      throw error;
    }
  }

  /**
   * Expire trial (called by Cloud Function or manually)
   */
  static async expireTrial(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'expired'
      });
    } catch (error) {
      console.error('Error expiring trial:', error);
      throw error;
    }
  }

  /**
   * Activate subscription (when user pays)
   */
  static async activateSubscription(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'active'
      });
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw error;
    }
  }
}
