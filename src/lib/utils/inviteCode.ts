/**
 * Invite Code Generator and Validator
 * Generates 6-digit alphanumeric codes (encrypted) for group invites
 */

/**
 * Generate a 6-digit alphanumeric invite code
 * Format: XXXXXX (uppercase letters and numbers)
 */
export function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
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
 * Validate invite code format
 */
export function validateInviteCodeFormat(code: string): boolean {
  // Must be exactly 6 characters, alphanumeric uppercase
  const regex = /^[A-Z0-9]{6}$/;
  return regex.test(code);
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
