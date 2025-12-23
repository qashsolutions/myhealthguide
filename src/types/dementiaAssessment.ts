/**
 * Dementia Assessment Types
 *
 * Hybrid Q&A Assessment System combining MoCA-adapted structured questions
 * with AI-driven adaptive branching for comprehensive caregiver-administered
 * cognitive screening.
 *
 * IMPORTANT: This is NOT a diagnostic tool. All results must emphasize
 * professional consultation.
 */

// ============= Domain Categories =============
export type AssessmentDomain =
  | 'memory'           // Short-term, long-term recall
  | 'orientation'      // Time, place, person awareness
  | 'attention'        // Focus, concentration
  | 'language'         // Word-finding, comprehension
  | 'executive'        // Planning, judgment, problem-solving
  | 'mood_behavior';   // Depression, anxiety, loneliness, agitation

export type QuestionType =
  | 'multiple_choice'  // Select one from options
  | 'frequency'        // Never/Rarely/Sometimes/Often/Always
  | 'yes_no'           // Binary choice
  | 'scale';           // 1-5 scale

export type ConcernLevel = 'none' | 'mild' | 'moderate' | 'concerning';

// ============= Question Structure =============
export interface QuestionOption {
  value: string;
  label: string;
  concernLevel: ConcernLevel;
  points: number; // Score contribution (0-4 typically)
}

export interface BaselineQuestion {
  id: string;
  domain: AssessmentDomain;
  questionText: string;
  caregiverPrompt: string; // How caregiver should observe/ask
  type: QuestionType;
  options: QuestionOption[];
  weight: number; // Contribution to domain score (1-5)
  triggerFollowUp: boolean; // If true, concerning answer triggers AI branch
  concernThreshold: string[]; // Values that indicate concern
  mocaReference?: string; // Original MoCA domain/item reference
  order: number;
}

export interface AdaptiveQuestion {
  id: string;
  domain: AssessmentDomain;
  questionText: string;
  caregiverPrompt?: string;
  type: QuestionType;
  options: QuestionOption[];
  generatedBy: 'ai' | 'rule';
  parentQuestionId: string; // Which question triggered this
  parentAnswer: string; // The answer that triggered this
  depth: number; // How many levels deep in the branching (1-3)
  branchingReason: string; // Why AI generated this follow-up
}

// ============= Answer Types =============
export interface QuestionAnswer {
  questionId: string;
  questionText: string;
  domain: AssessmentDomain;
  type: QuestionType;
  answer: string;
  answerLabel: string; // Human-readable answer
  concernLevel: ConcernLevel;
  points: number;
  answeredAt: Date;
  isAdaptive: boolean;
  depth: number; // 0 for baseline, 1-3 for adaptive
  parentQuestionId?: string;
}

// ============= Assessment Session =============
export interface DementiaAssessmentSession {
  id: string;
  groupId: string;
  elderId: string;
  elderName: string;
  elderAge?: number;
  knownConditions?: string[];
  caregiverId: string;
  caregiverName: string;

  // Session metadata
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  status: 'in_progress' | 'completed' | 'abandoned';

  // Answers
  answers: QuestionAnswer[];
  currentQuestionIndex: number;
  currentDomain: AssessmentDomain;

  // Tracking
  totalBaselineQuestions: number;
  baselineQuestionsAnswered: number;
  adaptiveQuestionsAsked: number;

  // For AI context
  conversationContext: ConversationMessage[];

  // Progress
  domainsCompleted: AssessmentDomain[];
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ============= Domain Score =============
export interface DomainScore {
  domain: AssessmentDomain;
  domainLabel: string;
  rawScore: number;
  maxPossibleScore: number;
  normalizedScore: number; // 0-100
  concernLevel: ConcernLevel;
  questionsAsked: number;
  concerningAnswers: number;
  keyFindings: string[];
}

// ============= Assessment Results =============
export type OverallRiskLevel = 'low' | 'moderate' | 'concerning' | 'urgent';

export interface AssessmentRecommendation {
  type: 'professional_consult' | 'monitoring' | 'lifestyle' | 'support_resources';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems?: string[];
}

export interface DementiaAssessmentResult {
  id: string;
  sessionId: string;
  groupId: string;
  elderId: string;
  elderName: string;

