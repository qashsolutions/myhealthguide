/**
 * Dementia Assessment Module
 *
 * Hybrid Q&A assessment system combining MoCA-adapted structured questions
 * with AI-driven adaptive branching for comprehensive caregiver-administered
 * cognitive screening.
 *
 * IMPORTANT: This is NOT a diagnostic tool. All results must emphasize
 * professional consultation.
 */

// Question Bank
export {
  BASELINE_QUESTIONS,
  QUESTIONS_BY_DOMAIN,
  getQuestionById,
  getQuestionsForDomain,
  getNextBaselineQuestion,
  formatQuestionText,
  shouldTriggerFollowUp,
  getConcernLevelForAnswer,
  getMaxScoreForDomain,
  getTotalBaselineQuestions,
} from './questionBank';

// Session Manager
export {
  createAssessmentSession,
  getSessionById,
  getActiveSession,
  getElderSessions,
  saveAnswer,
  getNextQuestion,
  isAssessmentComplete,
  completeSession,
  abandonSession,
  buildAIContext,
  getDomainAnswers,
  getSessionDurationMinutes,
} from './sessionManager';

// Scoring Engine
export {
  calculateDomainScores,
  calculateOverallRisk,
  identifyKeyObservations,
  compareWithPrevious,
  getRiskLevelColor,
  getRiskLevelDescription,
  getConcernLevelColor,
} from './scoringEngine';

// Adaptive Branching
export { getAdaptiveFollowUp } from './adaptiveBranching';

// Result Generator
export {
  generateAssessmentResult,
  getElderResults,
} from './resultGenerator';

// Re-export types from types file
export type {
  AssessmentDomain,
  QuestionType,
  ConcernLevel,
  QuestionOption,
  BaselineQuestion,
  AdaptiveQuestion,
  QuestionAnswer,
  DementiaAssessmentSession,
  ConversationMessage,
  DomainScore,
  OverallRiskLevel,
  AssessmentRecommendation,
  DementiaAssessmentResult,
  AIBranchingRequest,
  AIBranchingResponse,
  StartAssessmentRequest,
  StartAssessmentResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  CompleteAssessmentResponse,
} from '@/types/dementiaAssessment';

export {
  BRANCHING_CONFIG,
  DOMAIN_LABELS,
  DOMAIN_ORDER,
} from '@/types/dementiaAssessment';
