'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useElder } from '@/contexts/ElderContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, Plus, Settings, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Check if user can add elders (must be super_admin or admin with active status)
function canUserAddElders(user: any): boolean {
  // If user has no agencies, they cannot add elders
  if (!user?.agencies || user.agencies.length === 0) return false;

  // User can add elders only if they have:
  // 1. super_admin or admin role in any agency
  // 2. AND that agency membership is active (not pending_approval or rejected)
  return user.agencies.some((agency: any) =>
    (agency.role === 'super_admin' || agency.role === 'admin') &&
    agency.status === 'active'
  );
}

// Generate a consistent gradient based on the elder's name
function getAvatarGradient(name: string): string {
  const gradients = [
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-pink-500',
    'from-indigo-500 to-blue-500',
    'from-purple-500 to-pink-500',
    'from-teal-500 to-cyan-500',
  ];

  // Use name to consistently pick a gradient
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface ElderDropdownProps {
  className?: string;
}

export function ElderDropdown({ className }: ElderDropdownProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedElder, availableElders, setSelectedElder, isLoading } = useElder();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only super_admin or admin can add elders
  const canAddElders = canUserAddElders(user);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  // No elders state
  if (availableElders.length === 0) {
    // Caregivers see a different message - they need to wait for assignment
    if (!canAddElders) {
      return (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
          className
        )}>
          <span className="text-sm text-gray-500 dark:text-gray-400">No elders assigned</span>
        </div>
      );
    }

    return (
      <button
        onClick={() => router.push('/dashboard/elders/new')}
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors",
          className
        )}
      >
        <Plus className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Add Elder</span>
      </button>
    );
  }

  const displayElder = selectedElder || availableElders[0];

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all",
          "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          "hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
          isOpen && "border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br",
          getAvatarGradient(displayElder.name)
        )}>
          {getInitials(displayElder.name)}
        </div>

        {/* Name */}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {displayElder.name}
        </span>

        {/* Chevron */}
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-500 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Section Label */}
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Your Elders
            </span>
          </div>

          {/* Elder List */}
          <div className="max-h-64 overflow-y-auto">
            {availableElders.map((elder) => {
              const isSelected = selectedElder?.id === elder.id;

              return (
                <button
                  key={elder.id}
                  onClick={() => {
                    setSelectedElder(elder);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    isSelected && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br flex-shrink-0",
                    getAvatarGradient(elder.name)
                  )}>
                    {getInitials(elder.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        isSelected
                          ? "text-blue-900 dark:text-blue-100"
                          : "text-gray-900 dark:text-gray-100"
                      )}>
                        {elder.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {elder.approximateAge
                        ? `${elder.approximateAge} yrs`
                        : elder.dateOfBirth
                          ? (() => {
                              // Handle Firestore Timestamp conversion
                              let dob: Date;
                              if (typeof elder.dateOfBirth === 'object' && 'seconds' in (elder.dateOfBirth as any)) {
                                dob = new Date((elder.dateOfBirth as any).seconds * 1000);
                              } else if (elder.dateOfBirth instanceof Date) {
                                dob = elder.dateOfBirth;
                              } else {
                                dob = new Date(elder.dateOfBirth as any);
                              }
                              const age = new Date().getFullYear() - dob.getFullYear();
                              return isNaN(age) ? 'Age not set' : `${age} yrs`;
                            })()
                          : 'Age not set'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions - only show for admins/super admins who can manage elders */}
          {canAddElders && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/elders/new');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Add New Elder</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/elders');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Manage All Elders</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
