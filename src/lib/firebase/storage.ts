import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadResult,
} from 'firebase/storage';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  increment,
} from 'firebase/firestore';
import { storage, db } from './config';
import { StorageMetadata, STORAGE_LIMITS, FILE_SIZE_LIMITS } from '@/types';

// ============= Storage Limit Helper Functions =============

/**
 * Get storage limit for a user based on their subscription tier
 */
export function getStorageLimitForTier(
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled',
  subscriptionTier: 'single' | 'family' | 'agency' | null
): number {
  // During trial or if no tier, always 25 MB
  if (subscriptionStatus === 'trial' || !subscriptionTier) {
    return STORAGE_LIMITS.TRIAL;
  }

  // If expired or canceled, still return their tier limit (but they can't upload)
  switch (subscriptionTier) {
    case 'single':
      return STORAGE_LIMITS.SINGLE;
    case 'family':
      return STORAGE_LIMITS.FAMILY;
    case 'agency':
      return STORAGE_LIMITS.AGENCY;
    default:
      return STORAGE_LIMITS.TRIAL;
  }
}

/**
 * Check if user has enough storage space for a new file
 */
export async function checkStorageQuota(
  userId: string,
  fileSize: number
): Promise<{ allowed: boolean; message?: string }> {
  try {
    // Get user document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { allowed: false, message: 'User not found' };
    }

    const userData = userSnap.data();
    const storageUsed = userData.storageUsed || 0;
    const storageLimit = userData.storageLimit || STORAGE_LIMITS.TRIAL;

    // Check if adding this file would exceed the limit
    if (storageUsed + fileSize > storageLimit) {
      const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
      const usedMB = (storageUsed / (1024 * 1024)).toFixed(2);
      return {
        allowed: false,
        message: `Storage quota exceeded. You're using ${usedMB} MB of ${limitMB} MB. Please upgrade your plan or delete some files.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return { allowed: false, message: 'Error checking storage quota' };
  }
}

/**
 * Calculate total storage used by a user
 */
export async function calculateStorageUsed(userId: string): Promise<number> {
  try {
    const storageMetadataRef = collection(db, 'storage_metadata');
    const q = query(storageMetadataRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    let totalBytes = 0;
    snapshot.forEach((doc) => {
      totalBytes += doc.data().fileSize || 0;
    });

    return totalBytes;
  } catch (error) {
    console.error('Error calculating storage used:', error);
    return 0;
  }
}

/**
 * Update user's storage usage in Firestore
 */
export async function updateStorageUsage(
  userId: string,
  bytesChanged: number
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      storageUsed: increment(bytesChanged),
    });
  } catch (error) {
    console.error('Error updating storage usage:', error);
    throw error;
  }
}

// ============= File Upload Functions =============

/**
 * Upload a file to Firebase Storage with quota enforcement
 */
export async function uploadFileWithQuota(
  userId: string,
  file: File,
  path: string,
  category: 'profile' | 'elder' | 'document',
  groupId?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Check file size limits
    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? FILE_SIZE_LIMITS.IMAGE : FILE_SIZE_LIMITS.DOCUMENT;

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      return {
        success: false,
        error: `File too large. Maximum ${isImage ? 'image' : 'document'} size is ${maxSizeMB} MB.`,
      };
    }

    // Check storage quota
    const quotaCheck = await checkStorageQuota(userId, file.size);
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: quotaCheck.message,
      };
    }

    // Upload file
    const storageRef = ref(storage, path);
    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Create storage metadata record
    const metadataRef = collection(db, 'storage_metadata');
    await addDoc(metadataRef, {
      userId,
      groupId: groupId || null,
      filePath: path,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category,
      uploadedAt: new Date(),
    });

    // Update user's storage usage
    await updateStorageUsage(userId, file.size);

    return {
      success: true,
      url: downloadURL,
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file',
    };
  }
}

/**
 * Delete a file from Firebase Storage and update quota
 */
export async function deleteFileWithQuota(
  userId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the metadata record
    const metadataRef = collection(db, 'storage_metadata');
    const q = query(
      metadataRef,
      where('userId', '==', userId),
      where('filePath', '==', filePath)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        success: false,
        error: 'File metadata not found',
      };
    }

    const metadataDoc = snapshot.docs[0];
    const metadata = metadataDoc.data();
    const fileSize = metadata.fileSize || 0;

    // Delete the file from storage
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);

    // Delete metadata record
    await deleteDoc(doc(db, 'storage_metadata', metadataDoc.id));

    // Update user's storage usage (decrease)
    await updateStorageUsage(userId, -fileSize);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete file',
    };
  }
}

/**
 * Get all files uploaded by a user
 */
export async function getUserFiles(userId: string): Promise<StorageMetadata[]> {
  try {
    const metadataRef = collection(db, 'storage_metadata');
    const q = query(metadataRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const files: StorageMetadata[] = [];
    snapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
      } as StorageMetadata);
    });

    return files;
  } catch (error) {
    console.error('Error getting user files:', error);
    return [];
  }
}

/**
 * Initialize storage limits for a new user
 */
export async function initializeUserStorage(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      storageUsed: 0,
      storageLimit: STORAGE_LIMITS.TRIAL,
      subscriptionTier: null,
    });
  } catch (error) {
    console.error('Error initializing user storage:', error);
    throw error;
  }
}

/**
 * Update storage limit when subscription changes
 */
export async function updateStorageLimitOnSubscriptionChange(
  userId: string,
  newTier: 'single' | 'family' | 'agency'
): Promise<void> {
  try {
    const newLimit = getStorageLimitForTier('active', newTier);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      storageLimit: newLimit,
      subscriptionTier: newTier,
    });
  } catch (error) {
    console.error('Error updating storage limit:', error);
    throw error;
  }
}