  // Respondent info
  caregiverId: string;
  caregiverName: string;

  // Timing
  assessmentDate: Date;
  completedAt: Date;
  durationMinutes: number;

  // Questions summary
  totalQuestionsAsked: number;
  baselineQuestionsAsked: number;
  adaptiveQuestionsAsked: number;

  // Scores
  domainScores: DomainScore[];
  overallRiskScore: number; // 0-100
  overallRiskLevel: OverallRiskLevel;

  // AI Analysis
  aiSummary: string;
  keyObservations: string[];
  areasOfConcern: string[];
  strengthsNoted: string[];

  // Recommendations (non-diagnostic)
  recommendations: AssessmentRecommendation[];

  // Comparison with previous assessments
  previousAssessmentId?: string;
  changeFromPrevious?: {
    overallTrend: 'improved' | 'stable' | 'declined';
    domainChanges: { domain: AssessmentDomain; change: number }[];
    summary: string;
  };

  // Integration with behavioral screening
  linkedBehavioralScreeningId?: string;
  combinedInsights?: string;

  // Status
  status: 'pending_review' | 'reviewed' | 'shared_with_provider';
  reviewedBy?: string;
  reviewedAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// ============= Adaptive Branching =============
export interface AIBranchingRequest {
  sessionId: string;
  elderName: string;
  elderAge?: number;
  knownConditions?: string[];
  currentDomain: AssessmentDomain;
  previousAnswers: QuestionAnswer[];
  triggeringAnswer: QuestionAnswer;
  currentDepth: number;
  maxDepth: number;
}

export interface AIBranchingResponse {
  shouldContinueBranching: boolean;
  nextQuestion?: AdaptiveQuestion;
  branchingReason: string;
  suggestDomainSwitch?: AssessmentDomain;
  confidence: number;
}

// ============= Branching Configuration =============
export const BRANCHING_CONFIG = {
  maxDepthPerDomain: 3,      // Max follow-up questions per concerning answer
  maxAdaptiveTotal: 10,      // Max AI-generated questions per assessment
  // High-priority domains get more branching allowance
  domainPriority: {
    memory: 'high',
    orientation: 'high',
    executive: 'high',
    attention: 'medium',
    language: 'medium',
    mood_behavior: 'medium',
  } as Record<AssessmentDomain, 'high' | 'medium' | 'low'>,
} as const;

// ============= Domain Labels =============
export const DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  memory: 'Memory',
  orientation: 'Orientation',
  attention: 'Attention & Concentration',
  language: 'Language & Communication',
  executive: 'Executive Function',
  mood_behavior: 'Mood & Behavior',
};

// ============= Domain Order =============
export const DOMAIN_ORDER: AssessmentDomain[] = [
  'memory',
  'orientation',
  'attention',
  'language',
  'executive',
  'mood_behavior',
];

// ============= API Types =============
export interface StartAssessmentRequest {
  groupId: string;
  elderId: string;
  elderName: string;
  elderAge?: number;
  knownConditions?: string[];
}

export interface StartAssessmentResponse {
  success: boolean;
  session?: DementiaAssessmentSession;
  firstQuestion?: BaselineQuestion;
  error?: string;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answer: string;
  answerLabel: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  session?: DementiaAssessmentSession;
  nextQuestion?: BaselineQuestion | AdaptiveQuestion;
  isAdaptiveQuestion?: boolean;
  assessmentComplete?: boolean;
  error?: string;
}

export interface CompleteAssessmentResponse {
  success: boolean;
  result?: DementiaAssessmentResult;
  error?: string;
}
