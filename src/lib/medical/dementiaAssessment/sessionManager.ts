/**
 * Dementia Assessment Session Manager
 *
 * Handles CRUD operations for assessment sessions including:
 * - Creating new sessions
 * - Saving answers
 * - Resuming incomplete sessions
 * - Completing assessments
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import type {
  DementiaAssessmentSession,
  QuestionAnswer,
  BaselineQuestion,
  AdaptiveQuestion,
  AssessmentDomain,
  ConversationMessage,
} from '@/types/dementiaAssessment';
import {
  BASELINE_QUESTIONS,
  getNextBaselineQuestion,
  formatQuestionText,
  shouldTriggerFollowUp,
  getConcernLevelForAnswer,
  getTotalBaselineQuestions,
} from './questionBank';
import { DOMAIN_ORDER } from '@/types/dementiaAssessment';

const SESSIONS_COLLECTION = 'dementiaAssessmentSessions';

// ============= Session Creation =============

/**
 * Create a new assessment session
 */
export async function createAssessmentSession(
  groupId: string,
  elderId: string,
  elderName: string,
  caregiverId: string,
  caregiverName: string,
  elderAge?: number,
  knownConditions?: string[]
): Promise<DementiaAssessmentSession> {
  const sessionId = `${groupId}_${elderId}_${Date.now()}`;
  const now = new Date();

  const session: DementiaAssessmentSession = {
    id: sessionId,
    groupId,
    elderId,
    elderName,
    elderAge,
    knownConditions,
    caregiverId,
    caregiverName,
    startedAt: now,
    lastActivityAt: now,
    status: 'in_progress',
    answers: [],
    currentQuestionIndex: 0,
    currentDomain: DOMAIN_ORDER[0],
    totalBaselineQuestions: getTotalBaselineQuestions(),
    baselineQuestionsAnswered: 0,
    adaptiveQuestionsAsked: 0,
    conversationContext: [
      {
        role: 'system',
        content: `Starting cognitive assessment for ${elderName}${elderAge ? `, age ${elderAge}` : ''}. Caregiver: ${caregiverName}.${knownConditions?.length ? ` Known conditions: ${knownConditions.join(', ')}.` : ''}`,
        timestamp: now,
      },
    ],
    domainsCompleted: [],
  };

  // Save to Firestore
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await setDoc(sessionRef, {
    ...session,
    startedAt: Timestamp.fromDate(session.startedAt),
    lastActivityAt: Timestamp.fromDate(session.lastActivityAt),
    conversationContext: session.conversationContext.map(msg => ({
      ...msg,
      timestamp: Timestamp.fromDate(msg.timestamp),
    })),
  });

  return session;
}

// ============= Session Retrieval =============

/**
 * Get session by ID
 */
export async function getSessionById(
  sessionId: string
): Promise<DementiaAssessmentSession | null> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sessionDoc = await getDoc(sessionRef);

  if (!sessionDoc.exists()) {
    return null;
  }

  return convertSessionFromFirestore(sessionDoc.data());
}

/**
 * Get active (in-progress) session for an elder
 */
