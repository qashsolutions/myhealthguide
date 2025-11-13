/**
 * Invite Codes Service
 * Phase 6: Groups & Collaboration
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import { GroupMember, Permission } from '@/types';

export interface InviteCode {
  id: string;
  code: string;
  groupId: string;
  groupName: string;
  createdBy: string;
  createdByName: string;
  role: 'admin' | 'member';
  permissions: Permission[];
  maxUses: number;
  currentUses: number;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface InviteAcceptance {
  inviteId: string;
  userId: string;
  acceptedAt: Date;
}

export class InviteService {
  /**
   * Generate a unique invite code
   */
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new invite code
   */
  static async createInvite(params: {
    groupId: string;
    groupName: string;
    createdBy: string;
    createdByName: string;
    role: 'admin' | 'member';
    permissions: Permission[];
    maxUses?: number;
    expiresInDays?: number;
  }): Promise<InviteCode> {
    try {
      const code = this.generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays || 7));

      const invite: Omit<InviteCode, 'id'> = {
        code,
        groupId: params.groupId,
        groupName: params.groupName,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        role: params.role,
        permissions: params.permissions,
        maxUses: params.maxUses || 5,
        currentUses: 0,
        expiresAt,
        isActive: true,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'invites'), {
        ...invite,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: Timestamp.now()
      });

      return {
        id: docRef.id,
        ...invite
      };
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    }
  }

  /**
   * Get invite by code
   */
  static async getInviteByCode(code: string): Promise<InviteCode | null> {
    try {
      const q = query(
        collection(db, 'invites'),
        where('code', '==', code.toUpperCase()),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        code: data.code,
        groupId: data.groupId,
        groupName: data.groupName,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        role: data.role,
        permissions: data.permissions,
        maxUses: data.maxUses,
        currentUses: data.currentUses,
        expiresAt: data.expiresAt.toDate(),
        isActive: data.isActive,
        createdAt: data.createdAt.toDate()
      };
    } catch (error) {
      console.error('Error getting invite by code:', error);
      throw error;
    }
  }

  /**
   * Validate invite code
   */
  static async validateInvite(code: string): Promise<{
    valid: boolean;
    reason?: string;
    invite?: InviteCode;
  }> {
    try {
      const invite = await this.getInviteByCode(code);

      if (!invite) {
        return { valid: false, reason: 'Invite code not found or inactive' };
      }

      if (!invite.isActive) {
        return { valid: false, reason: 'This invite has been deactivated' };
      }

      if (invite.currentUses >= invite.maxUses) {
        return { valid: false, reason: 'This invite has reached its maximum uses' };
      }

      if (new Date() > invite.expiresAt) {
        return { valid: false, reason: 'This invite has expired' };
      }

      return { valid: true, invite };
    } catch (error) {
      console.error('Error validating invite:', error);
      return { valid: false, reason: 'Error validating invite code' };
    }
  }

  /**
   * Accept an invite and add user to group
   */
  static async acceptInvite(params: {
    inviteCode: string;
    userId: string;
    userName: string;
  }): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      // Validate invite
      const validation = await this.validateInvite(params.inviteCode);

      if (!validation.valid || !validation.invite) {
        return { success: false, error: validation.reason };
      }

      const invite = validation.invite;

      // Check if user is already a member
      const groupDoc = await getDoc(doc(db, 'groups', invite.groupId));
      if (!groupDoc.exists()) {
        return { success: false, error: 'Group not found' };
      }

      const groupData = groupDoc.data();
      const existingMember = groupData.members?.find(
        (m: GroupMember) => m.userId === params.userId
      );

      if (existingMember) {
        return { success: false, error: 'You are already a member of this group' };
      }

      // Check member limit (4 members per group)
      if (groupData.members?.length >= 4) {
        return { success: false, error: 'This group has reached its maximum capacity (4 members)' };
      }

      // Add user to group
      const newMember: GroupMember = {
        userId: params.userId,
        role: invite.role,
        permissions: invite.permissions,
        addedAt: new Date(),
        addedBy: invite.createdBy
      };

      await updateDoc(doc(db, 'groups', invite.groupId), {
        members: [...(groupData.members || []), newMember],
        updatedAt: Timestamp.now()
      });

      // Update user's groups
      const userDoc = await getDoc(doc(db, 'users', params.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await updateDoc(doc(db, 'users', params.userId), {
          groups: [
            ...(userData.groups || []),
            {
              groupId: invite.groupId,
              role: invite.role,
              joinedAt: new Date()
            }
          ]
        });
      }

      // Increment invite usage
      await updateDoc(doc(db, 'invites', invite.id), {
        currentUses: invite.currentUses + 1
      });

      // Log acceptance
      await addDoc(collection(db, 'invite_acceptances'), {
        inviteId: invite.id,
        userId: params.userId,
        userName: params.userName,
        groupId: invite.groupId,
        acceptedAt: Timestamp.now()
      });

      return { success: true, groupId: invite.groupId };
    } catch (error) {
      console.error('Error accepting invite:', error);
      return { success: false, error: 'Failed to accept invite' };
    }
  }

  /**
   * Get all invites for a group
   */
  static async getGroupInvites(groupId: string): Promise<InviteCode[]> {
    try {
      const q = query(
        collection(db, 'invites'),
        where('groupId', '==', groupId)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          code: data.code,
          groupId: data.groupId,
          groupName: data.groupName,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          role: data.role,
          permissions: data.permissions,
          maxUses: data.maxUses,
          currentUses: data.currentUses,
          expiresAt: data.expiresAt.toDate(),
          isActive: data.isActive,
          createdAt: data.createdAt.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting group invites:', error);
      throw error;
    }
  }

  /**
   * Deactivate an invite
   */
  static async deactivateInvite(inviteId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'invites', inviteId), {
        isActive: false
      });
    } catch (error) {
      console.error('Error deactivating invite:', error);
      throw error;
    }
  }

  /**
   * Delete an invite
   */
  static async deleteInvite(inviteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
    } catch (error) {
      console.error('Error deleting invite:', error);
      throw error;
    }
  }

  /**
   * Get invite acceptance history
   */
  static async getInviteAcceptances(inviteId: string): Promise<InviteAcceptance[]> {
    try {
      const q = query(
        collection(db, 'invite_acceptances'),
        where('inviteId', '==', inviteId)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          inviteId: data.inviteId,
          userId: data.userId,
          acceptedAt: data.acceptedAt.toDate()
        };
      });
    } catch (error) {
      console.error('Error getting invite acceptances:', error);
      throw error;
    }
  }
}
