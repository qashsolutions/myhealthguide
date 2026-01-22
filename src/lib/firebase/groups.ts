/**
 * Groups Service
 * Phase 6: Groups & Collaboration
 */

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import { Group, GroupMember, Permission, PermissionLevel, PendingApproval, ReportRecipient } from '@/types';
import { generateInviteCode, encryptInviteCode, decryptInviteCode } from '@/lib/utils/inviteCode';
import { NotificationService } from './notifications';
import { canCreateGroup, canAddGroupMember } from './planLimits';
import { toSafeDate } from '@/lib/utils/dateConversion';

export class GroupService {
  /**
   * Create a new group
   */
  static async createGroup(data: Omit<Group, 'id'>, userId: string): Promise<Group> {
    try {
      // Check plan limits before creating group
      const canCreate = await canCreateGroup(userId);
      if (!canCreate.allowed) {
        throw new Error(canCreate.message || 'Cannot create group due to plan limits');
      }

      const docRef = await addDoc(collection(db, 'groups'), {
        ...data,
        memberIds: data.memberIds || [],
        createdAt: Timestamp.fromDate(data.createdAt),
        updatedAt: Timestamp.fromDate(data.updatedAt),
        subscription: {
          ...data.subscription,
          trialEndsAt: Timestamp.fromDate(data.subscription.trialEndsAt),
          currentPeriodEnd: Timestamp.fromDate(data.subscription.currentPeriodEnd)
        },
        members: data.members.map(member => ({
          ...member,
          addedAt: Timestamp.fromDate(member.addedAt)
        }))
      });

      return {
        ...data,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Get group by ID
   */
  static async getGroup(groupId: string): Promise<Group | null> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));

      if (!groupDoc.exists()) {
        return null;
      }

      const data = groupDoc.data();

      return {
        id: groupDoc.id,
        name: data.name,
        type: data.type,
        agencyId: data.agencyId,
        adminId: data.adminId,
        members: data.members || [],
        memberIds: data.memberIds || [],
        writeMemberIds: data.writeMemberIds || [],
        elders: data.elders || [],
        subscription: data.subscription,
        settings: data.settings,
        inviteCode: data.inviteCode || '',
        inviteCodeExpiry: data.inviteCodeExpiry ? toSafeDate(data.inviteCodeExpiry) : undefined,
        inviteCodeGeneratedAt: toSafeDate(data.inviteCodeGeneratedAt),
        inviteCodeGeneratedBy: data.inviteCodeGeneratedBy || data.adminId,
        createdAt: toSafeDate(data.createdAt),
        updatedAt: toSafeDate(data.updatedAt)
      };
    } catch (error) {
      console.error('Error getting group:', error);
      throw error;
    }
  }

  /**
   * Get group members with user details
   */
  static async getGroupMembersWithDetails(groupId: string): Promise<Array<GroupMember & {
    name: string;
    email: string;
    profileImage?: string;
  }>> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        return [];
      }

      const membersWithDetails = await Promise.all(
        group.members.map(async (member) => {
          const userDoc = await getDoc(doc(db, 'users', member.userId));

          if (!userDoc.exists()) {
            return null;
          }

          const userData = userDoc.data();

          return {
            ...member,
            name: `${userData.firstName} ${userData.lastName}`,
            email: userData.email,
            profileImage: userData.profileImage
          };
        })
      );

      return membersWithDetails.filter(m => m !== null) as Array<GroupMember & {
        name: string;
        email: string;
        profileImage?: string;
      }>;
    } catch (error) {
      console.error('Error getting group members with details:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    groupId: string,
    userId: string,
    newRole: 'admin' | 'member'
  ): Promise<void> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      const updatedMembers = group.members.map(member =>
        member.userId === userId
          ? { ...member, role: newRole }
          : member
      );

      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        updatedAt: Timestamp.now()
      });

      // Also update user's groups array
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedUserGroups = userData.groups.map((g: any) =>
          g.groupId === groupId
            ? { ...g, role: newRole }
            : g
        );

        await updateDoc(doc(db, 'users', userId), {
          groups: updatedUserGroups
        });
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Update member permissions
   */
  static async updateMemberPermissions(
    groupId: string,
    userId: string,
    permissions: Permission[]
  ): Promise<void> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      const updatedMembers = group.members.map(member =>
        member.userId === userId
          ? { ...member, permissions }
          : member
      );

      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating member permissions:', error);
      throw error;
    }
  }

  /**
   * Remove member from group
   */
  static async removeMember(
    groupId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      // Can't remove the admin
      if (userId === group.adminId) {
        throw new Error('Cannot remove the group admin');
      }

      // Remove from group
      const updatedMembers = group.members.filter(member => member.userId !== userId);

      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        updatedAt: Timestamp.now()
      });

      // Remove group from user's groups array
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedUserGroups = userData.groups.filter(
          (g: any) => g.groupId !== groupId
        );

        await updateDoc(doc(db, 'users', userId), {
          groups: updatedUserGroups
        });
      }
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Transfer group ownership
   */
  static async transferOwnership(
    groupId: string,
    newAdminId: string,
    currentAdminId: string
  ): Promise<void> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (group.adminId !== currentAdminId) {
        throw new Error('Only the current admin can transfer ownership');
      }

      // Verify new admin is a member
      const newAdminMember = group.members.find(m => m.userId === newAdminId);
      if (!newAdminMember) {
        throw new Error('New admin must be a member of the group');
      }

      // Update group
      const updatedMembers = group.members.map(member => {
        if (member.userId === newAdminId) {
          return { ...member, role: 'admin' as const };
        }
        if (member.userId === currentAdminId) {
          return { ...member, role: 'member' as const };
        }
        return member;
      });

      await updateDoc(doc(db, 'groups', groupId), {
        adminId: newAdminId,
        members: updatedMembers,
        updatedAt: Timestamp.now()
      });

      // Update both users' group roles
      await Promise.all([
        this.updateUserGroupRole(newAdminId, groupId, 'admin'),
        this.updateUserGroupRole(currentAdminId, groupId, 'member')
      ]);
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }

  /**
   * Update user's group role in their user document
   */
  private static async updateUserGroupRole(
    userId: string,
    groupId: string,
    newRole: 'admin' | 'member'
  ): Promise<void> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const updatedGroups = userData.groups.map((g: any) =>
        g.groupId === groupId
          ? { ...g, role: newRole }
          : g
      );

      await updateDoc(doc(db, 'users', userId), {
        groups: updatedGroups
      });
    }
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(
    groupId: string,
    userId: string,
    permission: Permission
  ): Promise<boolean> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        return false;
      }

      // Admin has all permissions
      if (group.adminId === userId) {
        return true;
      }

      const member = group.members.find(m => m.userId === userId);

      if (!member) {
        return false;
      }

      return member.permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get user's role in group
   */
  static async getUserRole(
    groupId: string,
    userId: string
  ): Promise<'admin' | 'member' | 'agency_caregiver' | null> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        return null;
      }

      if (group.adminId === userId) {
        return 'admin';
      }

      const member = group.members.find(m => m.userId === userId);

      return member?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Update group name
   */
  static async updateGroupName(groupId: string, name: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        name,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating group name:', error);
      throw error;
    }
  }

  /**
   * Update group settings (including AI features)
   */
  static async updateGroupSettings(
    groupId: string,
    settings: Partial<{
      aiFeatures?: any;
      notifications?: any;
      privacy?: any;
      agencyId?: string;
    }>
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: Timestamp.now()
      };

      // Update specific settings fields
      if (settings.aiFeatures !== undefined) {
        updateData['settings.aiFeatures'] = settings.aiFeatures;
      }
      if (settings.notifications !== undefined) {
        updateData['settings.notifications'] = settings.notifications;
      }
      if (settings.privacy !== undefined) {
        updateData['settings.privacy'] = settings.privacy;
      }
      // Update agencyId if provided
      if (settings.agencyId !== undefined) {
        updateData['agencyId'] = settings.agencyId;
      }

      await updateDoc(doc(db, 'groups', groupId), updateData);
    } catch (error) {
      console.error('Error updating group settings:', error);
      throw error;
    }
  }

  /**
   * Get user's groups
   */
  static async getUserGroups(userId: string): Promise<Group[]> {
    try {
      const q = query(
        collection(db, 'groups'),
        where('members', 'array-contains', { userId })
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          agencyId: data.agencyId,
          adminId: data.adminId,
          members: data.members || [],
          memberIds: data.memberIds || [],
          writeMemberIds: data.writeMemberIds || [],
          elders: data.elders || [],
          subscription: data.subscription,
          settings: data.settings,
          inviteCode: data.inviteCode || '',
          inviteCodeExpiry: data.inviteCodeExpiry ? toSafeDate(data.inviteCodeExpiry) : undefined,
          inviteCodeGeneratedAt: toSafeDate(data.inviteCodeGeneratedAt),
          inviteCodeGeneratedBy: data.inviteCodeGeneratedBy || data.adminId,
          createdAt: toSafeDate(data.createdAt),
          updatedAt: toSafeDate(data.updatedAt)
        };
      });
    } catch (error) {
      console.error('Error getting user groups:', error);
      throw error;
    }
  }

  // ============= Invite Code Management =============

  /**
   * Generate new invite code for group
   */
  static async generateGroupInviteCode(
    groupId: string,
    generatedBy: string
  ): Promise<string> {
    try {
      const plainCode = generateInviteCode();
      const encryptedCode = await encryptInviteCode(plainCode);

      await updateDoc(doc(db, 'groups', groupId), {
        inviteCode: encryptedCode,
        inviteCodeGeneratedAt: Timestamp.now(),
        inviteCodeGeneratedBy: generatedBy,
        updatedAt: Timestamp.now()
      });

      return plainCode; // Return plain code to show to admin
    } catch (error) {
      console.error('Error generating invite code:', error);
      throw error;
    }
  }

  /**
   * Refresh invite code (invalidates old code)
   */
  static async refreshInviteCode(
    groupId: string,
    refreshedBy: string
  ): Promise<string> {
    // Same as generate - creates new code
    return this.generateGroupInviteCode(groupId, refreshedBy);
  }

  /**
   * Verify invite code
   */
  static async verifyInviteCode(
    groupId: string,
    plainCode: string
  ): Promise<boolean> {
    try {
      const group = await this.getGroup(groupId);

      if (!group || !group.inviteCode) {
        return false;
      }

      // Decrypt stored code
      const storedPlainCode = await decryptInviteCode(group.inviteCode);

      // Check if codes match
      if (storedPlainCode !== plainCode) {
        return false;
      }

      // Check if code has expired (if expiry is set)
      if (group.inviteCodeExpiry && group.inviteCodeExpiry < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying invite code:', error);
      return false;
    }
  }

  /**
   * Get decrypted invite code (admin only)
   */
  static async getInviteCode(groupId: string): Promise<string | null> {
    try {
      const group = await this.getGroup(groupId);

      if (!group || !group.inviteCode) {
        return null;
      }

      return await decryptInviteCode(group.inviteCode);
    } catch (error) {
      console.error('Error getting invite code:', error);
      return null;
    }
  }

  /**
   * Find group by invite code
   * NOTE: This is inefficient for large datasets - consider using a separate invite_codes collection
   */
  static async findGroupByInviteCode(plainCode: string): Promise<string | null> {
    try {
      // Get all groups (inefficient - for production, use a dedicated collection)
      const q = query(collection(db, 'groups'));
      const snapshot = await getDocs(q);

      // Check each group's invite code
      for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data.inviteCode) {
          try {
            const storedPlainCode = await decryptInviteCode(data.inviteCode);

            if (storedPlainCode === plainCode) {
              return doc.id;
            }
          } catch (err) {
            // Skip invalid encrypted codes
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding group by invite code:', error);
      return null;
    }
  }

  // ============= Permission Management =============

  /**
   * Update member permission level
   */
  static async updateMemberPermissionLevel(
    groupId: string,
    userId: string,
    permissionLevel: PermissionLevel
  ): Promise<void> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      // Check if assigning 'write' permission
      if (permissionLevel === 'write') {
        // Ensure only 1 member has 'write' permission
        const existingWriteMember = group.members.find(
          m => m.permissionLevel === 'write' && m.userId !== userId
        );

        if (existingWriteMember) {
          throw new Error('Only one member can have write permission. Please revoke existing write permission first.');
        }
      }

      const updatedMembers = group.members.map(member =>
        member.userId === userId
          ? { ...member, permissionLevel }
          : member
      );

      // Update writeMemberIds array for efficient Firestore rules checking
      const writeMemberIds = updatedMembers
        .filter(m => m.permissionLevel === 'write')
        .map(m => m.userId);

      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        writeMemberIds: writeMemberIds,
        updatedAt: Timestamp.now()
      });

      // Update user's group membership
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedUserGroups = userData.groups.map((g: any) =>
          g.groupId === groupId
            ? { ...g, permissionLevel }
            : g
        );

        await updateDoc(doc(db, 'users', userId), {
          groups: updatedUserGroups
        });
      }
    } catch (error) {
      console.error('Error updating member permission level:', error);
      throw error;
    }
  }

  /**
   * Get member permission level
   */
  static async getMemberPermissionLevel(
    groupId: string,
    userId: string
  ): Promise<PermissionLevel | null> {
    try {
      const group = await this.getGroup(groupId);

      if (!group) {
        return null;
      }

      // Admin always has 'admin' permission
      if (group.adminId === userId) {
        return 'admin';
      }

      const member = group.members.find(m => m.userId === userId);

      return member?.permissionLevel || null;
    } catch (error) {
      console.error('Error getting member permission level:', error);
      return null;
    }
  }

  // ============= Approval Management =============

  /**
   * Create pending approval for join request
   */
  static async createPendingApproval(
    groupId: string,
    userId: string,
    userName: string,
    userEmail?: string,
    userPhone?: string
  ): Promise<string> {
    try {
      const approval: Omit<PendingApproval, 'id'> = {
        groupId,
        userId,
        userName,
        userEmail,
        userPhone,
        requestedAt: new Date(),
        status: 'pending'
      };

      const docRef = await addDoc(
        collection(db, 'groups', groupId, 'pending_approvals'),
        {
          ...approval,
          requestedAt: Timestamp.fromDate(approval.requestedAt)
        }
      );

      // Get group info for notification
      const group = await this.getGroup(groupId);

      if (group) {
        // Send notification to admin
        await NotificationService.notifyAdminOfPendingApproval({
          adminId: group.adminId,
          groupId,
          groupName: group.name,
          requestingUserName: userName
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating pending approval:', error);
      throw error;
    }
  }

  /**
   * Get pending approvals for group
   */
  static async getPendingApprovals(groupId: string): Promise<PendingApproval[]> {
    try {
      const q = query(
        collection(db, 'groups', groupId, 'pending_approvals'),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          groupId: data.groupId,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userPhone: data.userPhone,
          requestedAt: toSafeDate(data.requestedAt),
          status: data.status,
          processedAt: data.processedAt ? toSafeDate(data.processedAt) : undefined,
          processedBy: data.processedBy,
          notes: data.notes
        };
      });
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  /**
   * Approve join request
   */
  static async approveJoinRequest(
    groupId: string,
    approvalId: string,
    approvedBy: string,
    userId: string
  ): Promise<void> {
    try {
      // Update approval status
      await updateDoc(
        doc(db, 'groups', groupId, 'pending_approvals', approvalId),
        {
          status: 'approved',
          processedAt: Timestamp.now(),
          processedBy: approvedBy
        }
      );

      // Add user to group with 'read' permission by default
      const group = await this.getGroup(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      const newMember: GroupMember = {
        userId,
        role: 'member',
        permissionLevel: 'read',
        permissions: ['view_all', 'view_insights'],
        addedAt: new Date(),
        addedBy: approvedBy,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy
      };

      const updatedMembers = [...group.members, newMember];
      const updatedMemberIds = [...group.memberIds, userId];

      // writeMemberIds stays the same (new member has read permission)
      const writeMemberIds = group.members
        .filter(m => m.permissionLevel === 'write')
        .map(m => m.userId);

      await updateDoc(doc(db, 'groups', groupId), {
        members: updatedMembers,
        memberIds: updatedMemberIds,
        writeMemberIds: writeMemberIds,
        updatedAt: Timestamp.now()
      });

      // Add group to user's groups array
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userGroups = userData.groups || [];

        await updateDoc(doc(db, 'users', userId), {
          groups: [
            ...userGroups,
            {
              groupId,
              role: 'member',
              permissionLevel: 'read',
              joinedAt: Timestamp.now()
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }

  /**
   * Reject join request
   */
  static async rejectJoinRequest(
    groupId: string,
    approvalId: string,
    rejectedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'groups', groupId, 'pending_approvals', approvalId),
        {
          status: 'rejected',
          processedAt: Timestamp.now(),
          processedBy: rejectedBy,
          notes: notes || ''
        }
      );
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }

  /**
   * Delete processed approval (cleanup)
   */
  static async deleteApproval(
    groupId: string,
    approvalId: string
  ): Promise<void> {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'pending_approvals', approvalId));
    } catch (error) {
      console.error('Error deleting approval:', error);
      throw error;
    }
  }

  // ============= Report Recipients Management (Elder-Level) =============
  // Family members who receive daily health reports via email (no accounts needed)
  // Recipients are stored directly on Elder documents in the 'elders' collection

  /**
   * Add a report recipient to an elder
   * For Family Plan A: max 1 recipient (single elder)
   * For Family Plan B: max 3 recipients (single elder)
   * For Multi Agency: max 2 recipients per elder
   */
  static async addReportRecipient(
    groupId: string,
    elderId: string,
    email: string,
    addedBy: string,
    name?: string
  ): Promise<ReportRecipient> {
    try {
      // Get the elder document directly from elders collection
      const elderDoc = await getDoc(doc(db, 'elders', elderId));

      if (!elderDoc.exists()) {
        throw new Error('Loved one not found');
      }

      const elderData = elderDoc.data();

      // Verify this elder belongs to the group
      if (elderData.groupId !== groupId) {
        throw new Error('Loved one does not belong to this group');
      }

      const existingRecipients = elderData.reportRecipients || [];

      // Check if email already exists for this elder
      const emailExists = existingRecipients.some(
        (r: any) => r.email.toLowerCase() === email.toLowerCase()
      );

      if (emailExists) {
        throw new Error('This email is already receiving reports for this loved one');
      }

      // Create new recipient (only include defined fields - Firestore rejects undefined)
      const newRecipient: ReportRecipient = {
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        addedBy,
        addedAt: new Date(),
        verified: false
      };

      // Add optional name only if defined
      if (name?.trim()) {
        newRecipient.name = name.trim();
      }

      // Convert to Firestore format
      const firestoreRecipient: Record<string, any> = {
        id: newRecipient.id,
        email: newRecipient.email,
        addedBy: newRecipient.addedBy,
        addedAt: Timestamp.fromDate(newRecipient.addedAt),
        verified: false
      };
      if (newRecipient.name) {
        firestoreRecipient.name = newRecipient.name;
      }

      // Update elder document with new recipient
      await updateDoc(doc(db, 'elders', elderId), {
        reportRecipients: [...existingRecipients, firestoreRecipient],
        updatedAt: Timestamp.now()
      });

      return newRecipient;
    } catch (error) {
      console.error('Error adding report recipient:', error);
      throw error;
    }
  }

  /**
   * Remove a report recipient from an elder
   */
  static async removeReportRecipient(
    groupId: string,
    elderId: string,
    recipientId: string
  ): Promise<void> {
    try {
      // Get the elder document directly from elders collection
      const elderDoc = await getDoc(doc(db, 'elders', elderId));

      if (!elderDoc.exists()) {
        throw new Error('Loved one not found');
      }

      const elderData = elderDoc.data();

      // Verify this elder belongs to the group
      if (elderData.groupId !== groupId) {
        throw new Error('Loved one does not belong to this group');
      }

      const existingRecipients = elderData.reportRecipients || [];
      const updatedRecipients = existingRecipients.filter((r: any) => r.id !== recipientId);

      // Update elder document
      await updateDoc(doc(db, 'elders', elderId), {
        reportRecipients: updatedRecipients,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error removing report recipient:', error);
      throw error;
    }
  }

  /**
   * Update a report recipient's details
   */
  static async updateReportRecipient(
    groupId: string,
    elderId: string,
    recipientId: string,
    updates: Partial<Pick<ReportRecipient, 'name' | 'email' | 'verified' | 'verifiedAt'>>
  ): Promise<void> {
    try {
      // Get the elder document directly from elders collection
      const elderDoc = await getDoc(doc(db, 'elders', elderId));

      if (!elderDoc.exists()) {
        throw new Error('Loved one not found');
      }

      const elderData = elderDoc.data();

      // Verify this elder belongs to the group
      if (elderData.groupId !== groupId) {
        throw new Error('Loved one does not belong to this group');
      }

      const existingRecipients = elderData.reportRecipients || [];
      const recipientIndex = existingRecipients.findIndex((r: any) => r.id === recipientId);

      if (recipientIndex === -1) {
        throw new Error('Recipient not found');
      }

      // Check if new email already exists (if email is being updated)
      if (updates.email) {
        const emailExists = existingRecipients.some(
          (r: any) => r.id !== recipientId && r.email.toLowerCase() === updates.email!.toLowerCase()
        );

        if (emailExists) {
          throw new Error('This email is already receiving reports for this loved one');
        }
      }

      const updatedRecipient = {
        ...existingRecipients[recipientIndex],
        ...updates,
        email: updates.email?.toLowerCase().trim() || existingRecipients[recipientIndex].email
      };

      // Handle verifiedAt conversion
      if (updates.verifiedAt && updates.verifiedAt instanceof Date) {
        updatedRecipient.verifiedAt = Timestamp.fromDate(updates.verifiedAt);
      }

      const updatedRecipients = [...existingRecipients];
      updatedRecipients[recipientIndex] = updatedRecipient;

      // Update elder document
      await updateDoc(doc(db, 'elders', elderId), {
        reportRecipients: updatedRecipients,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating report recipient:', error);
      throw error;
    }
  }

  /**
   * Get report recipients for a specific elder
   */
  static async getElderReportRecipients(
    groupId: string,
    elderId: string
  ): Promise<ReportRecipient[]> {
    try {
      // Get elder document directly from elders collection
      const elderDoc = await getDoc(doc(db, 'elders', elderId));

      if (!elderDoc.exists()) {
        return [];
      }

      const elderData = elderDoc.data();

      // Verify this elder belongs to the group
      if (elderData.groupId !== groupId) {
        return [];
      }

      return (elderData.reportRecipients || []).map((r: any) => ({
        ...r,
        addedAt: toSafeDate(r.addedAt),
        verifiedAt: r.verifiedAt ? toSafeDate(r.verifiedAt) : undefined
      }));
    } catch (error) {
      console.error('Error getting elder report recipients:', error);
      return [];
    }
  }

  /**
   * Get all report recipients across all elders in a group
   * Returns recipients with their associated elderId for reference
   */
  static async getAllReportRecipients(groupId: string): Promise<Array<ReportRecipient & { elderId: string; elderName: string }>> {
    try {
      // Query elders from the elders collection
      const q = query(
        collection(db, 'elders'),
        where('groupId', '==', groupId)
      );
      const eldersSnapshot = await getDocs(q);

      const allRecipients: Array<ReportRecipient & { elderId: string; elderName: string }> = [];

      eldersSnapshot.forEach((elderDoc) => {
        const elderData = elderDoc.data();
        const elderRecipients = (elderData.reportRecipients || []).map((r: any) => ({
          ...r,
          elderId: elderDoc.id,
          elderName: elderData.firstName || elderData.name || 'Unknown',
          addedAt: toSafeDate(r.addedAt),
          verifiedAt: r.verifiedAt ? toSafeDate(r.verifiedAt) : undefined
        }));
        allRecipients.push(...elderRecipients);
      });

      return allRecipients;
    } catch (error) {
      console.error('Error getting all report recipients:', error);
      return [];
    }
  }
}
