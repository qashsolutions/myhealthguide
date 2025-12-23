'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Info, Check } from 'lucide-react';
import type { BaselineQuestion, AdaptiveQuestion } from '@/types/dementiaAssessment';

interface QuestionCardProps {
  question: BaselineQuestion | AdaptiveQuestion;
  elderName: string;
  isAdaptive: boolean;
  onAnswer: (answer: string, answerLabel: string) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  elderName,
  isAdaptive,
  onAnswer,
  disabled,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selectedAnswer) return;

    const option = question.options.find(o => o.value === selectedAnswer);
    const answerLabel = option?.label || selectedAnswer;

    onAnswer(selectedAnswer, answerLabel);
    setSelectedAnswer(null); // Reset for next question
  };

  // Format question text with elder name
  const formattedQuestion = question.questionText.replace(/{elderName}/g, elderName);

  // Get caregiver prompt if available
  const caregiverPrompt = 'caregiverPrompt' in question ? question.caregiverPrompt : undefined;

  return (
    <Card className="p-6">
      {/* Adaptive indicator */}
      {isAdaptive && (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm mb-4 pb-3 border-b">
          <Sparkles className="w-4 h-4" />
          <span>AI-generated follow-up question based on your previous answer</span>
        </div>
      )}

      {/* Question text */}
      <h3 className="text-lg font-medium mb-2">{formattedQuestion}</h3>

      {/* Caregiver prompt */}
      {caregiverPrompt && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-6 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>{caregiverPrompt}</span>
        </div>
      )}

      {/* Answer options */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors text-left
              ${selectedAnswer === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => !disabled && setSelectedAnswer(option.value)}
          >
            <span className="text-sm">{option.label}</span>
            {selectedAnswer === option.value && (
              <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Submit button */}
      <div className="mt-6">
        <Button
          onClick={handleSubmit}
          disabled={!selectedAnswer || disabled}
          className="w-full"
        >
          {disabled ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </Card>
  );
}
