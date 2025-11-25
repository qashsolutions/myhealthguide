'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useElder } from '@/contexts/ElderContext';
import { Plus, Pill, Utensils, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuickActions() {
  const { selectedElder } = useElder();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if no elder is selected
  if (!selectedElder) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-20 sm:bottom-6 sm:right-24 z-50">
      {/* Quick Action Buttons - Show when open */}
      {isOpen && (
        <div className="mb-4 space-y-3 flex flex-col items-end">
          {/* Log Medication Button */}
          <Link
            href="/dashboard/medications/new"
            onClick={() => setIsOpen(false)}
            className="group flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
          >
            <span className="text-sm font-medium whitespace-nowrap">Log Medication</span>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-colors">
              <Pill className="w-5 h-5 text-white" />
            </div>
          </Link>

          {/* Log Meal Button */}
          <Link
            href="/dashboard/diet/new"
            onClick={() => setIsOpen(false)}
            className="group flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
          >
            <span className="text-sm font-medium whitespace-nowrap">Log Meal</span>
            <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center group-hover:bg-orange-700 transition-colors">
              <Utensils className="w-5 h-5 text-white" />
            </div>
          </Link>
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all',
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-blue-600 hover:bg-blue-700'
        )}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Label hint when closed */}
      {!isOpen && (
        <div className="absolute bottom-16 right-0 bg-gray-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Quick Actions
        </div>
      )}
    </div>
  );
}
