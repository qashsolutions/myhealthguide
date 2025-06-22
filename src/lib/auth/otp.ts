/**
 * OTP (One-Time Password) utilities for authentication
 * Used for secure email verification during signup and account deletion
 * 
 * This module provides:
 * - OTP generation (6-digit codes)
 * - Temporary storage (in-memory with TTL)
 * - Verification with rate limiting
 * - Cleanup of expired codes
 */

import crypto from 'crypto';

/**
 * OTP storage interface
 * Stores OTP data temporarily in memory with expiration
 */
interface OTPData {
  code: string;           // The 6-digit OTP code
  email: string;          // Email address this OTP is for
  purpose: 'signup' | 'delete' | 'reset';  // What this OTP is used for
  attempts: number;       // Number of verification attempts
  expiresAt: Date;       // When this OTP expires
  createdAt: Date;       // When this OTP was created
  metadata?: any;        // Additional data (e.g., user name for signup)
}

/**
 * In-memory storage for OTPs
 * In production, consider using Redis or database with TTL
 */
const otpStore = new Map<string, OTPData>();

/**
 * Configuration constants
 */
const OTP_CONFIG = {
  LENGTH: 6,                    // Length of OTP code
  EXPIRY_MINUTES: 10,          // OTP expires after 10 minutes
  MAX_ATTEMPTS: 3,             // Maximum verification attempts
  CLEANUP_INTERVAL: 60000,     // Clean expired OTPs every minute
};

/**
 * Generate a cryptographically secure OTP
 * Uses crypto.randomInt for better randomness than Math.random()
 * 
 * @returns A 6-digit string (with leading zeros if needed)
 */
export const generateOTP = (): string => {
  // Generate a random number between 0 and 999999
  const otp = crypto.randomInt(0, Math.pow(10, OTP_CONFIG.LENGTH));
  
  // Pad with leading zeros if needed (e.g., "001234")
  return otp.toString().padStart(OTP_CONFIG.LENGTH, '0');
};

/**
 * Store an OTP with associated data
 * 
 * @param email - User's email address
 * @param purpose - What this OTP is for (signup, delete, reset)
 * @param metadata - Additional data to store with OTP
 * @returns The generated OTP code
 */
export const storeOTP = (
  email: string, 
  purpose: OTPData['purpose'],
  metadata?: any
): string => {
  // Generate new OTP code
  const code = generateOTP();
  
  // Create unique key using email and purpose
  // This allows same email to have different OTPs for different purposes
  const key = `${email.toLowerCase()}:${purpose}`;
  
  // Calculate expiration time
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
  
  // Store OTP data
  otpStore.set(key, {
    code,
    email: email.toLowerCase(),
    purpose,
    attempts: 0,
    expiresAt,
    createdAt: now,
    metadata,
  });
  
  // Log for debugging (remove in production)
  console.log(`[OTP] Generated ${purpose} OTP for ${email}: ${code}`);
  
  return code;
};

/**
 * Verify an OTP code
 * 
 * @param email - User's email address
 * @param code - The OTP code to verify
 * @param purpose - What this OTP is for
 * @returns Object with success status and metadata if valid
 */
