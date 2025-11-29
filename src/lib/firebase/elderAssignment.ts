/**
 * Elder Assignment Service
 *
 * Manages elder-level caregiver assignments with primary caregiver support.
 * - Primary caregiver has admin rights for specific elder
 * - Handles transfer of primary caregiver role
 * - Integrates with shift scheduling
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import type { Elder, CaregiverAssignment } from '@/types';
import { AgencyService } from './agencies';

export interface ElderAssignmentInfo {
  elderId: string;
  elderName: string;
  groupId: string;
  primaryCaregiverId?: string;
  primaryCaregiverName?: string;
  assignedCaregivers: {
    caregiverId: string;
    caregiverName: string;
    role: 'caregiver_admin' | 'caregiver';
    isPrimary: boolean;
  }[];
}

export interface PrimaryCaregiverTransfer {
  elderId: string;
  elderName: string;
  fromCaregiverId: string;
  fromCaregiverName: string;
  toCaregiverId: string;
  toCaregiverName: string;
}

export interface AssignmentConflict {
  type: 'primary_caregiver_exists';
  elderId: string;
  elderName: string;
  currentPrimaryCaregiverId: string;
  currentPrimaryCaregiverName: string;
  newCaregiverId: string;
  newCaregiverName: string;
}

export class ElderAssignmentService {
  /**
   * Get elder with assignment info
   */
  static async getElderWithAssignments(
    elderId: string,
    agencyId: string
  ): Promise<ElderAssignmentInfo | null> {
    try {
      const elderDoc = await getDoc(doc(db, 'elders', elderId));
      if (!elderDoc.exists()) {
        return null;
      }

      const elder = elderDoc.data() as Elder;

      // Get all assignments for this elder
      const assignments = await AgencyService.getAgencyAssignments(agencyId);
      const elderAssignments = assignments.filter(a =>
        a.active && a.elderIds.includes(elderId)
      );

      // Get caregiver names
      const caregiverInfo = await Promise.all(
        elderAssignments.map(async (assignment) => {
          const userDoc = await getDoc(doc(db, 'users', assignment.caregiverId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          const caregiverName = userData
            ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown'
            : 'Unknown';

          return {
            caregiverId: assignment.caregiverId,
            caregiverName,
            role: assignment.role,
            isPrimary: assignment.caregiverId === elder.primaryCaregiverId
          };
        })
      );

      return {
        elderId,
        elderName: elder.name,
        groupId: elder.groupId,
        primaryCaregiverId: elder.primaryCaregiverId,
        primaryCaregiverName: elder.primaryCaregiverName,
        assignedCaregivers: caregiverInfo
      };
    } catch (error) {
      console.error('Error getting elder with assignments:', error);
      return null;
    }
  }

  /**
   * Set primary caregiver for an elder
   */
  static async setPrimaryCaregiver(
    elderId: string,
    caregiverId: string,
    caregiverName: string,
    assignedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'elders', elderId), {
        primaryCaregiverId: caregiverId,
        primaryCaregiverName: caregiverName,
        primaryCaregiverAssignedAt: Timestamp.now(),
        primaryCaregiverAssignedBy: assignedBy
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error setting primary caregiver:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer primary caregiver role from one caregiver to another
   */
  static async transferPrimaryCaregiver(
    transfer: PrimaryCaregiverTransfer,
    transferredBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const batch = writeBatch(db);

      // Update elder's primary caregiver
      const elderRef = doc(db, 'elders', transfer.elderId);
      batch.update(elderRef, {
        primaryCaregiverId: transfer.toCaregiverId,
        primaryCaregiverName: transfer.toCaregiverName,
        primaryCaregiverAssignedAt: Timestamp.now(),
        primaryCaregiverAssignedBy: transferredBy
      });

      // Log the transfer for audit
      const transferLogRef = doc(collection(db, 'primaryCaregiverTransfers'));
      batch.set(transferLogRef, {
        elderId: transfer.elderId,
        elderName: transfer.elderName,
        fromCaregiverId: transfer.fromCaregiverId,
        fromCaregiverName: transfer.fromCaregiverName,
        toCaregiverId: transfer.toCaregiverId,
        toCaregiverName: transfer.toCaregiverName,
        transferredBy,
        transferredAt: Timestamp.now()
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error('Error transferring primary caregiver:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove primary caregiver from elder (revert to no primary)
   */
  static async removePrimaryCaregiver(
    elderId: string,
    removedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current primary for audit log
      const elderDoc = await getDoc(doc(db, 'elders', elderId));
      if (!elderDoc.exists()) {
        return { success: false, error: 'Elder not found' };
      }

      const elder = elderDoc.data() as Elder;

      const batch = writeBatch(db);

      // Clear primary caregiver fields
      const elderRef = doc(db, 'elders', elderId);
      batch.update(elderRef, {
        primaryCaregiverId: null,
        primaryCaregiverName: null,
        primaryCaregiverAssignedAt: null,
        primaryCaregiverAssignedBy: null
      });

      // Log the removal for audit
      if (elder.primaryCaregiverId) {
        const removalLogRef = doc(collection(db, 'primaryCaregiverTransfers'));
        batch.set(removalLogRef, {
          elderId,
          elderName: elder.name,
          fromCaregiverId: elder.primaryCaregiverId,
          fromCaregiverName: elder.primaryCaregiverName || 'Unknown',
          toCaregiverId: null,
          toCaregiverName: null,
          transferredBy: removedBy,
          transferredAt: Timestamp.now(),
          action: 'removed'
        });
      }

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error('Error removing primary caregiver:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if assignment would create a conflict (different primary caregiver exists)
   */
  static async checkAssignmentConflicts(
    elderIds: string[],
    newCaregiverId: string,
    newCaregiverName: string,
    assignAsPrimary: boolean
  ): Promise<AssignmentConflict[]> {
    const conflicts: AssignmentConflict[] = [];

    if (!assignAsPrimary) {
      return conflicts; // No conflicts if not assigning as primary
    }

    try {
      for (const elderId of elderIds) {
        const elderDoc = await getDoc(doc(db, 'elders', elderId));
        if (!elderDoc.exists()) continue;

        const elder = elderDoc.data() as Elder;

        // Check if elder already has a different primary caregiver
        if (
          elder.primaryCaregiverId &&
          elder.primaryCaregiverId !== newCaregiverId
        ) {
          conflicts.push({
            type: 'primary_caregiver_exists',
            elderId,
            elderName: elder.name,
            currentPrimaryCaregiverId: elder.primaryCaregiverId,
            currentPrimaryCaregiverName: elder.primaryCaregiverName || 'Unknown',
            newCaregiverId,
            newCaregiverName
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking assignment conflicts:', error);
      return [];
    }
  }

  /**
   * Get all elders in agency with their primary caregiver info
   */
  static async getAgencyEldersWithPrimaryCaregiver(
    agencyId: string
  ): Promise<ElderAssignmentInfo[]> {
    try {
      const agency = await AgencyService.getAgency(agencyId);
      if (!agency) {
        return [];
      }

      // Get all elders from all groups in the agency
      const elderInfos: ElderAssignmentInfo[] = [];

      for (const groupId of agency.groupIds) {
        const eldersQuery = query(
          collection(db, 'elders'),
          where('groupId', '==', groupId)
        );
        const eldersSnap = await getDocs(eldersQuery);

        for (const elderDoc of eldersSnap.docs) {
          const elder = elderDoc.data() as Elder;
          const info = await this.getElderWithAssignments(elderDoc.id, agencyId);
          if (info) {
            elderInfos.push(info);
          }
        }
      }

      return elderInfos;
    } catch (error) {
      console.error('Error getting agency elders with primary caregiver:', error);
      return [];
    }
  }

  /**
   * Get primary caregiver transfer history for an elder
   */
  static async getTransferHistory(
    elderId: string
  ): Promise<PrimaryCaregiverTransfer[]> {
    try {
      const transfersQuery = query(
        collection(db, 'primaryCaregiverTransfers'),
        where('elderId', '==', elderId)
      );
      const snap = await getDocs(transfersQuery);

      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          elderId: data.elderId,
          elderName: data.elderName,
          fromCaregiverId: data.fromCaregiverId,
          fromCaregiverName: data.fromCaregiverName,
          toCaregiverId: data.toCaregiverId,
          toCaregiverName: data.toCaregiverName
        };
      });
    } catch (error) {
      console.error('Error getting transfer history:', error);
      return [];
    }
  }

  /**
   * Check if a user is the primary caregiver for an elder
   */
  static async isPrimaryCaregiver(
    userId: string,
    elderId: string
  ): Promise<boolean> {
    try {
      const elderDoc = await getDoc(doc(db, 'elders', elderId));
      if (!elderDoc.exists()) {
        return false;
      }

      const elder = elderDoc.data() as Elder;
      return elder.primaryCaregiverId === userId;
    } catch (error) {
      console.error('Error checking primary caregiver:', error);
      return false;
    }
  }

  /**
   * Get all elders where a user is the primary caregiver
   */
  static async getEldersWherePrimary(
    userId: string
  ): Promise<Elder[]> {
    try {
      const eldersQuery = query(
        collection(db, 'elders'),
        where('primaryCaregiverId', '==', userId)
      );
      const snap = await getDocs(eldersQuery);

      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          groupId: data.groupId,
          name: data.name,
          dateOfBirth: data.dateOfBirth?.toDate() || new Date(),
          userId: data.userId,
          profileImage: data.profileImage,
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          primaryCaregiverId: data.primaryCaregiverId,
          primaryCaregiverName: data.primaryCaregiverName,
          primaryCaregiverAssignedAt: data.primaryCaregiverAssignedAt?.toDate(),
          primaryCaregiverAssignedBy: data.primaryCaregiverAssignedBy
        };
      });
    } catch (error) {
      console.error('Error getting elders where primary:', error);
      return [];
    }
  }
}
