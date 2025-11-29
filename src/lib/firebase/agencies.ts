/**
 * Agency Service
 * Phase 5: Agency Multi-Tenant Features
 * Manages agencies, caregivers, and elder assignments
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import {
  Agency,
  CaregiverAssignment,
  CaregiverPermissions,
  AgencyRole,
  GroupMember,
  Elder
} from '@/types';
import { canAddCaregiver } from './planLimits';
import { ElderAssignmentService, AssignmentConflict } from './elderAssignment';

export class AgencyService {
  // ============= Agency Management =============

  /**
   * Create a new agency
   */
  static async createAgency(data: Omit<Agency, 'id'>): Promise<Agency> {
    try {
      const docRef = await addDoc(collection(db, 'agencies'), {
        ...data,
        createdAt: Timestamp.fromDate(data.createdAt),
        updatedAt: Timestamp.fromDate(data.updatedAt),
        subscription: {
          ...data.subscription,
          trialEndsAt: Timestamp.fromDate(data.subscription.trialEndsAt),
          currentPeriodEnd: Timestamp.fromDate(data.subscription.currentPeriodEnd)
        }
      });

      return {
        ...data,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error creating agency:', error);
      throw error;
    }
  }

  /**
   * Get agency by ID
   */
  static async getAgency(agencyId: string): Promise<Agency | null> {
    try {
      const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));

      if (!agencyDoc.exists()) {
        return null;
      }

      const data = agencyDoc.data();

      return {
        id: agencyDoc.id,
        name: data.name,
        superAdminId: data.superAdminId,
        type: data.type,
        groupIds: data.groupIds || [],
        caregiverIds: data.caregiverIds || [],
        maxEldersPerCaregiver: data.maxEldersPerCaregiver || 3,
        subscription: {
          ...data.subscription,
          trialEndsAt: data.subscription.trialEndsAt.toDate(),
          currentPeriodEnd: data.subscription.currentPeriodEnd.toDate()
        },
        settings: data.settings,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      };
    } catch (error) {
      console.error('Error getting agency:', error);
      throw error;
    }
  }

  /**
   * Update agency
   */
  static async updateAgency(
    agencyId: string,
    updates: Partial<Pick<Agency, 'name' | 'maxEldersPerCaregiver' | 'settings'>>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'agencies', agencyId), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating agency:', error);
      throw error;
    }
  }

  /**
   * Get agencies for a user (super admin)
   */
  static async getUserAgencies(userId: string): Promise<Agency[]> {
    try {
      const q = query(
        collection(db, 'agencies'),
        where('superAdminId', '==', userId)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          superAdminId: data.superAdminId,
          type: data.type,
          groupIds: data.groupIds || [],
          caregiverIds: data.caregiverIds || [],
          maxEldersPerCaregiver: data.maxEldersPerCaregiver || 3,
          subscription: {
            ...data.subscription,
            trialEndsAt: data.subscription.trialEndsAt.toDate(),
            currentPeriodEnd: data.subscription.currentPeriodEnd.toDate()
          },
          settings: data.settings,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting user agencies:', error);
      throw error;
    }
  }

  /**
   * Get agency for a group
   */
  static async getAgencyForGroup(groupId: string): Promise<Agency | null> {
    try {
      const q = query(
        collection(db, 'agencies'),
        where('groupIds', 'array-contains', groupId)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        name: data.name,
        superAdminId: data.superAdminId,
        type: data.type,
        groupIds: data.groupIds || [],
        caregiverIds: data.caregiverIds || [],
        maxEldersPerCaregiver: data.maxEldersPerCaregiver || 3,
        subscription: {
          ...data.subscription,
          trialEndsAt: data.subscription.trialEndsAt.toDate(),
          currentPeriodEnd: data.subscription.currentPeriodEnd.toDate()
        },
        settings: data.settings,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      };
    } catch (error) {
      console.error('Error getting agency for group:', error);
      throw error;
    }
  }

  // ============= Caregiver Assignment Management =============

  /**
   * Assign caregiver to elders
   * @param assignAsPrimary - If true, sets this caregiver as primary for the elders
   * @param forceTransfer - If true, transfers primary caregiver without prompting
   */
  static async assignCaregiverToElders(
    agencyId: string,
    caregiverId: string,
    elderIds: string[],
    groupId: string,
    assignedBy: string,
    role: 'caregiver_admin' | 'caregiver' = 'caregiver',
    permissions?: Partial<CaregiverPermissions>,
    assignAsPrimary: boolean = false,
    forceTransfer: boolean = false
  ): Promise<{ assignmentId: string; conflicts?: AssignmentConflict[] }> {
    try {
      // Validate elder limit
      const agency = await this.getAgency(agencyId);
      if (!agency) {
        throw new Error('Agency not found');
      }

      // Get caregiver name for primary assignment
      let caregiverName = 'Unknown';
      const caregiverDoc = await getDoc(doc(db, 'users', caregiverId));
      if (caregiverDoc.exists()) {
        const data = caregiverDoc.data();
        caregiverName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
      }

      // Check for primary caregiver conflicts if assigning as primary
      if (assignAsPrimary && !forceTransfer) {
        const conflicts = await ElderAssignmentService.checkAssignmentConflicts(
          elderIds,
          caregiverId,
          caregiverName,
          true
        );

        if (conflicts.length > 0) {
          // Return conflicts for UI to handle - don't proceed with assignment yet
          return { assignmentId: '', conflicts };
        }
      }

      // Check existing assignments for this caregiver
      const existingAssignments = await this.getCaregiverAssignments(agencyId, caregiverId);
      const currentElderCount = existingAssignments
        .filter(a => a.active)
        .reduce((total, assignment) => total + assignment.elderIds.length, 0);

      const newTotalElders = currentElderCount + elderIds.length;

      if (newTotalElders > agency.maxEldersPerCaregiver) {
        throw new Error(
          `Cannot assign ${elderIds.length} more elders. Caregiver already has ${currentElderCount} elders assigned. ` +
          `Limit is ${agency.maxEldersPerCaregiver} elders per caregiver.`
        );
      }

      // Create assignment with default or provided permissions
      const defaultPermissions: CaregiverPermissions = {
        canEditMedications: role === 'caregiver_admin' || assignAsPrimary,
        canLogDoses: true,
        canViewReports: true,
        canManageSchedules: role === 'caregiver_admin' || assignAsPrimary,
        canInviteMembers: role === 'caregiver_admin' || assignAsPrimary
      };

      const assignment: Omit<CaregiverAssignment, 'id'> = {
        agencyId,
        caregiverId,
        elderIds,
        groupId,
        role: assignAsPrimary ? 'caregiver_admin' : role,
        assignedAt: new Date(),
        assignedBy,
        permissions: { ...defaultPermissions, ...permissions },
        active: true
      };

      const docRef = await addDoc(
        collection(db, 'caregiver_assignments'),
        {
          ...assignment,
          assignedAt: Timestamp.fromDate(assignment.assignedAt)
        }
      );

      // Update agency's caregiver list
      if (!agency.caregiverIds.includes(caregiverId)) {
        // Check if agency can add more caregivers (plan limit)
        const canAdd = await canAddCaregiver(agencyId);
        if (!canAdd.allowed) {
          throw new Error(canAdd.message);
        }

        await updateDoc(doc(db, 'agencies', agencyId), {
          caregiverIds: [...agency.caregiverIds, caregiverId],
          updatedAt: Timestamp.now()
        });
      }

      // Update user's agency membership
      const userDocData = caregiverDoc.exists() ? caregiverDoc.data() : null;
      if (userDocData) {
        const agencies = userDocData.agencies || [];

        // Check if already has this agency
        const existingAgency = agencies.find((a: any) => a.agencyId === agencyId);

        if (!existingAgency) {
          await updateDoc(doc(db, 'users', caregiverId), {
            agencies: [
              ...agencies,
              {
                agencyId,
                role: assignAsPrimary ? 'caregiver_admin' : role,
                joinedAt: Timestamp.now(),
                assignedElderIds: elderIds,
                assignedGroupIds: [groupId]
              }
            ]
          });
        } else {
          // Update existing agency membership with new elder assignments
          const updatedAgencies = agencies.map((a: any) =>
            a.agencyId === agencyId
              ? {
                  ...a,
                  assignedElderIds: [...new Set([...(a.assignedElderIds || []), ...elderIds])],
                  assignedGroupIds: [...new Set([...(a.assignedGroupIds || []), groupId])]
                }
              : a
          );

          await updateDoc(doc(db, 'users', caregiverId), {
            agencies: updatedAgencies
          });
        }
      }

      // Set primary caregiver for elders if requested
      if (assignAsPrimary || forceTransfer) {
        for (const elderId of elderIds) {
          await ElderAssignmentService.setPrimaryCaregiver(
            elderId,
            caregiverId,
            caregiverName,
            assignedBy
          );
        }
      }

      return { assignmentId: docRef.id };
    } catch (error) {
      console.error('Error assigning caregiver to elders:', error);
      throw error;
    }
  }

  /**
   * Get all assignments for an agency
   */
  static async getAgencyAssignments(agencyId: string): Promise<CaregiverAssignment[]> {
    try {
      const q = query(
        collection(db, 'caregiver_assignments'),
        where('agencyId', '==', agencyId),
        where('active', '==', true)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          agencyId: data.agencyId,
          caregiverId: data.caregiverId,
          elderIds: data.elderIds,
          groupId: data.groupId,
          role: data.role,
          assignedAt: data.assignedAt.toDate(),
          assignedBy: data.assignedBy,
          permissions: data.permissions,
          active: data.active
        };
      });
    } catch (error) {
      console.error('Error getting agency assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignments for a specific caregiver
   */
  static async getCaregiverAssignments(
    agencyId: string,
    caregiverId: string
  ): Promise<CaregiverAssignment[]> {
    try {
      const q = query(
        collection(db, 'caregiver_assignments'),
        where('agencyId', '==', agencyId),
        where('caregiverId', '==', caregiverId)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          agencyId: data.agencyId,
          caregiverId: data.caregiverId,
          elderIds: data.elderIds,
          groupId: data.groupId,
          role: data.role,
          assignedAt: data.assignedAt.toDate(),
          assignedBy: data.assignedBy,
          permissions: data.permissions,
          active: data.active
        };
      });
    } catch (error) {
      console.error('Error getting caregiver assignments:', error);
      throw error;
    }
  }

  /**
   * Get elders assigned to a caregiver
   */
  static async getCaregiverElders(
    agencyId: string,
    caregiverId: string
  ): Promise<string[]> {
    try {
      const assignments = await this.getCaregiverAssignments(agencyId, caregiverId);

      const elderIds = assignments
        .filter(a => a.active)
        .flatMap(a => a.elderIds);

      return [...new Set(elderIds)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting caregiver elders:', error);
      throw error;
    }
  }

  /**
   * Remove caregiver assignment
   */
  static async removeAssignment(assignmentId: string): Promise<void> {
    try {
      // Mark as inactive instead of deleting (audit trail)
      await updateDoc(doc(db, 'caregiver_assignments', assignmentId), {
        active: false
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      throw error;
    }
  }

  /**
   * Update assignment permissions
   */
  static async updateAssignmentPermissions(
    assignmentId: string,
    permissions: Partial<CaregiverPermissions>
  ): Promise<void> {
    try {
      const assignmentDoc = await getDoc(doc(db, 'caregiver_assignments', assignmentId));

      if (!assignmentDoc.exists()) {
        throw new Error('Assignment not found');
      }

      const currentPermissions = assignmentDoc.data().permissions;

      await updateDoc(doc(db, 'caregiver_assignments', assignmentId), {
        permissions: { ...currentPermissions, ...permissions }
      });
    } catch (error) {
      console.error('Error updating assignment permissions:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to an elder
   */
  static async canAccessElder(
    userId: string,
    elderId: string,
    agencyId: string
  ): Promise<boolean> {
    try {
      // Check if super admin
      const agency = await this.getAgency(agencyId);
      if (agency && agency.superAdminId === userId) {
        return true;
      }

      // Check caregiver assignments
      const assignments = await this.getCaregiverAssignments(agencyId, userId);

      return assignments
        .filter(a => a.active)
        .some(a => a.elderIds.includes(elderId));
    } catch (error) {
      console.error('Error checking elder access:', error);
      return false;
    }
  }

  /**
   * Get caregiver's role in agency
   */
  static async getCaregiverRole(
    userId: string,
    agencyId: string
  ): Promise<AgencyRole | null> {
    try {
      const agency = await this.getAgency(agencyId);

      if (!agency) {
        return null;
      }

      // Check if super admin
      if (agency.superAdminId === userId) {
        return 'super_admin';
      }

      // Check assignments
      const assignments = await this.getCaregiverAssignments(agencyId, userId);

      if (assignments.length === 0) {
        return null;
      }

      // Return highest role
      const hasAdminAssignment = assignments.some(a => a.active && a.role === 'caregiver_admin');

      return hasAdminAssignment ? 'caregiver_admin' : 'caregiver';
    } catch (error) {
      console.error('Error getting caregiver role:', error);
      return null;
    }
  }

  /**
   * Transfer agency ownership (super admin)
   */
  static async transferOwnership(
    agencyId: string,
    newSuperAdminId: string,
    currentSuperAdminId: string
  ): Promise<void> {
    try {
      const agency = await this.getAgency(agencyId);

      if (!agency) {
        throw new Error('Agency not found');
      }

      if (agency.superAdminId !== currentSuperAdminId) {
        throw new Error('Only current super admin can transfer ownership');
      }

      await updateDoc(doc(db, 'agencies', agencyId), {
        superAdminId: newSuperAdminId,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }
}
