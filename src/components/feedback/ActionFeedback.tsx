'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import {
  submitActionFeedback,
  hasUserFeedback,
} from '@/lib/feedback/feedbackService';
import type {
  FeedbackAction,
  ActionFeedbackProps,
  AIFeedback,
} from '@/types/feedback';
import { cn } from '@/lib/utils';

export function ActionFeedback({
  targetType,
  targetId,
  elderId,
  primaryAction,
  secondaryAction,
  onActionTaken,
  className,
}: ActionFeedbackProps) {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get groupId from selectedElder
  const groupId = selectedElder?.groupId;

  const [selectedAction, setSelectedAction] = useState<FeedbackAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Check if user has already submitted feedback for this target
  useEffect(() => {
    async function checkExistingFeedback() {
      if (!user?.id || !targetId) return;

      const exists = await hasUserFeedback(user.id, targetId, targetType);
      if (exists) {
        setAlreadySubmitted(true);
        setIsSubmitted(true);
      }
    }

    checkExistingFeedback();
  }, [user?.id, targetId, targetType]);

  const handleAction = async (action: FeedbackAction, isPrimary: boolean) => {
    if (!user?.id || !groupId || isSubmitted || alreadySubmitted) return;

    setSelectedAction(action);
    setIsSubmitting(true);

    try {
      const result = await submitActionFeedback({
        targetType,
        targetId,
        userId: user.id,
        groupId,
        elderId: elderId || selectedElder?.id,
        action,
        actionTaken: isPrimary, // Primary action means user took action
      });

      if (result.success) {
        setIsSubmitted(true);

        if (onActionTaken && result.id && groupId) {
          onActionTaken({
            id: result.id,
            feedbackType: 'action',
            targetType,
            targetId,
            userId: user.id,
            groupId,
            elderId: elderId || selectedElder?.id,
            action,
            actionTaken: isPrimary,
            createdAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error submitting action feedback:', error);
      setSelectedAction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted || alreadySubmitted) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>
          {selectedAction === primaryAction.action
            ? primaryAction.label
            : selectedAction === secondaryAction.action
            ? secondaryAction.label
            : 'Response recorded'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
        onClick={() => handleAction(primaryAction.action, true)}
        disabled={isSubmitting}
      >
        <Check className="h-3.5 w-3.5" />
        {primaryAction.label}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        onClick={() => handleAction(secondaryAction.action, false)}
        disabled={isSubmitting}
      >
        <X className="h-3.5 w-3.5" />
        {secondaryAction.label}
      </Button>
    </div>
  );
}

/**
 * Pre-configured action feedback variants
 */

export function MedicationOptimizationFeedback({
  targetId,
  elderId,
  onActionTaken,
  className,
}: {
  targetId: string;
  elderId?: string;
  onActionTaken?: (feedback: AIFeedback) => void;
  className?: string;
}) {
  return (
    <ActionFeedback
      targetType="medication_optimization"
      targetId={targetId}
      elderId={elderId}
      primaryAction={{ label: 'Apply This', action: 'applied' }}
      secondaryAction={{ label: 'Ignore', action: 'ignored' }}
      onActionTaken={onActionTaken}
      className={className}
    />
  );
}

export function RefillAlertFeedback({
  targetId,
  elderId,
  onActionTaken,
  className,
}: {
  targetId: string;
  elderId?: string;
  onActionTaken?: (feedback: AIFeedback) => void;
  className?: string;
}) {
  return (
    <ActionFeedback
      targetType="refill_alert"
      targetId={targetId}
      elderId={elderId}
      primaryAction={{ label: 'Correct', action: 'correct' }}
      secondaryAction={{ label: 'Not Needed', action: 'not_needed' }}
      onActionTaken={onActionTaken}
      className={className}
    />
  );
}

export function HealthChangeFeedback({
  targetId,
  elderId,
  onActionTaken,
  className,
}: {
  targetId: string;
  elderId?: string;
  onActionTaken?: (feedback: AIFeedback) => void;
  className?: string;
}) {
  return (
    <ActionFeedback
      targetType="health_change"
      targetId={targetId}
      elderId={elderId}
      primaryAction={{ label: 'Valid Concern', action: 'valid' }}
      secondaryAction={{ label: 'False Alarm', action: 'false_alarm' }}
      onActionTaken={onActionTaken}
      className={className}
    />
  );
}
