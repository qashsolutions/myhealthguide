'use client';

import { useElder } from '@/contexts/ElderContext';
import { Users, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

export function ElderSelector() {
  const { selectedElder, availableElders, setSelectedElder, isLoading } = useElder();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading elders...</span>
      </div>
    );
  }

  if (availableElders.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">No elders assigned</span>
      </div>
    );
  }

  // If only one elder, show it without dropdown
  if (availableElders.length === 1) {
    const elder = availableElders[0];
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {elder.name}
          </span>
          {elder.dateOfBirth && (
            <span className="text-xs text-blue-700 dark:text-blue-300">
              DOB: {new Date(elder.dateOfBirth).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Multiple elders - show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          isOpen
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
        )}
      >
        <Users className={cn(
          'h-4 w-4',
          isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
        )} />
        <div className="flex flex-col items-start min-w-[140px]">
          {selectedElder ? (
            <>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedElder.name}
              </span>
              {selectedElder.dateOfBirth && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  DOB: {new Date(selectedElder.dateOfBirth).toLocaleDateString()}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Select elder
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform',
          isOpen && 'transform rotate-180'
        )} />
        {availableElders.length > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">
            {availableElders.length}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
          {availableElders.map((elder) => (
            <button
              key={elder.id}
              onClick={() => {
                setSelectedElder(elder);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0',
                selectedElder?.id === elder.id && 'bg-blue-50 dark:bg-blue-900/20'
              )}
            >
              <div className="flex items-start gap-3">
                <Users className={cn(
                  'h-5 w-5 mt-0.5',
                  selectedElder?.id === elder.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                )} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium',
                      selectedElder?.id === elder.id
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100'
                    )}>
                      {elder.name}
                    </span>
                    {selectedElder?.id === elder.id && (
                      <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {elder.dateOfBirth && (
                      <span>DOB: {new Date(elder.dateOfBirth).toLocaleDateString()}</span>
                    )}
                  </div>
                  {elder.notes && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Notes: {elder.notes.length > 50 ? elder.notes.substring(0, 50) + '...' : elder.notes}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
