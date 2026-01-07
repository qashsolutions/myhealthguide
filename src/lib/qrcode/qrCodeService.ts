/**
 * QR Code Service
 *
 * Handles generation, validation, and management of QR codes
 * for elder shift clock-in/out verification.
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import type { ElderQRCode, QRCodeData, Address } from '@/types/timesheet';

// QR Code version for future compatibility
const QR_CODE_VERSION = 1;
const QR_CODE_TYPE = 'careguide_shift';

// ============= QR Code Generation =============

/**
 * Generate a random secret key for QR validation
 */
function generateSecretKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create QR code data structure
 */
function createQRCodeData(elderId: string, qrCodeId: string, secretKey: string): QRCodeData {
  return {
    type: QR_CODE_TYPE,
    version: QR_CODE_VERSION,
    elderId,
    qrCodeId,
    secretKey,
  };
}

/**
 * Encode QR code data as a string for the QR image
 */
export function encodeQRCodeData(data: QRCodeData): string {
  return JSON.stringify(data);
}

/**
 * Decode QR code string back to data object
 */
export function decodeQRCodeData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString);

    // Validate structure
    if (
      data.type !== QR_CODE_TYPE ||
      typeof data.version !== 'number' ||
      typeof data.elderId !== 'string' ||
      typeof data.qrCodeId !== 'string' ||
      typeof data.secretKey !== 'string'
    ) {
      console.error('Invalid QR code structure');
      return null;
    }

    return data as QRCodeData;
  } catch (error) {
    console.error('Failed to parse QR code data:', error);
    return null;
  }
}

// ============= Firestore Operations =============

/**
 * Create a new QR code for an elder
 */
export async function createElderQRCode(
  elderId: string,
  elderName: string,
  groupId: string,
  agencyId: string,
  locationName: string,
  address: Address,
  createdBy: string
): Promise<ElderQRCode> {
  const secretKey = generateSecretKey();

  const qrCodeDoc: Omit<ElderQRCode, 'id'> = {
    elderId,
    elderName,
    groupId,
    agencyId,
    secretKey,
    locationName,
    address,
    createdAt: new Date(),
    createdBy,
    active: true,
  };

  const docRef = await addDoc(collection(db, 'elderQRCodes'), {
    ...qrCodeDoc,
    createdAt: Timestamp.fromDate(qrCodeDoc.createdAt),
  });

  const qrCode: ElderQRCode = {
    id: docRef.id,
    ...qrCodeDoc,
  };

  // Update elder document with QR code reference
  await updateDoc(doc(db, 'elders', elderId), {
    qrCodeId: docRef.id,
    updatedAt: Timestamp.now(),
  });

  return qrCode;
}

/**
 * Get QR code by ID
 */
export async function getQRCodeById(qrCodeId: string): Promise<ElderQRCode | null> {
  const docRef = doc(db, 'elderQRCodes', qrCodeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    elderId: data.elderId,
    elderName: data.elderName,
    groupId: data.groupId,
    agencyId: data.agencyId,
    secretKey: data.secretKey,
    locationName: data.locationName,
    address: data.address,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    active: data.active,
    regeneratedAt: data.regeneratedAt?.toDate(),
  };
}

/**
 * Get QR code for an elder
 */
export async function getQRCodeByElderId(elderId: string): Promise<ElderQRCode | null> {
  const q = query(
    collection(db, 'elderQRCodes'),
    where('elderId', '==', elderId),
    where('active', '==', true)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    elderId: data.elderId,
    elderName: data.elderName,
    groupId: data.groupId,
    agencyId: data.agencyId,
    secretKey: data.secretKey,
    locationName: data.locationName,
    address: data.address,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    active: data.active,
    regeneratedAt: data.regeneratedAt?.toDate(),
  };
}

/**
 * Regenerate QR code for an elder (invalidates old one)
 */
export async function regenerateQRCode(
  elderId: string,
  elderName: string,
  groupId: string,
  agencyId: string,
  locationName: string,
  address: Address,
  regeneratedBy: string
): Promise<ElderQRCode> {
  // Deactivate existing QR codes for this elder
  const existingQuery = query(
    collection(db, 'elderQRCodes'),
    where('elderId', '==', elderId),
    where('active', '==', true)
  );

  const existingDocs = await getDocs(existingQuery);

  for (const existingDoc of existingDocs.docs) {
    await updateDoc(doc(db, 'elderQRCodes', existingDoc.id), {
      active: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: regeneratedBy,
    });
  }

  // Create new QR code
  return createElderQRCode(
    elderId,
    elderName,
    groupId,
    agencyId,
    locationName,
    address,
    regeneratedBy
  );
}

// ============= QR Code Validation =============

export interface QRValidationResult {
  valid: boolean;
  qrCode?: ElderQRCode;
  error?: string;
}

/**
 * Validate a scanned QR code
 */
export async function validateQRCode(qrString: string): Promise<QRValidationResult> {
  // Decode the QR string
  const qrData = decodeQRCodeData(qrString);

  if (!qrData) {
    return {
      valid: false,
      error: 'Invalid QR code format. Please scan a valid MyHealthGuide QR code.',
    };
  }

  // Get the QR code from database
  const qrCode = await getQRCodeById(qrData.qrCodeId);

  if (!qrCode) {
    return {
      valid: false,
      error: 'QR code not found. It may have been regenerated.',
    };
  }

  // Check if QR code is active
  if (!qrCode.active) {
    return {
      valid: false,
      error: 'This QR code has been deactivated. Please contact your supervisor.',
    };
  }

  // Validate secret key
  if (qrCode.secretKey !== qrData.secretKey) {
    return {
      valid: false,
      error: 'QR code validation failed. Please try again or contact support.',
    };
  }

  // Validate elder ID matches
  if (qrCode.elderId !== qrData.elderId) {
    return {
      valid: false,
      error: 'QR code mismatch. Please scan the correct QR code for this elder.',
    };
  }

  return {
    valid: true,
    qrCode,
  };
}

// ============= QR Code Image Generation =============

/**
 * Generate QR code data URL for display
 * Uses dynamic import to load qrcode library only when needed
 */
export async function generateQRCodeImage(
  elderId: string,
  qrCodeId: string,
  secretKey: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark: string; light: string };
  }
): Promise<string> {
  const QRCode = (await import('qrcode')).default;

  const qrData = createQRCodeData(elderId, qrCodeId, secretKey);
  const qrString = encodeQRCodeData(qrData);

  const dataUrl = await QRCode.toDataURL(qrString, {
    width: options?.width || 256,
    margin: options?.margin || 2,
    color: options?.color || {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H', // High error correction for better scanning
  });

  return dataUrl;
}

/**
 * Generate QR code for an elder and return the image data URL
 */
export async function getOrCreateQRCodeImage(
  elderId: string,
  elderName: string,
  groupId: string,
  agencyId: string,
  locationName: string,
  address: Address,
  userId: string
): Promise<{ qrCode: ElderQRCode; imageDataUrl: string }> {
  // Check if QR code already exists
  let qrCode = await getQRCodeByElderId(elderId);

  if (!qrCode) {
    // Create new QR code
    qrCode = await createElderQRCode(
      elderId,
      elderName,
      groupId,
      agencyId,
      locationName,
      address,
      userId
    );
  }

  // Generate image
  const imageDataUrl = await generateQRCodeImage(
    qrCode.elderId,
    qrCode.id,
    qrCode.secretKey
  );

  return { qrCode, imageDataUrl };
}
