'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThumbsUp, ThumbsDown, Check, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import {
  submitRatingFeedback,
  hasUserFeedback,
} from '@/lib/feedback/feedbackService';
import type {
  FeedbackTargetType,
  FeedbackRating,
  FeedbackReason,
  FeedbackButtonsProps,
  AIFeedback,
} from '@/types/feedback';
import { cn } from '@/lib/utils';

const REASON_OPTIONS: { value: FeedbackReason; label: string }[] = [
  { value: 'accurate', label: 'Accurate information' },
  { value: 'helpful', label: 'Very helpful' },
  { value: 'actionable', label: 'Actionable advice' },
  { value: 'relevant', label: 'Relevant to my situation' },
  { value: 'inaccurate', label: 'Inaccurate information' },
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'confusing', label: 'Confusing or unclear' },
  { value: 'too_generic', label: 'Too generic' },
  { value: 'other', label: 'Other' },
];

export function FeedbackButtons({
  targetType,
  targetId,
  elderId,
  onFeedbackSubmitted,
  size = 'sm',
  showComment = true,
  className,
}: FeedbackButtonsProps) {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get groupId from selectedElder
  const groupId = selectedElder?.groupId;

  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
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

  const handleRating = async (newRating: FeedbackRating) => {
    if (!user?.id || !groupId || isSubmitted || alreadySubmitted) return;

    setRating(newRating);

    // If showing comment option, open popover for additional details
    if (showComment) {
      setShowPopover(true);
      return;
    }

    // Otherwise, submit immediately
    await submitFeedback(newRating);
  };

  const submitFeedback = async (feedbackRating: FeedbackRating, feedbackReason?: FeedbackReason) => {
    if (!user?.id || !groupId) return;

    setIsSubmitting(true);

    try {
      const result = await submitRatingFeedback({
        targetType,
        targetId,
        userId: user.id,
        groupId,
        elderId: elderId || selectedElder?.id,
        rating: feedbackRating,
        reason: feedbackReason || undefined,
        comment: comment.trim() || undefined,
      });

      if (result.success) {
        setIsSubmitted(true);
        setShowPopover(false);

        if (onFeedbackSubmitted && result.id && groupId) {
          onFeedbackSubmitted({
            id: result.id,
            feedbackType: 'rating',
            targetType,
            targetId,
            userId: user.id,
            groupId,
            elderId: elderId || selectedElder?.id,
            rating: feedbackRating,
            reason: feedbackReason,
            comment: comment.trim() || undefined,
            createdAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWithDetails = () => {
    if (rating) {
      submitFeedback(rating, reason || undefined);
    }
  };

  // Size variants
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-9 w-9',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (isSubmitted || alreadySubmitted) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Check className="h-3.5 w-3.5 text-green-500" />
        <span>Thanks for your feedback</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={showPopover} onOpenChange={setShowPopover}>
        <div className="flex items-center gap-1">
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                sizeClasses[size],
                rating === 'helpful' && 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              )}
              onClick={() => handleRating('helpful')}
              disabled={isSubmitting}
              title="Helpful"
            >
              <ThumbsUp className={iconSizes[size]} />
            </Button>
          </PopoverTrigger>

          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                sizeClasses[size],
                rating === 'not_helpful' && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              )}
              onClick={() => handleRating('not_helpful')}
              disabled={isSubmitting}
              title="Not helpful"
            >
              <ThumbsDown className={iconSizes[size]} />
            </Button>
          </PopoverTrigger>
        </div>

        {showComment && (
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {rating === 'helpful' ? (
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                )}
                <span>
                  {rating === 'helpful' ? 'What was helpful?' : 'What could be better?'}
                </span>
              </div>

              <Select
                value={reason || ''}
                onValueChange={(value) => setReason(value as FeedbackReason)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a reason (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Additional comments (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us more..."
                  className="h-16 text-xs resize-none"
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPopover(false);
                    setRating(null);
                    setReason(null);
                    setComment('');
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitWithDetails}
                  disabled={isSubmitting}
                  className="h-7 text-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
