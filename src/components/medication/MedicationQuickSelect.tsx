'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface MedicationQuickSelectProps {
  onSelect: (medication: string) => void;
}

// Common medications for elderly patients
const COMMON_MEDICATIONS = [
  'Aspirin',
  'Lisinopril',
  'Metformin',
  'Atorvastatin',
  'Amlodipine',
  'Omeprazole',
  'Levothyroxine',
  'Metoprolol',
];

/**
 * Quick selection buttons for common medications
 * More reliable than voice input on desktop
 */
export function MedicationQuickSelect({ onSelect }: MedicationQuickSelectProps) {
  return (
    <div className="mt-4">
      <p className="text-elder-sm text-elder-text-secondary mb-2">
        Common medications (click to add):
      </p>
      <div className="flex flex-wrap gap-2">
        {COMMON_MEDICATIONS.map((med) => (
          <button
            key={med}
            type="button"
            onClick={() => onSelect(med)}
            className="px-3 py-1.5 text-elder-sm bg-elder-background hover:bg-primary-50 
                     text-elder-text hover:text-primary-700 rounded-elder 
                     border border-elder-border hover:border-primary-300
                     transition-colors focus:outline-none focus-visible:ring-2 
                     focus-visible:ring-primary-500"
          >
            {med}
          </button>
        ))}
      </div>
    </div>
  );
}