'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
        const groupIds = user.groups?.map(g => g.groupId) || [];
        elders = await loadEldersFromGroups(groupIds);
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

  // Load elders from agency
  async function loadAgencyElders(agencyId: string): Promise<Elder[]> {
    const elders: Elder[] = [];

    // Get all groups for this agency
    const groupsQuery = query(
      collection(db, 'groups'),
      where('agencyId', '==', agencyId)
    );

    const groupsSnap = await getDocs(groupsQuery);

    for (const groupDoc of groupsSnap.docs) {
      const groupData = groupDoc.data();
      const groupElders = groupData.elders || [];

      groupElders.forEach((elder: any) => {
        elders.push({
          ...elder,
          groupId: groupDoc.id
        } as Elder);
      });
    }

    return elders;
  }

  // Load specific elders by IDs
  async function loadEldersByIds(elderIds: string[]): Promise<Elder[]> {
    const elders: Elder[] = [];

    // Since elders are nested in groups, we need to find them
    // This is a limitation of the current schema - elders don't have their own collection
    // We'll need to query groups and filter elders

    const groupsSnap = await getDocs(collection(db, 'groups'));

    for (const groupDoc of groupsSnap.docs) {
      const groupData = groupDoc.data();
      const groupElders = groupData.elders || [];

      groupElders.forEach((elder: any) => {
        if (elderIds.includes(elder.id)) {
          elders.push({
            ...elder,
            groupId: groupDoc.id
          } as Elder);
        }
      });
    }

    return elders;
  }

  // Load elders from specific groups
  async function loadEldersFromGroups(groupIds: string[]): Promise<Elder[]> {
    const elders: Elder[] = [];

    for (const groupId of groupIds) {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));

        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const groupElders = groupData.elders || [];

          groupElders.forEach((elder: any) => {
            elders.push({
              ...elder,
              groupId: groupDoc.id
            } as Elder);
          });
        }
      } catch (error) {
        console.error(`Error loading group ${groupId}:`, error);
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
