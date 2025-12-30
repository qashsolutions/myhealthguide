'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, PenLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { submitCorrectionFeedback } from '@/lib/feedback/feedbackService';
import type { CorrectionType, CorrectionDialogProps } from '@/types/feedback';

const CORRECTION_TYPES: { value: CorrectionType; label: string; description: string }[] = [
  {
    value: 'wrong_value',
    label: 'Wrong Value',
    description: 'The displayed value is incorrect',
  },
  {
    value: 'false_positive',
    label: 'False Positive',
    description: 'This alert/warning should not have been triggered',
  },
  {
    value: 'false_negative',
    label: 'Missed Something',
    description: 'Something important was not detected',
  },
  {
    value: 'failed_prediction',
    label: 'Failed Prediction',
    description: 'The prediction did not come true',
  },
  {
    value: 'timing_wrong',
    label: 'Wrong Timing',
    description: 'The prediction was correct but timing was off',
  },
  {
    value: 'other',
    label: 'Other Issue',
    description: 'Something else needs correction',
  },
];

export function CorrectionDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  elderId,
  originalValue,
  valueLabel = 'Value',
  onCorrectionSubmitted,
}: CorrectionDialogProps) {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get groupId from selectedElder
  const groupId = selectedElder?.groupId;

  const [correctionType, setCorrectionType] = useState<CorrectionType>('wrong_value');
  const [correctedValue, setCorrectedValue] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user?.id || !groupId) {
      setError('You must be logged in to submit corrections');
      return;
    }

    if (!correctedValue.trim() && correctionType === 'wrong_value') {
      setError('Please provide the correct value');
      return;
    }

    if (!explanation.trim()) {
      setError('Please explain the correction');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitCorrectionFeedback({
        targetType,
        targetId,
        userId: user.id,
        groupId,
        elderId: elderId || selectedElder?.id,
        correctionType,
        originalValue,
        correctedValue: correctedValue.trim(),
        explanation: explanation.trim(),
      });

      if (result.success) {
        if (onCorrectionSubmitted && result.id) {
          onCorrectionSubmitted({
            id: result.id,
            feedbackType: 'correction',
            targetType,
            targetId,
            userId: user.id,
            groupId: groupId!,
            elderId: elderId || selectedElder?.id,
            correctionType,
            originalValue,
            correctedValue: correctedValue.trim(),
            explanation: explanation.trim(),
            createdAt: new Date(),
          });
        }

        // Reset and close
        setCorrectionType('wrong_value');
        setCorrectedValue('');
        setExplanation('');
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to submit correction');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = CORRECTION_TYPES.find((t) => t.value === correctionType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-amber-500" />
            Submit Correction
          </DialogTitle>
          <DialogDescription>
            Help us improve by providing accurate information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Value Display */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Original {valueLabel}</p>
            <p className="text-sm font-medium">{originalValue}</p>
          </div>

          {/* Correction Type */}
          <div className="space-y-2">
            <Label htmlFor="correction-type">What&apos;s wrong?</Label>
            <Select
              value={correctionType}
              onValueChange={(value) => setCorrectionType(value as CorrectionType)}
            >
              <SelectTrigger id="correction-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CORRECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Corrected Value (for wrong_value type) */}
          {correctionType === 'wrong_value' && (
            <div className="space-y-2">
              <Label htmlFor="corrected-value">Correct {valueLabel}</Label>
              <Input
                id="corrected-value"
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                placeholder={`Enter the correct ${valueLabel.toLowerCase()}`}
              />
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">
              {correctionType === 'wrong_value'
                ? 'Why is the original value wrong?'
                : correctionType === 'false_positive'
                ? 'Why was this a false alarm?'
                : correctionType === 'failed_prediction'
                ? 'What actually happened?'
                : 'Please explain'}
            </Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide details to help us improve..."
              className="h-24 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {explanation.length}/1000
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline correction trigger button
 */
export function CorrectionTrigger({
  targetType,
  targetId,
  elderId,
  originalValue,
  valueLabel,
  onCorrectionSubmitted,
  className,
}: Omit<CorrectionDialogProps, 'open' | 'onOpenChange'> & { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20 ${className}`}
        onClick={() => setOpen(true)}
      >
        <PenLine className="h-3 w-3" />
        Report Issue
      </Button>

      <CorrectionDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        elderId={elderId}
        originalValue={originalValue}
        valueLabel={valueLabel}
        onCorrectionSubmitted={onCorrectionSubmitted}
      />
    </>
  );
}
