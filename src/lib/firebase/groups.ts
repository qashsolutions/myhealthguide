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
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Group, GroupMember, Permission } from '@/types';

export class GroupService {
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
        elders: data.elders || [],
        subscription: data.subscription,
        settings: data.settings,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
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
  ): Promise<'admin' | 'member' | null> {
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
          elders: data.elders || [],
          subscription: data.subscription,
          settings: data.settings,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting user groups:', error);
      throw error;
    }
  }
}
