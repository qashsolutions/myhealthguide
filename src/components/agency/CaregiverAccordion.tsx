'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  User,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Elder, ElderEmergencyContact } from '@/types';
import { format } from 'date-fns';

interface ElderWithContacts extends Elder {
  emergencyContacts?: ElderEmergencyContact[];
}

interface CaregiverWithElders {
  id: string;
  name: string;
  role: 'caregiver_admin' | 'caregiver';
  elders: ElderWithContacts[];
  elderCount: number;
}

interface CaregiverAccordionProps {
  caregivers: CaregiverWithElders[];
  maxEldersPerCaregiver: number;
  onAssignElder: (elderId: string, elderName: string) => void;
  isSuperAdmin: boolean;
}

// Extract last name from full name for sorting
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : fullName.toLowerCase();
}

// Sort caregivers by last name A-Z
function sortByLastName(caregivers: CaregiverWithElders[]): CaregiverWithElders[] {
  return [...caregivers].sort((a, b) => {
    const lastNameA = getLastName(a.name);
    const lastNameB = getLastName(b.name);
    return lastNameA.localeCompare(lastNameB);
  });
}

// Format date for display
function formatDate(date: Date | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Date ? date : new Date(date);
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'N/A';
  }
}

// Get primary emergency contact
function getPrimaryContact(contacts?: ElderEmergencyContact[]): ElderEmergencyContact | null {
  if (!contacts || contacts.length === 0) return null;
  return contacts.find(c => c.isPrimary) || contacts[0];
}

export function CaregiverAccordion({
  caregivers,
  maxEldersPerCaregiver,
  onAssignElder,
  isSuperAdmin,
}: CaregiverAccordionProps) {
  // Sort caregivers by last name
  const sortedCaregivers = sortByLastName(caregivers);

  // Track which caregiver is expanded (only one at a time)
  const [expandedId, setExpandedId] = useState<string | null>(
    sortedCaregivers.length > 0 ? sortedCaregivers[0].id : null
  );

  const toggleExpanded = (caregiverId: string) => {
    setExpandedId(current => (current === caregiverId ? null : caregiverId));
  };

  if (sortedCaregivers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No caregivers assigned yet</p>
        <p className="text-sm mt-1">Invite caregivers to your agency to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedCaregivers.map((caregiver) => {
        const isExpanded = expandedId === caregiver.id;
        const canAddMore = caregiver.elderCount < maxEldersPerCaregiver;

        return (
          <div
            key={caregiver.id}
            className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900"
          >
            {/* Caregiver Header - Clickable */}
            <button
              onClick={() => toggleExpanded(caregiver.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {caregiver.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      caregiver.role === 'caregiver_admin'
                        ? 'text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-600'
                        : 'text-gray-600 border-gray-300 dark:text-gray-400 dark:border-gray-600'
                    }
                  >
                    {caregiver.role === 'caregiver_admin' ? 'Admin' : 'Caregiver'}
                  </Badge>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm">
                {caregiver.elderCount}/{maxEldersPerCaregiver} loved ones
              </Badge>
            </button>

            {/* Elder Table - Collapsible */}
            {isExpanded && (
              <div className="border-t bg-gray-50 dark:bg-gray-800/50 p-4">
                {caregiver.elders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-2 font-medium">Loved One</th>
                          <th className="pb-2 font-medium">Date Assigned</th>
                          <th className="pb-2 font-medium">Phone</th>
                          <th className="pb-2 font-medium">Email</th>
                          <th className="pb-2 font-medium">Address</th>
                          <th className="pb-2 font-medium">Emergency Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caregiver.elders.map((elder) => {
                          const primaryContact = getPrimaryContact(elder.emergencyContacts);

                          return (
                            <tr
                              key={elder.id}
                              className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                      {elder.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {elder.preferredName || elder.name}
                                    </p>
                                    {elder.primaryCaregiverId === caregiver.id && (
                                      <Badge variant="default" className="bg-amber-500 text-xs mt-0.5">
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(elder.primaryCaregiverAssignedAt)}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                {primaryContact?.phone ? (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {primaryContact.phone}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                {primaryContact?.email ? (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{primaryContact.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                {primaryContact?.address ? (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{primaryContact.address}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="py-3 text-gray-600 dark:text-gray-400">
                                {primaryContact ? (
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {primaryContact.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {primaryContact.relationship}
                                      {primaryContact.phone && ` • ${primaryContact.phone}`}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No loved ones assigned to this caregiver</p>
                  </div>
                )}

                {/* Assign Elder Button */}
                {isSuperAdmin && canAddMore && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssignElder('', '')}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign Loved One ({maxEldersPerCaregiver - caregiver.elderCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
