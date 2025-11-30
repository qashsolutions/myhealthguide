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

    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...elder,
      groupId,
      ...(elder.dateOfBirth && { dateOfBirth: Timestamp.fromDate(elder.dateOfBirth) }),
      createdAt: Timestamp.fromDate(elder.createdAt)
    });

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
    const elders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateOfBirth: doc.data().dateOfBirth.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as Elder[];

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

    const elder = {
      id: snapshot.id,
      ...snapshot.data(),
      dateOfBirth: snapshot.data().dateOfBirth.toDate(),
      createdAt: snapshot.data().createdAt.toDate()
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
   * Delete elder
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
        actionDetails: `Deleted elder profile: ${elder.name}`,
        purpose: 'operations',
        method: 'web_app',
      });
    } else {
      await deleteDoc(docRef); // Delete anyway if exists
    }
  }
}
