'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentBeehiveUser, hasCompletedAssessment } from '@/lib/beehive/auth-integration';
import { supabase } from '@/lib/supabase';
import { generateAssessmentQuestions, analyzePsychometricResponses, validateAssessmentQuestions } from '@/lib/beehive/ai-client';

// The 8 critical assessment scenarios
const ASSESSMENT_SCENARIOS = [
  { code: 'FOUND_MONEY', title: 'Integrity Test', order: 1 },
  { code: 'MEDICATION_PRESSURE', title: 'Boundaries Test', order: 2 },
  { code: 'VERBAL_ABUSE', title: 'Emotional Control', order: 3 },
  { code: 'INAPPROPRIATE_GIFT', title: 'Professional Boundaries', order: 4 },
  { code: 'FAMILY_ABSENCE', title: 'Unsupervised Behavior', order: 5 },
  { code: 'PATIENT_FALL', title: 'Emergency Response', order: 6 },
  { code: 'SEXUAL_ADVANCE', title: 'Handling Inappropriate Situations', order: 7 },
  { code: 'SUSPICIOUS_BRUISING', title: 'Mandatory Reporting', order: 8 },
];

interface AssessmentQuestion {
  scenario_code: string;
  prompt: string;
  options: Array<{
    id: number;
    text: string;
  }>;
  scores: Record<string, number>;
  automatic_fail: number[];
}

