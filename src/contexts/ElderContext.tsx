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
        // Use user.groups array which is already populated
        const userGroupIds = user.groups?.map(g => g.groupId) || [];
        console.log('[ElderContext] User group IDs from user.groups:', userGroupIds);

        if (userGroupIds.length > 0) {
          elders = await loadEldersFromGroups(userGroupIds);
          console.log('[ElderContext] Loaded elders:', elders.length);
        } else {
          console.log('[ElderContext] No groups found for user');
        }
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
      console.error('[ElderContext] Error loading elders:', error);
      console.error('[ElderContext] Error code:', error?.code);
      console.error('[ElderContext] Error message:', error?.message);
      setAvailableElders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load elders from agency (query top-level elders collection)
  // First fetch agency doc to get groupIds, then query elders per group
  async function loadAgencyElders(agencyId: string): Promise<Elder[]> {
    const elders: Elder[] = [];

    // Fetch agency document to get groupIds array
    // Super admin can read agency doc via hasAgencyAccess rule
    const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));

    if (!agencyDoc.exists()) {
      console.log('[ElderContext] Agency not found:', agencyId);
      return elders;
    }

    const agencyData = agencyDoc.data();
    const groupIds: string[] = agencyData.groupIds || [];
    console.log('[ElderContext] Agency group IDs from agency doc:', groupIds);

    if (groupIds.length === 0) {
      return elders;
    }

    // Query each group separately - Firestore rules require single groupId queries
    for (const groupId of groupIds) {
      try {
        const eldersQuery = query(
          collection(db, 'elders'),
          where('groupId', '==', groupId)
        );

        const eldersSnap = await getDocs(eldersQuery);
        eldersSnap.docs.forEach(doc => {
          const data = doc.data();
          // Only include non-archived elders in sidebar
          if (!data.archived) {
            elders.push({
              id: doc.id,
              ...data
            } as Elder);
          }
        });
      } catch (error) {
        console.error(`[ElderContext] Error loading elders for agency group ${groupId}:`, error);
      }
    }

    return elders;
  }

  // Load specific elders by IDs (query top-level elders collection)
  // Query each elder individually to work with Firestore security rules
  async function loadEldersByIds(elderIds: string[]): Promise<Elder[]> {
    const elders: Elder[] = [];

    if (elderIds.length === 0) {
      return elders;
    }

    // Query each elder by document ID individually
    for (const elderId of elderIds) {
      try {
        const elderDoc = await getDoc(doc(db, 'elders', elderId));
        if (elderDoc.exists()) {
          const data = elderDoc.data();
          // Only include non-archived elders in sidebar
          if (!data.archived) {
            elders.push({
              id: elderDoc.id,
              ...data
            } as Elder);
          }
        }
      } catch (error) {
        console.error(`[ElderContext] Error loading elder ${elderId}:`, error);
      }
    }

    return elders;
  }

  // Load elders from specific groups (query top-level elders collection)
  // Query each group separately to work with Firestore security rules
  async function loadEldersFromGroups(groupIds: string[]): Promise<Elder[]> {
    const elders: Elder[] = [];

    if (groupIds.length === 0) {
      return elders;
    }

    // Query each group separately - Firestore rules require single groupId queries
    // because rules check resource.data.groupId which needs exact match
    for (const groupId of groupIds) {
      try {
        const eldersQuery = query(
          collection(db, 'elders'),
          where('groupId', '==', groupId)
        );

        const eldersSnap = await getDocs(eldersQuery);
        eldersSnap.docs.forEach(doc => {
          const data = doc.data();
          // Only include non-archived elders in sidebar
          if (!data.archived) {
            elders.push({
              id: doc.id,
              ...data
            } as Elder);
          }
        });
      } catch (error) {
        console.error(`[ElderContext] Error loading elders for group ${groupId}:`, error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
