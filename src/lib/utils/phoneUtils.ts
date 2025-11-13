import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';
import crypto from 'crypto';

/**
 * Validate US phone number
 */
export function isValidUSPhoneNumber(phone: string): boolean {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US' as CountryCode);
    return phoneNumber.isValid() && phoneNumber.country === 'US';
  } catch {
    return false;
  }
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  const phoneNumber = parsePhoneNumber(phone, 'US' as CountryCode);
  return phoneNumber.format('E.164');
}

/**
 * Hash phone number for trial tracking
 */
export function hashPhoneNumber(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  return crypto.createHash('sha256').update(formatted).digest('hex');
}

/**
 * Format phone number for display
 */
export function displayPhoneNumber(phone: string): string {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'US' as CountryCode);
    return phoneNumber.formatNational();
  } catch {
    return phone;
  }
}