export default function PsychometricAssessmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string>('');
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkUserAndAssessment();
  }, []);

  const checkUserAndAssessment = async () => {
    try {
      const currentUser = await getCurrentBeehiveUser();
      
      if (!currentUser) {
        router.push('/beehive/login');
        return;
      }

      if (currentUser.role !== 'caregiver') {
        router.push('/beehive');
        return;
      }

      setUser(currentUser);

      // Check if already completed assessment
      const completed = await hasCompletedAssessment(currentUser.id);
      if (completed) {
        router.push('/beehive/caregiver/dashboard');
        return;
      }

      // Load assessment questions
      await loadAssessmentQuestions();
    } catch (err) {
      console.error('Error checking user:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentQuestions = async () => {
    try {
      // Fetch scenarios from database
      const { data: scenarios, error } = await supabase
        .from('assessment_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('scenario_code');

      if (error) throw error;

      // For MVP, use the static questions from DB
      // In production, we'll generate variations with Gemini
      const formattedQuestions = scenarios.map((scenario: any) => ({
        scenario_code: scenario.scenario_code,
        prompt: scenario.scenario_prompt,
        options: scenario.response_options,
        scores: scenario.response_scores,
        automatic_fail: scenario.automatic_fail_responses || [],
      }));

      setQuestions(formattedQuestions);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load assessment questions');
    }
  };

  const startAssessment = async () => {
    if (!user) return;

    try {
      // Create assessment record
      const { data, error } = await supabase
        .from('psychometric_assessments')
        .insert({
          caregiver_id: user.id,
          assessment_version: '1.0',
          started_at: new Date().toISOString(),
          scenario_responses: {},
        })
        .select()
        .single();

      if (error) throw error;

      setAssessmentId(data.id);
      setTimeStarted(new Date());
      setAssessmentStarted(true);
    } catch (err) {
      console.error('Error starting assessment:', err);
      setError('Failed to start assessment');
    }
  };

  const handleAnswer = (optionId: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    
    // Check for automatic failure
    if (currentQuestion.automatic_fail.includes(optionId)) {
      setResponses({
        ...responses,
        [currentQuestion.scenario_code]: optionId,
      });
      
      // Immediate failure - skip to results
      completeAssessment({
        ...responses,
        [currentQuestion.scenario_code]: optionId,
      }, true);
      return;
    }

    // Record response
    const newResponses = {
      ...responses,
      [currentQuestion.scenario_code]: optionId,
    };
    setResponses(newResponses);

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeAssessment(newResponses, false);
    }
  };

  const completeAssessment = async (finalResponses: Record<string, number>, autoFailed: boolean) => {
    setAnalyzing(true);
    
    try {
      // Calculate time taken
      const timeTaken = timeStarted 
        ? Math.floor((new Date().getTime() - timeStarted.getTime()) / 1000)
        : 0;

      let analysisResult;
      
      if (autoFailed) {
        // Automatic failure - don't even analyze
        analysisResult = {
          riskLevel: 'unacceptable' as const,
          scores: {
            integrity: 0,
            empathy: 0,
            impulseControl: 0,
            stressTolerance: 0,
            boundaryAwareness: 0,
            judgment: 0,
          },
          redFlags: ['Automatic failure response detected'],
          recommendation: 'reject',
          confidence: 100,
        };
      } else {
        // Analyze responses with Claude
        analysisResult = await analyzePsychometricResponses(finalResponses, {
          age: undefined, // Will be collected in profile
          education: undefined,
          experience: undefined,
        });
      }

      // Update assessment record
      const { error: updateError } = await supabase
        .from('psychometric_assessments')
        .update({
          completed_at: new Date().toISOString(),
          time_taken_seconds: timeTaken,
          scenario_responses: finalResponses,
          integrity_score: analysisResult.scores.integrity,
          empathy_score: analysisResult.scores.empathy,
          impulse_control_score: analysisResult.scores.impulseControl,
          stress_tolerance_score: analysisResult.scores.stressTolerance,
          boundary_awareness_score: analysisResult.scores.boundaryAwareness,
          judgment_score: analysisResult.scores.judgment,
          overall_risk_level: analysisResult.riskLevel,
          risk_factors: analysisResult.redFlags,
          ai_confidence_score: analysisResult.confidence / 100,
          ai_red_flags: analysisResult.redFlags,
        })
        .eq('id', assessmentId);

      if (updateError) throw updateError;

      // Update caregiver profile with scores
      const { error: profileError } = await supabase
        .from('caregiver_profiles')
        .update({
          safety_score: analysisResult.scores.integrity,
          empathy_score: analysisResult.scores.empathy,
          integrity_score: analysisResult.scores.integrity,
          knowledge_score: analysisResult.scores.judgment,
          overall_trust_score: (
            analysisResult.scores.integrity +
            analysisResult.scores.empathy +
            analysisResult.scores.impulseControl +
            analysisResult.scores.stressTolerance +
            analysisResult.scores.boundaryAwareness +
            analysisResult.scores.judgment
          ) / 6,
        })
        .eq('user_id', user.id);

      if (profileError) console.error('Profile update error:', profileError);

      // Navigate based on result
      if (analysisResult.riskLevel === 'unacceptable' || analysisResult.riskLevel === 'high') {
        router.push('/beehive/assessment/failed');
      } else {
        router.push('/beehive/caregiver/onboarding/background-check');
      }
    } catch (err) {
      console.error('Error completing assessment:', err);
      setError('Failed to complete assessment');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-elder max-w-md">
          <h2 className="text-elder-lg font-bold text-red-700 mb-2">Error</h2>
          <p className="text-elder-base text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!assessmentStarted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
            <h1 className="text-elder-2xl font-bold text-elder-text mb-6">
              Caregiver Safety Assessment
            </h1>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8">
              <h2 className="text-elder-lg font-semibold text-amber-900 mb-3">
                Important Information
              </h2>
              <ul className="space-y-2 text-elder-base text-amber-800">
                <li>• This assessment takes approximately 15-20 minutes</li>
                <li>• Answer honestly - there are no "trick" questions</li>
                <li>• Some responses will result in automatic disqualification</li>
                <li>• You cannot retake this assessment for 90 days</li>
                <li>• Your responses help us ensure elder safety</li>
              </ul>
            </div>

            <div className="prose prose-lg text-elder-base text-elder-text-secondary mb-8">
              <p>
                This assessment evaluates your suitability as a caregiver for vulnerable elderly patients. 
                You will be presented with 8 real-world scenarios that caregivers commonly face.
              </p>
              <p>
                Your responses help us understand your decision-making, boundaries, and approach to caregiving. 
                This is a critical step in our commitment to elder safety.
              </p>
            </div>

            <button
              onClick={startAssessment}
              className="w-full py-4 px-6 bg-primary-600 text-white text-elder-lg font-medium rounded-elder hover:bg-primary-700 transition-colors"
            >
              Begin Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mx-auto mb-6"></div>
          <h2 className="text-elder-xl font-semibold text-elder-text mb-2">
            Analyzing Your Responses
          </h2>
          <p className="text-elder-base text-elder-text-secondary">
            Please wait while we evaluate your assessment...
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-elder-sm text-elder-text-secondary">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-elder-sm text-elder-text-secondary">
              {ASSESSMENT_SCENARIOS[currentQuestionIndex]?.title}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <h2 className="text-elder-xl font-semibold text-elder-text mb-6">
            Scenario {currentQuestionIndex + 1}
          </h2>
          
          <div className="prose prose-lg text-elder-base text-elder-text mb-8">
            <p>{currentQuestion.prompt}</p>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option: any) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.id)}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-elder hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <span className="text-elder-base">{option.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}