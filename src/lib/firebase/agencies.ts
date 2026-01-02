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

      // Sync caregiver to group members for Firestore access control
      await this.syncCaregiverToGroupMembers(
        groupId,
        caregiverId,
        agencyId,
        assignedBy,
        true // canWrite = true for caregivers
      );

      return { assignmentId: docRef.id };
    } catch (error) {
      console.error('Error assigning caregiver to elders:', error);
      throw error;
    }
  }

  /**
   * Sync caregiver to group members for Firestore access control
   * This ensures caregivers can read/write elder data via group membership
   */
  static async syncCaregiverToGroupMembers(
    groupId: string,
    caregiverId: string,
    agencyId: string,
    addedBy: string,
    canWrite: boolean = true
  ): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        console.error('[AgencyService] Group not found for sync:', groupId);
        return;
      }

      const groupData = groupSnap.data();
      const members: GroupMember[] = groupData.members || [];
      const memberIds: string[] = groupData.memberIds || [];
      const writeMemberIds: string[] = groupData.writeMemberIds || [];

      // Check if caregiver is already a member
      const existingMember = members.find(m => m.userId === caregiverId);
      if (existingMember) {
        // Update existing member's canWrite permission if needed
        if (existingMember.canWrite !== canWrite) {
          const updatedMembers = members.map(m =>
            m.userId === caregiverId ? { ...m, canWrite } : m
          );
          const updatedWriteMemberIds = canWrite
            ? [...new Set([...writeMemberIds, caregiverId])]
            : writeMemberIds.filter(id => id !== caregiverId);

          await updateDoc(groupRef, {
            members: updatedMembers,
            writeMemberIds: updatedWriteMemberIds,
            updatedAt: Timestamp.now()
          });
        }
        return;
      }

      // Add new caregiver as group member
      const newMember: GroupMember = {
        userId: caregiverId,
        role: 'agency_caregiver',
        permissionLevel: canWrite ? 'write' : 'read',
        permissions: [], // Legacy field
        addedAt: new Date(),
        addedBy,
        approvalStatus: 'approved', // Auto-approved for agency caregivers
        approvedAt: new Date(),
        approvedBy: addedBy,
        agencyId,
        canWrite
      };

      const updatedMemberIds = [...new Set([...memberIds, caregiverId])];
      const updatedWriteMemberIds = canWrite
        ? [...new Set([...writeMemberIds, caregiverId])]
        : writeMemberIds;

      await updateDoc(groupRef, {
        members: [...members, newMember],
        memberIds: updatedMemberIds,
        writeMemberIds: updatedWriteMemberIds,
        updatedAt: Timestamp.now()
      });

      console.log('[AgencyService] Synced caregiver to group members:', {
        groupId,
        caregiverId,
        canWrite
      });
    } catch (error) {
      console.error('Error syncing caregiver to group members:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Remove caregiver from group members (when unassigning)
   */
  static async removeCaregiverFromGroupMembers(
    groupId: string,
    caregiverId: string
  ): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) return;

      const groupData = groupSnap.data();
      const members: GroupMember[] = groupData.members || [];
      const memberIds: string[] = groupData.memberIds || [];
      const writeMemberIds: string[] = groupData.writeMemberIds || [];

      // Only remove if they are an agency_caregiver (not a family member)
      const member = members.find(m => m.userId === caregiverId);
      if (!member || member.role !== 'agency_caregiver') return;

      await updateDoc(groupRef, {
        members: members.filter(m => m.userId !== caregiverId),
        memberIds: memberIds.filter(id => id !== caregiverId),
        writeMemberIds: writeMemberIds.filter(id => id !== caregiverId),
        updatedAt: Timestamp.now()
      });

      console.log('[AgencyService] Removed caregiver from group members:', {
        groupId,
        caregiverId
      });
    } catch (error) {
      console.error('Error removing caregiver from group members:', error);
    }
  }

  /**
   * Sync all existing caregiver assignments to group members
   * Use this to migrate existing assignments that weren't synced
   */
  static async syncAllCaregiverAssignments(agencyId: string): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const assignments = await this.getAgencyAssignments(agencyId);

      for (const assignment of assignments) {
        try {
          await this.syncCaregiverToGroupMembers(
            assignment.groupId,
            assignment.caregiverId,
            agencyId,
            'system_migration',
            true // canWrite = true for caregivers
          );
          synced++;
        } catch (err) {
          console.error('Failed to sync assignment:', assignment.id, err);
          errors++;
        }
      }

      console.log('[AgencyService] Sync complete:', { agencyId, synced, errors });
      return { synced, errors };
    } catch (error) {
      console.error('Error syncing caregiver assignments:', error);
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

  // ============= Elder Query Methods =============

  /**
   * Get all elders for an agency (from the elders collection)
   */
  static async getAgencyElders(agencyId: string): Promise<Elder[]> {
    try {
      const agency = await this.getAgency(agencyId);
      if (!agency) return [];

      const elders: Elder[] = [];

      // Query elders for each group in the agency
      for (const groupId of agency.groupIds) {
        const q = query(
          collection(db, 'elders'),
          where('groupId', '==', groupId)
        );
        const snap = await getDocs(q);

        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          // Only include non-archived elders
          if (!data.archived) {
            elders.push({
              id: docSnap.id,
              groupId: data.groupId,
              name: data.name,
              dateOfBirth: data.dateOfBirth?.toDate?.() || undefined,
              approximateAge: data.approximateAge,
              userId: data.userId,
              profileImage: data.profileImage,
              notes: data.notes || '',
              createdAt: data.createdAt?.toDate?.() || new Date(),
              preferredName: data.preferredName,
              gender: data.gender,
              biologicalSex: data.biologicalSex,
              primaryCaregiverId: data.primaryCaregiverId,
              primaryCaregiverName: data.primaryCaregiverName,
              primaryCaregiverAssignedAt: data.primaryCaregiverAssignedAt?.toDate?.(),
              primaryCaregiverAssignedBy: data.primaryCaregiverAssignedBy,
            } as Elder);
          }
        });
      }

      return elders;
    } catch (error) {
      console.error('Error getting agency elders:', error);
      throw error;
    }
  }

  /**
   * Get elders grouped by caregiver
   * Returns: Map<caregiverId, Elder[]>
   * Also returns unassigned elders under the key 'unassigned'
   */
  static async getEldersByCaregiver(agencyId: string): Promise<{
    caregiverElders: Map<string, Elder[]>;
    unassignedElders: Elder[];
  }> {
    try {
      const [assignments, elders] = await Promise.all([
        this.getAgencyAssignments(agencyId),
        this.getAgencyElders(agencyId)
      ]);

      // Create a map of elder ID to elder object
      const elderMap = new Map(elders.map(e => [e.id, e]));

      // Track which elders are assigned
      const assignedElderIds = new Set<string>();

      // Group elders by caregiver
      const caregiverElders = new Map<string, Elder[]>();

      for (const assignment of assignments) {
        if (!assignment.active) continue;

        const assignedElders = assignment.elderIds
          .map(id => {
            assignedElderIds.add(id);
            return elderMap.get(id);
          })
          .filter((e): e is Elder => e !== undefined);

        // Merge with existing elders for this caregiver (if multiple assignments)
        const existing = caregiverElders.get(assignment.caregiverId) || [];
        caregiverElders.set(assignment.caregiverId, [...existing, ...assignedElders]);
      }

      // Find unassigned elders
      const unassignedElders = elders.filter(e => !assignedElderIds.has(e.id));

      return { caregiverElders, unassignedElders };
    } catch (error) {
      console.error('Error getting elders by caregiver:', error);
      throw error;
    }
  }

  /**
   * Get emergency contacts for multiple elders
   * @param elderGroupMap - Map of elderId to groupId (required for Firestore security rules)
   */
  static async getElderEmergencyContacts(elderGroupMap: Map<string, string>): Promise<Map<string, any[]>> {
    try {
      const contactsMap = new Map<string, any[]>();

      if (elderGroupMap.size === 0) return contactsMap;

      // Group elderIds by their groupId for efficient querying
      const groupToElderIds = new Map<string, string[]>();
      elderGroupMap.forEach((groupId, elderId) => {
        const existing = groupToElderIds.get(groupId) || [];
        existing.push(elderId);
        groupToElderIds.set(groupId, existing);
      });

      // Query per groupId (security rules require groupId in query)
      for (const [groupId, elderIds] of groupToElderIds.entries()) {
        // Firestore 'in' query supports max 30 items, so batch if needed
        const batches = [];
        for (let i = 0; i < elderIds.length; i += 30) {
          batches.push(elderIds.slice(i, i + 30));
        }

        for (const batch of batches) {
          const q = query(
            collection(db, 'elderEmergencyContacts'),
            where('groupId', '==', groupId),
            where('elderId', 'in', batch)
          );
          const snap = await getDocs(q);

          snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            const elderId = data.elderId;
            const existing = contactsMap.get(elderId) || [];
            existing.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
            });
            contactsMap.set(elderId, existing);
          });
        }
      }

      return contactsMap;
    } catch (error) {
      console.error('Error getting elder emergency contacts:', error);
      return new Map();
    }
  }

  /**
   * Get elders with their emergency contacts, grouped by caregiver
   */
  static async getEldersWithContactsByCaregiver(agencyId: string): Promise<{
    caregiverElders: Map<string, any[]>;
    unassignedElders: any[];
  }> {
    try {
      const { caregiverElders, unassignedElders } = await this.getEldersByCaregiver(agencyId);

      // Collect elder ID to group ID mapping (required for Firestore security rules)
      const elderGroupMap = new Map<string, string>();
      caregiverElders.forEach(elders => {
        elders.forEach(e => {
          if (e.groupId) elderGroupMap.set(e.id, e.groupId);
        });
      });
      unassignedElders.forEach(e => {
        if (e.groupId) elderGroupMap.set(e.id, e.groupId);
      });

      // Fetch emergency contacts for all elders
      const contactsMap = await this.getElderEmergencyContacts(elderGroupMap);

      // Attach contacts to elders
      const attachContacts = (elder: Elder) => ({
        ...elder,
        emergencyContacts: contactsMap.get(elder.id) || [],
      });

      // Update caregiverElders map
      const updatedCaregiverElders = new Map<string, any[]>();
      caregiverElders.forEach((elders, caregiverId) => {
        updatedCaregiverElders.set(caregiverId, elders.map(attachContacts));
      });

      return {
        caregiverElders: updatedCaregiverElders,
        unassignedElders: unassignedElders.map(attachContacts),
      };
    } catch (error) {
      console.error('Error getting elders with contacts:', error);
      throw error;
    }
  }

  /**
   * Get elder-to-caregiver mapping for display purposes
   * Returns Map<elderId, { caregiverId, caregiverName, isPrimary }>
   * Uses primary caregiver if set, otherwise first assigned caregiver
   */
  static async getElderCaregiverMapping(agencyId: string): Promise<Map<string, {
    caregiverId: string;
    caregiverName: string;
    isPrimary: boolean;
  }>> {
    try {
      const [assignments, elders] = await Promise.all([
        this.getAgencyAssignments(agencyId),
        this.getAgencyElders(agencyId)
      ]);

      // Build mapping of caregiverId to assigned elderIds
      const caregiverToElders = new Map<string, string[]>();
      for (const assignment of assignments) {
        if (!assignment.active) continue;
        for (const elderId of assignment.elderIds) {
          const existing = caregiverToElders.get(assignment.caregiverId) || [];
          if (!existing.includes(elderId)) {
            existing.push(elderId);
            caregiverToElders.set(assignment.caregiverId, existing);
          }
        }
      }

      // Get unique caregiver IDs
      const caregiverIds = Array.from(caregiverToElders.keys());

      // Fetch caregiver names
      const caregiverNames = new Map<string, string>();
      for (const caregiverId of caregiverIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', caregiverId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
            caregiverNames.set(caregiverId, name);
          }
        } catch {
          caregiverNames.set(caregiverId, 'Unknown');
        }
      }

      // Build elder-to-caregiver mapping
      const elderCaregiverMap = new Map<string, {
        caregiverId: string;
        caregiverName: string;
        isPrimary: boolean;
      }>();

      for (const elder of elders) {
        // Prefer primary caregiver if set
        if (elder.primaryCaregiverId && elder.primaryCaregiverName) {
          elderCaregiverMap.set(elder.id, {
            caregiverId: elder.primaryCaregiverId,
            caregiverName: elder.primaryCaregiverName,
            isPrimary: true
          });
        } else {
          // Find first assigned caregiver
          for (const [caregiverId, elderIds] of caregiverToElders.entries()) {
            if (elderIds.includes(elder.id)) {
              elderCaregiverMap.set(elder.id, {
                caregiverId,
                caregiverName: caregiverNames.get(caregiverId) || 'Unknown',
                isPrimary: false
              });
              break;
            }
          }
        }
      }

      return elderCaregiverMap;
    } catch (error) {
      console.error('Error getting elder-caregiver mapping:', error);
      return new Map();
    }
  }

  /**
   * Get elders grouped by caregiver with caregiver names
   * Returns sections: Array<{ caregiverId, caregiverName, elders: Elder[] }>
   * Plus unassignedElders separately
   */
  static async getEldersGroupedByCaregiver(agencyId: string): Promise<{
    sections: Array<{
      caregiverId: string;
      caregiverName: string;
      elders: Elder[];
    }>;
    unassignedElders: Elder[];
  }> {
    try {
      const { caregiverElders, unassignedElders } = await this.getEldersByCaregiver(agencyId);

      // Get unique caregiver IDs
      const caregiverIds = Array.from(caregiverElders.keys());

      // Fetch caregiver names
      const sections: Array<{
        caregiverId: string;
        caregiverName: string;
        elders: Elder[];
      }> = [];

      for (const caregiverId of caregiverIds) {
        const elders = caregiverElders.get(caregiverId) || [];
        if (elders.length === 0) continue;

        let caregiverName = 'Unknown';
        try {
          const userDoc = await getDoc(doc(db, 'users', caregiverId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            caregiverName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
          }
        } catch {
          // Keep default 'Unknown'
        }

        sections.push({
          caregiverId,
          caregiverName,
          elders
        });
      }

      // Sort sections by caregiver name
      sections.sort((a, b) => a.caregiverName.localeCompare(b.caregiverName));

      return { sections, unassignedElders };
    } catch (error) {
      console.error('Error getting elders grouped by caregiver:', error);
      return { sections: [], unassignedElders: [] };
    }
  }
}
