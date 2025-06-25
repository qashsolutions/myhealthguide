'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';

interface MedicationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

// Common medications list for autocomplete
const MEDICATION_SUGGESTIONS = [
  'Aspirin',
  'Atorvastatin (Lipitor)',
  'Amlodipine',
  'Amoxicillin',
  'Azithromycin',
  'Albuterol',
  'Acetaminophen (Tylenol)',
  'Clopidogrel (Plavix)',
  'Ciprofloxacin',
  'Citalopram (Celexa)',
  'Carvedilol',
  'Duloxetine (Cymbalta)',
  'Diazepam (Valium)',
  'Digoxin',
  'Furosemide (Lasix)',
  'Fluoxetine (Prozac)',
  'Gabapentin',
  'Hydrocodone',
  'Hydrochlorothiazide',
  'Ibuprofen',
  'Insulin',
  'Lisinopril',
  'Levothyroxine',
  'Losartan',
  'Lorazepam (Ativan)',
  'Metformin',
  'Metoprolol',
  'Meloxicam',
  'Naproxen',
  'Omeprazole (Prilosec)',
  'Oxycodone',
  'Pantoprazole (Protonix)',
  'Prednisone',
  'Pravastatin',
  'Propranolol',
  'Rosuvastatin (Crestor)',
  'Sertraline (Zoloft)',
  'Simvastatin (Zocor)',
  'Tramadol',
  'Trazodone',
  'Warfarin (Coumadin)',
  'Zolpidem (Ambien)',
];

export function MedicationAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  placeholder = 'e.g., Lisinopril',
  required = false,
}: MedicationAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (value.length > 0) {
      const filtered = MEDICATION_SUGGESTIONS.filter(med =>
        med.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5); // Show max 5 suggestions
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    onSelect?.(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        error={error}
        required={required}
        label="Medication Name"
        autoComplete="off"
        maxLength={50}
      />
      
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border-2 border-elder-border rounded-elder shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 text-elder-base hover:bg-primary-50 
                       focus:bg-primary-50 focus:outline-none transition-colors
                       ${index === selectedIndex ? 'bg-primary-50' : ''}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}