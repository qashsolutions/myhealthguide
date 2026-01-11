/**
 * Invite Code Generator and Validator
 * Generates role-prefixed alphanumeric codes for group invites
 *
 * Format:
 * - FAM-XXXX    → Family Plan Member
 * - AGY-XXXX    → Small Agency Caregiver/Member
 * - MAG-C-XXXX  → Multi-Agency Caregiver
 * - MAG-M-XXXX  → Multi-Agency Member
 */

export type InviteCodeType =
  | 'family_member'      // FAM-XXXX
  | 'agency_member'      // AGY-XXXX
  | 'multi_agency_caregiver'  // MAG-C-XXXX
  | 'multi_agency_member';    // MAG-M-XXXX

export interface ParsedInviteCode {
  type: InviteCodeType;
  code: string;
  fullCode: string;
}

const CODE_PREFIXES: Record<InviteCodeType, string> = {
  family_member: 'FAM',
  agency_member: 'AGY',
  multi_agency_caregiver: 'MAG-C',
  multi_agency_member: 'MAG-M',
};

/**
 * Generate a 4-digit alphanumeric code segment
 */
function generateCodeSegment(length: number = 4): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0, O, 1, I)
  let code = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

/**
 * Generate a role-prefixed invite code
 * @param type The type of invite (determines prefix)
 * @returns Full invite code with prefix (e.g., "FAM-AB12")
 */
export function generateInviteCode(type?: InviteCodeType): string {
  const segment = generateCodeSegment(4);

  // If no type provided, generate legacy 6-char code for backwards compatibility
  if (!type) {
    return generateCodeSegment(6);
  }

  const prefix = CODE_PREFIXES[type];
  return `${prefix}-${segment}`;
}

/**
 * Parse an invite code to extract type and validate format
 * @param code The invite code to parse
 * @returns Parsed code info or null if invalid
 */
export function parseInviteCode(code: string): ParsedInviteCode | null {
  const normalizedCode = code.toUpperCase().trim();

  // Check for new prefixed formats
  if (normalizedCode.startsWith('MAG-C-')) {
    const segment = normalizedCode.slice(6);
    if (segment.length === 4 && /^[A-Z0-9]+$/.test(segment)) {
      return {
        type: 'multi_agency_caregiver',
        code: segment,
        fullCode: normalizedCode,
      };
    }
  }

  if (normalizedCode.startsWith('MAG-M-')) {
    const segment = normalizedCode.slice(6);
    if (segment.length === 4 && /^[A-Z0-9]+$/.test(segment)) {
      return {
        type: 'multi_agency_member',
        code: segment,
        fullCode: normalizedCode,
      };
    }
  }

  if (normalizedCode.startsWith('FAM-')) {
    const segment = normalizedCode.slice(4);
    if (segment.length === 4 && /^[A-Z0-9]+$/.test(segment)) {
      return {
        type: 'family_member',
        code: segment,
        fullCode: normalizedCode,
      };
    }
  }

  if (normalizedCode.startsWith('AGY-')) {
    const segment = normalizedCode.slice(4);
    if (segment.length === 4 && /^[A-Z0-9]+$/.test(segment)) {
      return {
        type: 'agency_member',
        code: segment,
        fullCode: normalizedCode,
      };
    }
  }

  // Check for legacy 6-8 char codes (backwards compatibility)
  if (/^[A-Z0-9]{6,8}$/.test(normalizedCode)) {
    return {
      type: 'family_member', // Default legacy codes to family member
      code: normalizedCode,
      fullCode: normalizedCode,
    };
  }

  return null;
}

/**
 * Get the signup route for an invite code type
 */
export function getSignupRouteForInviteType(type: InviteCodeType): string {
  switch (type) {
    case 'family_member':
      return '/caregiver-family-invite';
    case 'agency_member':
      return '/caregiver-family-invite';
    case 'multi_agency_caregiver':
      return '/caregiver-family-invite';
    case 'multi_agency_member':
      return '/caregiver-family-invite';
    default:
      return '/caregiver-family-invite';
  }
}

/**
 * Get human-readable description for invite type
 */
export function getInviteTypeDescription(type: InviteCodeType): string {
  switch (type) {
    case 'family_member':
      return 'Family Plan Member';
    case 'agency_member':
      return 'Small Agency Member';
    case 'multi_agency_caregiver':
      return 'Agency Caregiver';
    case 'multi_agency_member':
      return 'Agency Member';
    default:
      return 'Member';
  }
}

/**
 * Encrypt invite code using Web Crypto API
 * Returns base64-encoded encrypted code
 */
export async function encryptInviteCode(code: string, secretKey?: string): Promise<string> {
  const key = secretKey || process.env.NEXT_PUBLIC_INVITE_CODE_SECRET || 'default-secret-key';

  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const keyData = encoder.encode(key);

  // Create hash of key for consistent key derivation
  const keyHash = await crypto.subtle.digest('SHA-256', keyData);

  // Import key for AES-GCM encryption
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate IV (initialization vector)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt invite code
 * Returns the original code
 */
export async function decryptInviteCode(encryptedCode: string, secretKey?: string): Promise<string> {
  const key = secretKey || process.env.NEXT_PUBLIC_INVITE_CODE_SECRET || 'default-secret-key';

  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedCode), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);

    // Create hash of key
    const keyHash = await crypto.subtle.digest('SHA-256', keyData);

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Error decrypting invite code:', error);
    throw new Error('Invalid invite code');
  }
}

/**
 * Validate invite code format (supports both legacy and new prefixed formats)
 */
export function validateInviteCodeFormat(code: string): boolean {
  const normalizedCode = code.toUpperCase().trim();

  // Check for new prefixed formats
  if (/^FAM-[A-Z0-9]{4}$/.test(normalizedCode)) return true;
  if (/^AGY-[A-Z0-9]{4}$/.test(normalizedCode)) return true;
  if (/^MAG-C-[A-Z0-9]{4}$/.test(normalizedCode)) return true;
  if (/^MAG-M-[A-Z0-9]{4}$/.test(normalizedCode)) return true;

  // Legacy 6-8 character format
  if (/^[A-Z0-9]{6,8}$/.test(normalizedCode)) return true;

  return false;
}

/**
 * Format invite code for display (add dashes for readability)
 * Example: ABC123 -> ABC-123
 */
export function formatInviteCodeForDisplay(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

/**
 * Remove formatting from invite code (remove dashes)
 * Example: ABC-123 -> ABC123
 */
export function unformatInviteCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase();
}
