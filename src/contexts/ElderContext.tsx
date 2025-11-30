'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import type { Elder, AgencyRole } from '@/types';

interface ElderContextType {
  selectedElder: Elder | null;
  availableElders: Elder[];
  setSelectedElder: (elder: Elder | null) => void;
  isLoading: boolean;
  refreshElders: () => Promise<void>;
}

const ElderContext = createContext<ElderContextType | undefined>(undefined);

const SELECTED_ELDER_KEY = 'selected_elder_id';

// Helper function to get groups where user is admin
async function getGroupsWhereUserIsAdmin(userId: string): Promise<string[]> {
  try {
    const adminGroupsQuery = query(
      collection(db, 'groups'),
      where('adminId', '==', userId)
    );
    const snapshot = await getDocs(adminGroupsQuery);
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error getting admin groups:', error);
    return [];
  }
}

export function ElderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedElder, setSelectedElderState] = useState<Elder | null>(null);
  const [availableElders, setAvailableElders] = useState<Elder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available elders based on user role
  const loadAvailableElders = async () => {
    if (!user) {
      setAvailableElders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let elders: Elder[] = [];

      // Check if user is part of an agency
      const agencyMembership = user.agencies?.[0];

      if (agencyMembership) {
        const role = agencyMembership.role;

        if (role === 'super_admin') {
          // Agency super admin: Load all elders in the agency
          elders = await loadAgencyElders(agencyMembership.agencyId);
        } else if (role === 'caregiver_admin' || role === 'caregiver') {
          // Caregiver: Load only assigned elders (max 3)
          const assignedElderIds = agencyMembership.assignedElderIds || [];
          elders = await loadEldersByIds(assignedElderIds);
        } else if (role === 'family_member') {
          // Family member through agency: Load from assigned groups
          const assignedGroupIds = agencyMembership.assignedGroupIds || [];
          elders = await loadEldersFromGroups(assignedGroupIds);
        }
      } else {
        // Regular family member: Load from their groups
        // First, get group IDs from user.groups array
        const userGroupIds = user.groups?.map(g => g.groupId) || [];

        // Also query groups where user is adminId (in case user.groups wasn't populated)
        const adminGroupIds = await getGroupsWhereUserIsAdmin(user.id);

        // Combine and deduplicate
        const allGroupIds = [...new Set([...userGroupIds, ...adminGroupIds])];

        elders = await loadEldersFromGroups(allGroupIds);
      }

      setAvailableElders(elders);

      // Auto-select elder if only one available or restore from localStorage
      if (elders.length > 0) {
        const savedElderId = localStorage.getItem(SELECTED_ELDER_KEY);
        const savedElder = elders.find(e => e.id === savedElderId);

        if (savedElder) {
          setSelectedElderState(savedElder);
        } else {
          // Auto-select first elder
          setSelectedElderState(elders[0]);
        }
      } else {
        setSelectedElderState(null);
      }
    } catch (error: any) {
      // Handle specific Firestore permission errors gracefully
      // This can happen for new users who don't have any elders assigned yet
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        // This is expected for new users - not an error
        console.log('No elders found for user (this is normal for new accounts)');
      } else {
        console.error('Error loading elders:', error);
      }
      setAvailableElders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load elders from agency (query top-level elders collection)
  async function loadAgencyElders(agencyId: string): Promise<Elder[]> {
    const elders: Elder[] = [];

    // First get all group IDs for this agency
    const groupsQuery = query(
      collection(db, 'groups'),
      where('agencyId', '==', agencyId)
    );

    const groupsSnap = await getDocs(groupsQuery);
    const groupIds = groupsSnap.docs.map(doc => doc.id);

    if (groupIds.length === 0) {
      return elders;
    }

    // Query elders collection where groupId is in the agency's groups
    // Firestore 'in' query supports max 30 values, chunk if needed
    const chunks = [];
    for (let i = 0; i < groupIds.length; i += 30) {
      chunks.push(groupIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const eldersQuery = query(
        collection(db, 'elders'),
        where('groupId', 'in', chunk)
      );

      const eldersSnap = await getDocs(eldersQuery);
      eldersSnap.docs.forEach(doc => {
        elders.push({
          id: doc.id,
          ...doc.data()
        } as Elder);
      });
    }

    return elders;
  }

  // Load specific elders by IDs (query top-level elders collection)
  async function loadEldersByIds(elderIds: string[]): Promise<Elder[]> {
    const elders: Elder[] = [];

    if (elderIds.length === 0) {
      return elders;
    }

    // Query elders collection by document IDs
    // Firestore 'in' query supports max 30 values, chunk if needed
    const chunks = [];
    for (let i = 0; i < elderIds.length; i += 30) {
      chunks.push(elderIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const eldersQuery = query(
        collection(db, 'elders'),
        where(documentId(), 'in', chunk)
      );

      const eldersSnap = await getDocs(eldersQuery);
      eldersSnap.docs.forEach(doc => {
        elders.push({
          id: doc.id,
          ...doc.data()
        } as Elder);
      });
    }

    return elders;
  }

  // Load elders from specific groups (query top-level elders collection)
  async function loadEldersFromGroups(groupIds: string[]): Promise<Elder[]> {
    const elders: Elder[] = [];

    if (groupIds.length === 0) {
      return elders;
    }

    // Query elders collection where groupId is in the user's groups
    // Firestore 'in' query supports max 30 values, chunk if needed
    const chunks = [];
    for (let i = 0; i < groupIds.length; i += 30) {
      chunks.push(groupIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      try {
        const eldersQuery = query(
          collection(db, 'elders'),
          where('groupId', 'in', chunk)
        );

        const eldersSnap = await getDocs(eldersQuery);
        eldersSnap.docs.forEach(doc => {
          elders.push({
            id: doc.id,
            ...doc.data()
          } as Elder);
        });
      } catch (error) {
        console.error('Error loading elders for groups:', error);
      }
    }

    return elders;
  }

  // Set selected elder and persist to localStorage
  const setSelectedElder = (elder: Elder | null) => {
    setSelectedElderState(elder);
    if (elder) {
      localStorage.setItem(SELECTED_ELDER_KEY, elder.id);
    } else {
      localStorage.removeItem(SELECTED_ELDER_KEY);
    }
  };

  // Refresh elders (useful after adding/editing)
  const refreshElders = async () => {
    await loadAvailableElders();
  };

  // Load elders when user changes
  useEffect(() => {
    loadAvailableElders();
  }, [user?.id]);

  const value = {
    selectedElder,
    availableElders,
    setSelectedElder,
    isLoading,
    refreshElders
  };

  return <ElderContext.Provider value={value}>{children}</ElderContext.Provider>;
}

export function useElder() {
  const context = useContext(ElderContext);
  if (context === undefined) {
    throw new Error('useElder must be used within an ElderProvider');
  }
  return context;
}
