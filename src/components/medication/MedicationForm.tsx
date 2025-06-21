'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pill } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VoiceInput } from './VoiceInput';
import { Medication } from '@/types';
import { VALIDATION_MESSAGES } from '@/lib/constants';

/**
 * Medication form with voice input support
 * Progressive form with optional fields
 */

const medicationSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.MEDICATION_NAME),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescribedFor: z.string().optional(),
});

type MedicationFormData = z.infer<typeof medicationSchema>;

interface MedicationFormProps {
  onAddMedication: (medication: Medication) => void;
}

export function MedicationForm({ onAddMedication }: MedicationFormProps): JSX.Element {
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
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

  // Handle voice input result
  const handleVoiceResult = (text: string) => {
    setValue('name', text, { shouldValidate: true });
  };

  return (
    <div className="bg-white rounded-elder-lg border-2 border-elder-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-50 rounded-elder">
          <Pill className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h2 className="text-elder-lg font-semibold">Add a Medication</h2>
          <p className="text-elder-sm text-elder-text-secondary">
            Enter medication name or use voice input
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Medication name with voice input */}
        <div className="relative">
          <Input
            {...register('name')}
            label="Medication Name"
            placeholder="e.g., Lisinopril"
            error={errors.name?.message}
            required
          />
          
          {/* Voice input button */}
          <div className="absolute right-2 top-[42px]">
            <VoiceInput
              onResult={handleVoiceResult}
              placeholder="Say medication name"
            />
          </div>
        </div>

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
    </div>
  );
}