export const verifyOTP = (
  email: string, 
  code: string, 
  purpose: OTPData['purpose']
): { success: boolean; metadata?: any; error?: string } => {
  // Create lookup key
  const key = `${email.toLowerCase()}:${purpose}`;
  
  // Get stored OTP data
  const otpData = otpStore.get(key);
  
  // Check if OTP exists
  if (!otpData) {
    return { 
      success: false, 
      error: 'OTP not found or already used' 
    };
  }
  
  // Check if OTP has expired
  if (new Date() > otpData.expiresAt) {
    // Remove expired OTP
    otpStore.delete(key);
    return { 
      success: false, 
      error: 'OTP has expired. Please request a new one.' 
    };
  }
  
  // Check if too many attempts
  if (otpData.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    // Remove OTP after max attempts
    otpStore.delete(key);
    return { 
      success: false, 
      error: 'Too many attempts. Please request a new OTP.' 
    };
  }
  
  // Increment attempt counter
  otpData.attempts++;
  
  // Verify the code (case-insensitive comparison)
  if (otpData.code === code) {
    // Success! Remove OTP so it can't be reused
    otpStore.delete(key);
    
    // Log success (remove in production)
    console.log(`[OTP] Verified ${purpose} OTP for ${email}`);
    
    return { 
      success: true, 
      metadata: otpData.metadata 
    };
  }
  
  // Wrong code - update attempts in store
  otpStore.set(key, otpData);
  
  return { 
    success: false, 
    error: `Invalid OTP. ${OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts} attempts remaining.` 
  };
};

/**
 * Check if an OTP exists and is valid (not expired)
 * Useful for checking if user needs to request a new OTP
 * 
 * @param email - User's email address
 * @param purpose - What this OTP is for
 * @returns Boolean indicating if valid OTP exists
 */
export const hasValidOTP = (
  email: string, 
  purpose: OTPData['purpose']
): boolean => {
  const key = `${email.toLowerCase()}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) return false;
  
  // Check if expired
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(key);
    return false;
  }
  
  return true;
};

/**
 * Get remaining time for an OTP in seconds
 * Useful for showing countdown to user
 * 
 * @param email - User's email address
 * @param purpose - What this OTP is for
 * @returns Remaining seconds or 0 if expired/not found
 */
export const getOTPRemainingTime = (
  email: string, 
  purpose: OTPData['purpose']
): number => {
  const key = `${email.toLowerCase()}:${purpose}`;
  const otpData = otpStore.get(key);
  
  if (!otpData) return 0;
  
  const now = new Date();
  const remaining = otpData.expiresAt.getTime() - now.getTime();
  
  return Math.max(0, Math.floor(remaining / 1000));
};

/**
 * Clean up expired OTPs from storage
 * This prevents memory leaks from accumulating expired OTPs
 */
const cleanupExpiredOTPs = (): void => {
  const now = new Date();
  let cleaned = 0;
  
  // Iterate through all stored OTPs
  for (const [key, otpData] of otpStore.entries()) {
    if (now > otpData.expiresAt) {
      otpStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[OTP] Cleaned up ${cleaned} expired OTPs`);
  }
};

/**
 * Start periodic cleanup of expired OTPs
 * Call this once when the server starts
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export const startOTPCleanup = (): void => {
  if (cleanupInterval) return; // Already started
  
  // Run cleanup immediately
  cleanupExpiredOTPs();
  
  // Then run periodically
  cleanupInterval = setInterval(cleanupExpiredOTPs, OTP_CONFIG.CLEANUP_INTERVAL);
  
  console.log('[OTP] Started periodic cleanup');
};

/**
 * Stop periodic cleanup (useful for tests)
 */
export const stopOTPCleanup = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[OTP] Stopped periodic cleanup');
  }
};

/**
 * Clear all OTPs (useful for tests)
 */
export const clearAllOTPs = (): void => {
  otpStore.clear();
  console.log('[OTP] Cleared all OTPs');
};

/**
 * Get OTP statistics (useful for monitoring)
 */
export const getOTPStats = (): {
  total: number;
  byPurpose: Record<string, number>;
  expired: number;
} => {
  const now = new Date();
  const stats = {
    total: otpStore.size,
    byPurpose: { signup: 0, delete: 0, reset: 0 },
    expired: 0,
  };
  
  for (const otpData of otpStore.values()) {
    stats.byPurpose[otpData.purpose]++;
    if (now > otpData.expiresAt) {
      stats.expired++;
    }
  }
  
  return stats;
};

// Start cleanup when module loads (in production)
if (process.env.NODE_ENV === 'production') {
  startOTPCleanup();
}