export async function getActiveSession(
  groupId: string,
  elderId: string,
  caregiverId: string
): Promise<DementiaAssessmentSession | null> {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(
    sessionsRef,
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    where('caregiverId', '==', caregiverId),
    where('status', '==', 'in_progress'),
    orderBy('startedAt', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  return convertSessionFromFirestore(snapshot.docs[0].data());
}

/**
 * Get all sessions for an elder (for history)
 */
export async function getElderSessions(
  groupId: string,
  elderId: string
): Promise<DementiaAssessmentSession[]> {
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(
    sessionsRef,
    where('groupId', '==', groupId),
    where('elderId', '==', elderId),
    orderBy('startedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => convertSessionFromFirestore(doc.data()));
}

// ============= Answer Management =============

/**
 * Save an answer to the session
 */
export async function saveAnswer(
  sessionId: string,
  question: BaselineQuestion | AdaptiveQuestion,
  answer: string,
  answerLabel: string
): Promise<{ session: DementiaAssessmentSession; shouldBranch: boolean }> {
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'in_progress') {
    throw new Error('Session is not in progress');
  }

  const now = new Date();
  const isAdaptive = 'generatedBy' in question;
  const depth = isAdaptive ? (question as AdaptiveQuestion).depth : 0;

  // Get concern level and points
  const { concernLevel, points } = getConcernLevelForAnswer(
    question as BaselineQuestion,
    answer
  );

  const questionAnswer: QuestionAnswer = {
    questionId: question.id,
    questionText: question.questionText,
    domain: question.domain,
    type: question.type,
    answer,
    answerLabel,
    concernLevel,
    points,
    answeredAt: now,
    isAdaptive,
    depth,
    parentQuestionId: isAdaptive ? (question as AdaptiveQuestion).parentQuestionId : undefined,
  };

  // Update session
  const updatedAnswers = [...session.answers, questionAnswer];
  const baselineAnswered = isAdaptive
    ? session.baselineQuestionsAnswered
    : session.baselineQuestionsAnswered + 1;
  const adaptiveAsked = isAdaptive
    ? session.adaptiveQuestionsAsked + 1
    : session.adaptiveQuestionsAsked;

  // Check if we should trigger AI branching
  let shouldBranch = false;
  if (!isAdaptive && shouldTriggerFollowUp(question as BaselineQuestion, answer)) {
    shouldBranch = true;
  }

  // Add to conversation context for AI
  const conversationMessage: ConversationMessage = {
    role: 'user',
    content: `Q: ${question.questionText}\nA: ${answerLabel} (${concernLevel})`,
    timestamp: now,
  };

  // Update domains completed
  const domainsWithAnswers = new Set(updatedAnswers.map(a => a.domain));
  const completedDomains = DOMAIN_ORDER.filter(domain => {
    const domainQuestions = BASELINE_QUESTIONS.filter(q => q.domain === domain);
    const domainAnswers = updatedAnswers.filter(
      a => a.domain === domain && !a.isAdaptive
    );
    return domainAnswers.length >= domainQuestions.length;
  });

  // Determine current domain
  const currentDomain = DOMAIN_ORDER.find(domain => {
    const domainQuestions = BASELINE_QUESTIONS.filter(q => q.domain === domain);
    const domainAnswers = updatedAnswers.filter(
      a => a.domain === domain && !a.isAdaptive
    );
    return domainAnswers.length < domainQuestions.length;
  }) || session.currentDomain;

  const updatedSession: DementiaAssessmentSession = {
    ...session,
    answers: updatedAnswers,
    lastActivityAt: now,
    baselineQuestionsAnswered: baselineAnswered,
    adaptiveQuestionsAsked: adaptiveAsked,
    currentQuestionIndex: session.currentQuestionIndex + 1,
    currentDomain,
    conversationContext: [...session.conversationContext, conversationMessage],
    domainsCompleted: completedDomains,
  };

  // Save to Firestore
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    answers: updatedSession.answers.map(a => ({
      ...a,
      answeredAt: Timestamp.fromDate(a.answeredAt),
    })),
    lastActivityAt: Timestamp.fromDate(now),
    baselineQuestionsAnswered: baselineAnswered,
    adaptiveQuestionsAsked: adaptiveAsked,
    currentQuestionIndex: updatedSession.currentQuestionIndex,
    currentDomain,
    conversationContext: updatedSession.conversationContext.map(msg => ({
      ...msg,
      timestamp: Timestamp.fromDate(msg.timestamp),
    })),
    domainsCompleted: completedDomains,
  });

  return { session: updatedSession, shouldBranch };
}

// ============= Question Navigation =============

/**
 * Get the next question to ask (baseline or adaptive)
 */
export function getNextQuestion(
  session: DementiaAssessmentSession
): BaselineQuestion | null {
  const answeredIds = session.answers
    .filter(a => !a.isAdaptive)
    .map(a => a.questionId);

  const lastAnswered = answeredIds[answeredIds.length - 1] || null;
  const nextQuestion = getNextBaselineQuestion(lastAnswered, answeredIds);

  if (nextQuestion) {
    // Format with elder name
    return {
      ...nextQuestion,
      questionText: formatQuestionText(nextQuestion, session.elderName),
    };
  }

  return null;
}

/**
 * Check if all baseline questions are answered
 */
export function isAssessmentComplete(session: DementiaAssessmentSession): boolean {
  const answeredBaseline = session.answers.filter(a => !a.isAdaptive).length;
  return answeredBaseline >= getTotalBaselineQuestions();
}

// ============= Session Status Updates =============

/**
 * Complete an assessment session
 */
export async function completeSession(
  sessionId: string
): Promise<DementiaAssessmentSession> {
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const now = new Date();
  const updatedSession: DementiaAssessmentSession = {
    ...session,
    status: 'completed',
    completedAt: now,
    lastActivityAt: now,
    domainsCompleted: DOMAIN_ORDER,
  };

  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    status: 'completed',
    completedAt: Timestamp.fromDate(now),
    lastActivityAt: Timestamp.fromDate(now),
    domainsCompleted: DOMAIN_ORDER,
  });

  return updatedSession;
}

/**
 * Abandon an assessment session
 */
export async function abandonSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const now = new Date();

  await updateDoc(sessionRef, {
    status: 'abandoned',
    lastActivityAt: Timestamp.fromDate(now),
  });
}

// ============= Context Building for AI =============

/**
 * Build context for AI adaptive branching
 */
export function buildAIContext(session: DementiaAssessmentSession): string {
  const recentAnswers = session.answers.slice(-5); // Last 5 answers for context

  let context = `Assessment Context:\n`;
  context += `- Elder: ${session.elderName}`;
  if (session.elderAge) context += `, Age: ${session.elderAge}`;
  if (session.knownConditions?.length) {
    context += `\n- Known conditions: ${session.knownConditions.join(', ')}`;
  }
  context += `\n- Current domain: ${session.currentDomain}`;
  context += `\n- Questions answered: ${session.answers.length}`;
  context += `\n\nRecent Responses:\n`;

  for (const answer of recentAnswers) {
    context += `- ${answer.questionText}: ${answer.answerLabel} (${answer.concernLevel})\n`;
  }

  return context;
}

/**
 * Get domain-specific answers for branching context
 */
export function getDomainAnswers(
  session: DementiaAssessmentSession,
  domain: AssessmentDomain
): QuestionAnswer[] {
  return session.answers.filter(a => a.domain === domain);
}

// ============= Helper Functions =============

/**
 * Convert Firestore document to session object
 */
function convertSessionFromFirestore(data: any): DementiaAssessmentSession {
  return {
    ...data,
    startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
    completedAt: data.completedAt?.toDate?.() || (data.completedAt ? new Date(data.completedAt) : undefined),
    lastActivityAt: data.lastActivityAt?.toDate?.() || new Date(data.lastActivityAt),
    answers: (data.answers || []).map((a: any) => ({
      ...a,
      answeredAt: a.answeredAt?.toDate?.() || new Date(a.answeredAt),
    })),
    conversationContext: (data.conversationContext || []).map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp?.toDate?.() || new Date(msg.timestamp),
    })),
  };
}

/**
 * Calculate session duration in minutes
 */
export function getSessionDurationMinutes(session: DementiaAssessmentSession): number {
  const endTime = session.completedAt || session.lastActivityAt;
  const startTime = session.startedAt;
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.round(durationMs / 60000);
}
