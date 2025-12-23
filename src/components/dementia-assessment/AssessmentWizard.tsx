'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type {
  DementiaAssessmentSession,
  DementiaAssessmentResult,
  BaselineQuestion,
  AdaptiveQuestion,
} from '@/types/dementiaAssessment';
import { DOMAIN_LABELS, DOMAIN_ORDER } from '@/types/dementiaAssessment';
import { QuestionCard } from './QuestionCard';
import { ResultsSummary } from './ResultsSummary';

interface AssessmentWizardProps {
  groupId: string;
  elderId: string;
  elderName: string;
  elderAge?: number;
  knownConditions?: string[];
  onComplete?: (result: DementiaAssessmentResult) => void;
  onCancel?: () => void;
}

type WizardStep = 'intro' | 'questions' | 'processing' | 'results';

export function AssessmentWizard({
  groupId,
  elderId,
  elderName,
  elderAge,
  knownConditions,
  onComplete,
  onCancel,
}: AssessmentWizardProps) {
  const { user } = useAuth();

  // State
  const [step, setStep] = useState<WizardStep>('intro');
  const [session, setSession] = useState<DementiaAssessmentSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<BaselineQuestion | AdaptiveQuestion | null>(null);
  const [isAdaptiveQuestion, setIsAdaptiveQuestion] = useState(false);
  const [result, setResult] = useState<DementiaAssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Start assessment
  async function startAssessment() {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/dementia-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          elderId,
          elderName,
          elderAge,
          knownConditions,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start assessment');
      }

      setSession(data.session);
      setCurrentQuestion(data.firstQuestion);
      setStep('questions');
    } catch (err) {
      console.error('Error starting assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  }

  // Submit answer
  async function submitAnswer(answer: string, answerLabel: string) {
    if (!session || !currentQuestion) return;

    setSubmitting(true);
    setError(null);

    try {
      // Submit the answer
      const answerResponse = await authenticatedFetch(
        `/api/dementia-assessment/${session.id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            answer,
            answerLabel,
            question: isAdaptiveQuestion ? currentQuestion : undefined,
          }),
        }
      );

      const answerData = await answerResponse.json();

      if (!answerData.success) {
        throw new Error(answerData.error || 'Failed to submit answer');
      }

      setSession(answerData.session);

      // Check if we should trigger branching
      const lastAnswer = answerData.session.answers[answerData.session.answers.length - 1];
      const shouldBranch =
        !isAdaptiveQuestion &&
        (lastAnswer?.concernLevel === 'concerning' || lastAnswer?.concernLevel === 'moderate');

      // Get next question
      const nextResponse = await authenticatedFetch(
        `/api/dementia-assessment/${session.id}/next-question?branch=${shouldBranch}&triggeringQuestionId=${currentQuestion.id}`,
        { method: 'GET' }
      );

      const nextData = await nextResponse.json();

      if (!nextData.success) {
        throw new Error(nextData.error || 'Failed to get next question');
      }

      if (nextData.assessmentComplete) {
        // Complete the assessment
        await completeAssessment();
      } else if (nextData.nextQuestion) {
        setCurrentQuestion(nextData.nextQuestion);
        setIsAdaptiveQuestion(nextData.isAdaptiveQuestion || false);
        setSession(nextData.session);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  }

  // Complete assessment
  async function completeAssessment() {
    if (!session) return;

    setStep('processing');
    setError(null);

    try {
      const response = await authenticatedFetch(
        `/api/dementia-assessment/${session.id}/complete`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to complete assessment');
      }

      setResult(data.result);
      setStep('results');
      onComplete?.(data.result);
    } catch (err) {
      console.error('Error completing assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete assessment');
      setStep('questions'); // Go back to questions on error
    }
  }

  // Abandon assessment
  async function abandonAssessment() {
    if (!session) {
      onCancel?.();
      return;
    }

    try {
      await authenticatedFetch(`/api/dementia-assessment/${session.id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error abandoning assessment:', err);
    }

    onCancel?.();
  }

  // Calculate progress
  const totalQuestions = session?.totalBaselineQuestions || 13;
  const answeredQuestions = session?.baselineQuestionsAnswered || 0;
  const progress = Math.round((answeredQuestions / totalQuestions) * 100);

  // Get current domain
  const currentDomain = session?.currentDomain || DOMAIN_ORDER[0];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Intro Step */}
      {step === 'intro' && (
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Cognitive Assessment</h2>
            <p className="text-muted-foreground">
              Answer questions about {elderName}&apos;s cognitive function based on your observations.
            </p>
          </div>

          {/* Disclaimer */}
          <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>This is NOT a medical diagnosis.</strong> This screening helps identify patterns
              that may warrant discussion with a healthcare professional. Only a qualified healthcare
              provider can diagnose cognitive conditions.
            </AlertDescription>
          </Alert>

          {/* What to expect */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              What to Expect
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>13 baseline questions across 6 cognitive domains</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>AI may ask follow-up questions for concerning answers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Takes approximately 10-15 minutes to complete</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Based on your observations of {elderName}</span>
              </li>
            </ul>
          </div>

          {/* Domains covered */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Domains Covered</h3>
            <div className="grid grid-cols-2 gap-2">
              {DOMAIN_ORDER.map(domain => (
                <div
                  key={domain}
                  className="text-sm px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                >
                  {DOMAIN_LABELS[domain]}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={startAssessment} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start Assessment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Questions Step */}
      {step === 'questions' && session && currentQuestion && (
        <div className="space-y-4">
          {/* Progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Question {answeredQuestions + 1} of ~{totalQuestions}
              </span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Domain: {DOMAIN_LABELS[currentDomain]}
              </span>
              {isAdaptiveQuestion && (
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Follow-up
                </span>
              )}
            </div>
          </Card>

          {/* Current Question */}
          <QuestionCard
            question={currentQuestion}
            elderName={elderName}
            isAdaptive={isAdaptiveQuestion}
            onAnswer={submitAnswer}
            disabled={submitting}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cancel button */}
          <div className="flex justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={abandonAssessment}
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Cancel Assessment
            </Button>
          </div>
        </div>
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <Card className="p-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <h3 className="text-lg font-medium mb-2">Analyzing Results</h3>
          <p className="text-muted-foreground">
            Our AI is generating your assessment summary and recommendations...
          </p>
        </Card>
      )}

      {/* Results Step */}
      {step === 'results' && result && (
        <ResultsSummary
          result={result}
          elderName={elderName}
          onClose={onCancel}
        />
      )}
    </div>
  );
}
