import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Elder } from '@/types';
import { canCreateElder } from './planLimits';
import { logPHIAccess, UserRole } from '../medical/phiAuditLog';

export class ElderService {
  private static COLLECTION = 'elders';

  /**
   * Create a new elder
   * @param userId - The user creating the elder (for plan limit validation)
   * @param userRole - The role of the user creating the elder (for HIPAA audit)
   */
  static async createElder(
    groupId: string,
    userId: string,
    userRole: UserRole,
    elder: Omit<Elder, 'id'>
  ): Promise<Elder> {
    // Check plan limits before creating elder
    const canCreate = await canCreateElder(userId, groupId);
    if (!canCreate.allowed) {
      throw new Error(canCreate.message || 'Cannot create elder due to plan limits');
    }

    // Remove undefined values before saving to Firestore
    const { dateOfBirth, createdAt, ...elderData } = elder;

    // Build document data, excluding undefined fields
    const docData: Record<string, any> = {
      ...Object.fromEntries(
        Object.entries(elderData).filter(([_, v]) => v !== undefined)
      ),
      groupId,
      createdAt: Timestamp.fromDate(createdAt),
    };

    // Only add dateOfBirth if it exists
    if (dateOfBirth) {
      docData.dateOfBirth = Timestamp.fromDate(dateOfBirth);
    }

    const docRef = await addDoc(collection(db, this.COLLECTION), docData);

    const result = {
      ...elder,
      id: docRef.id
    };

    // HIPAA Audit Log: Record PHI creation (elder is PHI - contains DOB, name, medical conditions)
    await logPHIAccess({
      userId,
      userRole,
      groupId,
      phiType: 'elder',
      phiId: docRef.id,
      elderId: docRef.id,
      action: 'create',
      actionDetails: `Created elder profile: ${elder.name}`,
      purpose: 'operations',
      method: 'web_app',
    });

    return result;
  }

  /**
   * Get elders by group ID
   */
  static async getEldersByGroup(
    groupId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Elder[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    const elders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateOfBirth: data.dateOfBirth?.toDate() || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    }) as Elder[];

    // HIPAA Audit Log: Record PHI access (elders list contains PHI)
    if (elders.length > 0) {
      await logPHIAccess({
        userId,
        userRole,
        groupId,
        phiType: 'elder',
        action: 'read',
        actionDetails: `Retrieved ${elders.length} elder profiles for group`,
        purpose: 'operations',
        method: 'web_app',
      });
    }

    return elders;
  }

  /**
   * Get elder by ID
   */
  static async getElder(
    elderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Elder | null> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    const elder = {
      id: snapshot.id,
      ...data,
      dateOfBirth: data.dateOfBirth?.toDate() || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Elder;

    // HIPAA Audit Log: Record individual elder PHI access
    await logPHIAccess({
      userId,
      userRole,
      groupId: elder.groupId,
      phiType: 'elder',
      phiId: elderId,
      elderId,
      action: 'read',
      actionDetails: `Viewed elder profile: ${elder.name}`,
      purpose: 'operations',
      method: 'web_app',
    });

    return elder;
  }

  /**
   * Update elder
   */
  static async updateElder(
    elderId: string,
    data: Partial<Elder>,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const updateData: any = { ...data };

    if (data.dateOfBirth) {
      updateData.dateOfBirth = Timestamp.fromDate(data.dateOfBirth);
    }

    await updateDoc(docRef, updateData);

    // Get elder details for audit log
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const elder = snapshot.data() as Elder;

      // HIPAA Audit Log: Record PHI modification
      await logPHIAccess({
        userId,
        userRole,
        groupId: elder.groupId,
        phiType: 'elder',
        phiId: elderId,
        elderId,
        action: 'update',
        actionDetails: `Updated elder profile: ${elder.name} (fields: ${Object.keys(data).join(', ')})`,
        purpose: 'operations',
        method: 'web_app',
      });
    }
  }

  /**
   * Archive elder (soft delete - preserves data, can be reactivated)
   */
  static async archiveElder(
    elderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Elder not found');
    }

    const elder = snapshot.data() as Elder;

    // Update elder with archived status
    await updateDoc(docRef, {
      archived: true,
      archivedAt: Timestamp.now(),
      archivedBy: userId,
    });

    // HIPAA Audit Log: Record PHI archive
    await logPHIAccess({
      userId,
      userRole,
      groupId: elder.groupId,
      phiType: 'elder',
      phiId: elderId,
      elderId,
      action: 'update',
      actionDetails: `Archived elder profile: ${elder.name}`,
      purpose: 'operations',
      method: 'web_app',
    });
  }

  /**
   * Unarchive elder (reactivate archived elder)
   */
  static async unarchiveElder(
    elderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Elder not found');
    }

    const elder = snapshot.data() as Elder;

    // Remove archived status
    await updateDoc(docRef, {
      archived: false,
      archivedAt: null,
      archivedBy: null,
    });

    // HIPAA Audit Log: Record PHI unarchive
    await logPHIAccess({
      userId,
      userRole,
      groupId: elder.groupId,
      phiType: 'elder',
      phiId: elderId,
      elderId,
      action: 'update',
      actionDetails: `Reactivated elder profile: ${elder.name}`,
      purpose: 'operations',
      method: 'web_app',
    });
  }

  /**
   * Delete elder (permanent - use with caution)
   */
  static async deleteElder(
    elderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    // Get elder details BEFORE deleting for audit log
    const docRef = doc(db, this.COLLECTION, elderId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const elder = snapshot.data() as Elder;

      // Delete the elder
      await deleteDoc(docRef);

      // HIPAA Audit Log: Record PHI deletion
      await logPHIAccess({
        userId,
        userRole,
        groupId: elder.groupId,
        phiType: 'elder',
        phiId: elderId,
        elderId,
        action: 'delete',
        actionDetails: `Permanently deleted elder profile: ${elder.name}`,
        purpose: 'operations',
        method: 'web_app',
      });
    } else {
      await deleteDoc(docRef); // Delete anyway if exists
    }
  }
}
