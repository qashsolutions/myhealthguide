'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronRight,
  User,
  UserCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { AgencyService } from '@/lib/firebase/agencies';
import { Elder } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface CaregiverSection {
  id: string;
  name: string;
  role: 'caregiver_admin' | 'caregiver';
  elders: Elder[];
  elderCount: number;
}

interface CaregiverEldersCardGridProps {
  agencyId: string;
  maxEldersPerCaregiver?: number;
  /** Render custom elder card content */
  renderElderCard: (elder: Elder, caregiverName: string) => React.ReactNode;
  /** Called when unassigned elder needs assignment */
  onAssignElder?: (elderId: string) => void;
  /** Show refresh button */
  showRefresh?: boolean;
}

/**
 * Reusable component to display elders grouped by caregiver in collapsible sections.
 * Uses caregiver_profiles collection for proper caregiver names.
 */
export function CaregiverEldersCardGrid({
  agencyId,
  maxEldersPerCaregiver = 3,
  renderElderCard,
  onAssignElder,
  showRefresh = false,
}: CaregiverEldersCardGridProps) {
  const [caregiverSections, setCaregiverSections] = useState<CaregiverSection[]>([]);
  const [unassignedElders, setUnassignedElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track expanded sections (multiple can be open)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Get assignments and elders grouped by caregiver
      const [assignments, { caregiverElders, unassignedElders: unassigned }] = await Promise.all([
        AgencyService.getAgencyAssignments(agencyId),
        AgencyService.getEldersByCaregiver(agencyId)
      ]);

      // Fetch caregiver profiles for proper names (same approach as CaregiverEldersOverview)
      const profilesQuery = query(
        collection(db, 'caregiver_profiles'),
        where('agencyId', '==', agencyId)
      );
      const profilesSnapshot = await getDocs(profilesQuery);

      // Build caregiver name map from profiles
      const caregiverNameMap = new Map<string, string>();
      const caregiverRoleMap = new Map<string, 'caregiver_admin' | 'caregiver'>();

      for (const profileDoc of profilesSnapshot.docs) {
        const profileData = profileDoc.data();
        const caregiverId = profileData.userId;

        // Only include active caregivers (not pending, suspended, or revoked)
        const status = profileData.status || 'active';
        if (status !== 'active') {
          continue;
        }

        caregiverNameMap.set(caregiverId, profileData.fullName || 'Unknown');

        // Get role from assignment if exists
        const assignment = assignments.find(a => a.caregiverId === caregiverId && a.active);
        caregiverRoleMap.set(caregiverId, (assignment?.role as 'caregiver_admin' | 'caregiver') || 'caregiver');
      }

      // Build sections from caregiverElders map
      const sections: CaregiverSection[] = [];

      for (const [caregiverId, elders] of caregiverElders.entries()) {
        if (elders.length === 0) continue;

        sections.push({
          id: caregiverId,
          name: caregiverNameMap.get(caregiverId) || 'Unknown',
          role: caregiverRoleMap.get(caregiverId) || 'caregiver',
          elders,
          elderCount: elders.length,
        });
      }

      // Sort by name
      sections.sort((a, b) => a.name.localeCompare(b.name));

      setCaregiverSections(sections);
      setUnassignedElders(unassigned);

      // Auto-expand all sections initially
      setExpandedIds(new Set(sections.map(s => s.id)));
    } catch (err: any) {
      console.error('[CaregiverEldersCardGrid] Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const toggleSection = (caregiverId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caregiverId)) {
        newSet.delete(caregiverId);
      } else {
        newSet.add(caregiverId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center justify-between">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // No caregivers or elders
  if (caregiverSections.length === 0 && unassignedElders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Optional refresh button */}
      {showRefresh && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Caregiver Sections */}
      {caregiverSections.map((section, index) => {
        const isExpanded = expandedIds.has(section.id);
        const caregiverNumber = index + 1;

        return (
          <div key={section.id} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
            {/* Caregiver Header - Clickable */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}

                {/* Numbered badge */}
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {caregiverNumber}
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <UserCircle2 className="w-6 h-6 text-white" />
                </div>

                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {section.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      section.role === 'caregiver_admin'
                        ? 'text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-600 text-xs'
                        : 'text-gray-600 border-gray-300 dark:text-gray-400 dark:border-gray-600 text-xs'
                    }
                  >
                    {section.role === 'caregiver_admin' ? 'Admin' : 'Caregiver'}
                  </Badge>
                </div>
              </div>

              <Badge variant="secondary" className="text-sm">
                {section.elderCount}/{maxEldersPerCaregiver} elders
              </Badge>
            </button>

            {/* Elder Cards - Collapsible */}
            {isExpanded && (
              <div className="border-t bg-gray-50 dark:bg-gray-800/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.elders.map((elder) => (
                    <div key={elder.id}>
                      {renderElderCard(elder, section.name)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned Elders Section */}
      {unassignedElders.length > 0 && (
        <div className="border rounded-lg overflow-hidden border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Unassigned Elders
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  {unassignedElders.length} elder{unassignedElders.length !== 1 ? 's' : ''} need caregiver assignment
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedElders.map((elder) => (
                <Card
                  key={elder.id}
                  className="p-4 border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {elder.name}
                      </h4>
                      {elder.approximateAge && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ~{elder.approximateAge} years old
                        </p>
                      )}
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        No caregiver assigned
                      </p>
                    </div>
                  </div>
                  {onAssignElder && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                      onClick={() => onAssignElder(elder.id)}
                    >
                      Assign Caregiver
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
