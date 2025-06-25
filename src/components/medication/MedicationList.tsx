'use client';

import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Pill } from 'lucide-react';
import { Medication } from '@/types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { clsx } from 'clsx';

/**
 * Medication list component with edit/delete functionality
 * Displays user's medications in an accessible list format
 */

interface MedicationListProps {
  medications: Medication[];
  onRemove: (id: string) => void;
  onEdit: (id: string, updated: Medication) => void;
  // ADDED: Show medication limit
  maxMedications?: number;
}

export function MedicationList({
  medications,
  onRemove,
  onEdit,
  maxMedications = 3,  // ADDED: Default limit
}: MedicationListProps): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Medication | null>(null);

  // Start editing
  const startEdit = (medication: Medication) => {
    setEditingId(medication.id!);
    setEditForm({ ...medication });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  // Save edit
  const saveEdit = () => {
    if (!editForm || !editingId) return;
    onEdit(editingId, editForm);
    setEditingId(null);
    setEditForm(null);
  };

  // Handle form changes
  const handleEditChange = (field: keyof Medication, value: string) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value || undefined });
  };

  return (
    <div className="space-y-4">
      {/* UPDATED: Show medication count with limit */}
      <div className="flex items-center justify-between">
        <h2 className="text-elder-lg font-semibold text-elder-text flex items-center gap-3">
          <Pill className="h-6 w-6 text-primary-600" />
          Your Medications ({medications.length}/{maxMedications})
        </h2>
        {/* ADDED: Visual indicator for limit */}
        {medications.length === maxMedications && (
          <span className="text-elder-sm text-health-warning bg-health-warning-bg px-3 py-1 rounded-elder">
            Limit Reached
          </span>
        )}
      </div>

      {medications.length === 0 ? (
        <p className="text-elder-base text-elder-text-secondary py-8 text-center">
          No medications added yet
        </p>
      ) : (
        <ul className="space-y-3" role="list">
          {medications.map((medication) => (
            <li
              key={medication.id}
              className="bg-white border-2 border-elder-border rounded-elder-lg p-4 transition-all hover:border-elder-border-dark"
            >
              {editingId === medication.id ? (
                // Edit mode
                <div className="space-y-3">
                  <Input
                    value={editForm?.name || ''}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    placeholder="Medication name"
                    aria-label="Edit medication name"
                    maxLength={50}
                  />
                  
                  <div className="grid elder-tablet:grid-cols-3 gap-3">
                    <Input
                      value={editForm?.dosage || ''}
                      onChange={(e) => handleEditChange('dosage', e.target.value)}
                      placeholder="Dosage"
                      aria-label="Edit dosage"
                    />
                    <Input
                      value={editForm?.frequency || ''}
                      onChange={(e) => handleEditChange('frequency', e.target.value)}
                      placeholder="Frequency"
                      aria-label="Edit frequency"
                    />
                    <Input
                      value={editForm?.prescribedFor || ''}
                      onChange={(e) => handleEditChange('prescribedFor', e.target.value)}
                      placeholder="Prescribed for"
                      aria-label="Edit condition"
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={cancelEdit}
                      icon={<X className="h-4 w-4" />}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={saveEdit}
                      icon={<Check className="h-4 w-4" />}
                      disabled={!editForm?.name}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-elder-base font-semibold text-elder-text truncate" title={medication.name}>
                      {medication.name}
                    </h3>
                    
                    <div className="mt-2 flex flex-wrap gap-4 text-elder-sm text-elder-text-secondary">
                      {medication.dosage && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold">Dosage:</span> {medication.dosage}
                        </span>
                      )}
                      {medication.frequency && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold">Frequency:</span> {medication.frequency}
                        </span>
                      )}
                      {medication.prescribedFor && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold">For:</span> {medication.prescribedFor}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(medication)}
                      className={clsx(
                        'p-2 rounded-elder text-primary-600 hover:bg-primary-50',
                        'transition-colors focus:outline-none focus-visible:ring-2',
                        'focus-visible:ring-primary-500'
                      )}
                      aria-label={`Edit ${medication.name}`}
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => onRemove(medication.id!)}
                      className={clsx(
                        'p-2 rounded-elder text-health-danger hover:bg-health-danger-bg',
                        'transition-colors focus:outline-none focus-visible:ring-2',
                        'focus-visible:ring-health-danger'
                      )}
                      aria-label={`Remove ${medication.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}