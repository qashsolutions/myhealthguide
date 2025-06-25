'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pill, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MedicationAutocomplete } from './MedicationAutocomplete';
import { Medication } from '@/types';
import { VALIDATION_MESSAGES } from '@/lib/constants';

/**
 * Medication form with voice input support
 * Progressive form with optional fields
 */

// ADDED: Validation helpers for medication names
const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Common profanity patterns
  const profanityPatterns = [
    /\bf+u+c+k+/i,
    /\bs+h+i+t+/i,
    /\ba+s+s+h+o+l+e+/i,
    /\bb+i+t+c+h+/i,
    /\bd+a+m+n+/i,
    /\bh+e+l+l+/i,
    /\bs+e+x+/i,
    /\bp+o+r+n+/i,
  ];
  
  return profanityPatterns.some(pattern => pattern.test(lowerText));
};

// ADDED: Check if text looks like a medication name
const isValidMedicationName = (name: string): boolean => {
  const cleaned = name.trim().toLowerCase();
  
  // Check for profanity first
  if (containsProfanity(cleaned)) {
    return false;
  }
  
  // Check if it's too short or just numbers
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) {
    return false;
  }
  
  // Common invalid patterns
  const invalidPatterns = [
    /^test$/i,
    /^asdf/i,
    /^xxx/i,
    /^abc$/i,
    /^123/i,
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(cleaned));
};

const medicationSchema = z.object({
  name: z.string()
    .min(1, VALIDATION_MESSAGES.MEDICATION_NAME)
    .refine(isValidMedicationName, {
      message: 'Please enter a valid medication name',
    }),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescribedFor: z.string().optional(),
});

type MedicationFormData = z.infer<typeof medicationSchema>;

interface MedicationFormProps {
  onAddMedication: (medication: Medication) => void;
  // ADDED: Props to handle medication limit
  currentMedicationCount?: number;
  maxMedications?: number;
}

export function MedicationForm({ 
  onAddMedication,
  currentMedicationCount = 0,
  maxMedications = 3  // ADDED: Default limit of 3 medications
}: MedicationFormProps): JSX.Element {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  
  // ADDED: Check if we've reached the medication limit
  const isAtLimit = currentMedicationCount >= maxMedications;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: '',
      dosage: '',
      frequency: '',
      prescribedFor: '',
    },
  });

  // Handle form submission
  const onSubmit = (data: MedicationFormData) => {
    onAddMedication({
      name: data.name,
      dosage: data.dosage || undefined,
      frequency: data.frequency || undefined,
      prescribedFor: data.prescribedFor || undefined,
    });
    
    reset();
    setShowOptionalFields(false);
  };


  return (
    <div className="bg-white rounded-elder-lg border-2 border-elder-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-50 rounded-elder">
          <Pill className="h-8 w-8 text-primary-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-elder-lg font-semibold">Add a Medication</h2>
          <p className="text-elder-sm text-elder-text-secondary">
            {/* UPDATED: Show medication limit status */}
            {isAtLimit 
              ? `Maximum ${maxMedications} medications reached. Remove one to add another.`
              : `Start typing to see suggestions (${currentMedicationCount}/${maxMedications} added)`
            }
          </p>
        </div>
      </div>

      {/* UPDATED: Show limit message when at capacity */}
      {isAtLimit ? (
        <div className="bg-health-warning-bg border-2 border-health-warning rounded-elder-lg p-6 text-center">
          <p className="text-elder-lg font-semibold text-elder-text mb-2">
            Medication Limit Reached
          </p>
          <p className="text-elder-base text-elder-text-secondary">
            You can check up to {maxMedications} medications at once for accurate results.
            Please remove a medication to add another.
          </p>
          <p className="text-elder-sm text-elder-text-secondary mt-4">
            For complex medication regimens with more than {maxMedications} medications, 
            please consult your pharmacist or healthcare provider.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Medication name with autocomplete */}
          <MedicationAutocomplete
            value={watch('name') || ''}
            onChange={(value) => setValue('name', value, { shouldValidate: true })}
            error={errors.name?.message}
            required
          />

          {/* ADDED: Enhanced error message for invalid medication names */}
          {errors.name?.message === 'Please enter a valid medication name' && (
            <div className="bg-health-warning-bg border-2 border-health-warning rounded-elder p-4 mt-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-health-warning flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-elder-base font-semibold text-elder-text mb-2">
                    Please enter a valid medication name
                  </p>
                  <p className="text-elder-sm text-elder-text-secondary mb-3">
                    Examples of valid medications:
                  </p>
                  <ul className="text-elder-sm text-elder-text-secondary space-y-1">
                    <li className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary-600" />
                      <span>Aspirin, Ibuprofen, Acetaminophen</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary-600" />
                      <span>Lisinopril, Metformin, Atorvastatin</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary-600" />
                      <span>Vitamin D, Calcium, Fish Oil</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Optional fields */}
          {showOptionalFields ? (
            <>
              <Input
                {...register('dosage')}
                label="Dosage (Optional)"
                placeholder="e.g., 10mg"
                error={errors.dosage?.message}
                helpText="Include strength and units if known"
              />

              <Input
                {...register('frequency')}
                label="Frequency (Optional)"
                placeholder="e.g., Once daily"
                error={errors.frequency?.message}
                helpText="How often you take this medication"
              />

              <Input
                {...register('prescribedFor')}
                label="Prescribed For (Optional)"
                placeholder="e.g., High blood pressure"
                error={errors.prescribedFor?.message}
                helpText="Condition this medication treats"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowOptionalFields(true)}
              className="w-full text-left p-4 border-2 border-dashed border-elder-border rounded-elder hover:border-primary-500 transition-colors"
            >
              <p className="text-elder-base text-elder-text-secondary">
                + Add more details (optional)
              </p>
              <p className="text-elder-sm text-elder-text-secondary mt-1">
                Dosage, frequency, condition
              </p>
            </button>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            icon={<Plus className="h-6 w-6" />}
          >
            Add Medication
          </Button>
        </form>
      )}
    </div>
  );
}