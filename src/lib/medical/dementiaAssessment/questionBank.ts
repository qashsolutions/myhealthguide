/**
 * MoCA-Adapted Question Bank for Dementia Assessment
 *
 * 13 structured questions across 6 cognitive domains, designed for
 * caregiver-administered assessment about the elder's cognitive function.
 *
 * Based on Montreal Cognitive Assessment (MoCA) domains but adapted
 * for observational assessment by caregivers rather than direct testing.
 */

import type { BaselineQuestion, AssessmentDomain, QuestionOption } from '@/types/dementiaAssessment';

// ============= Helper for consistent option structure =============
const frequencyOptions: QuestionOption[] = [
  { value: 'never', label: 'Never', concernLevel: 'none', points: 0 },
  { value: 'rarely', label: 'Rarely (once a week or less)', concernLevel: 'none', points: 1 },
  { value: 'sometimes', label: 'Sometimes (few times a week)', concernLevel: 'mild', points: 2 },
  { value: 'often', label: 'Often (daily)', concernLevel: 'moderate', points: 3 },
  { value: 'always', label: 'Almost always', concernLevel: 'concerning', points: 4 },
];

// ============= MEMORY DOMAIN (3 questions) =============
const MEMORY_QUESTIONS: BaselineQuestion[] = [
  {
    id: 'memory_1',
    domain: 'memory',
    questionText: 'How often does {elderName} have difficulty remembering recent events from the past 24 hours?',
    caregiverPrompt: 'Think about whether they remember meals, visitors, or conversations from today or yesterday.',
    type: 'frequency',
    options: frequencyOptions,
    weight: 5,
    triggerFollowUp: true,
    concernThreshold: ['often', 'always'],
    mocaReference: 'Delayed Recall',
    order: 1,
  },
  {
    id: 'memory_2',
    domain: 'memory',
    questionText: 'Does {elderName} repeat the same questions or stories within a short time (within an hour)?',
    caregiverPrompt: 'Notice if they ask the same thing multiple times in one conversation or tell the same story repeatedly.',
    type: 'frequency',
    options: [
      { value: 'never', label: 'Never', concernLevel: 'none', points: 0 },
      { value: 'occasionally', label: 'Occasionally (once a week)', concernLevel: 'mild', points: 1 },
      { value: 'several_daily', label: 'Several times a day', concernLevel: 'moderate', points: 3 },
      { value: 'frequently', label: 'Frequently throughout the day', concernLevel: 'concerning', points: 4 },
    ],
    weight: 5,
    triggerFollowUp: true,
    concernThreshold: ['several_daily', 'frequently'],
    mocaReference: 'Short-term Memory',
    order: 2,
  },
  {
    id: 'memory_3',
    domain: 'memory',
    questionText: 'Has {elderName} had difficulty recognizing familiar people or places?',
    caregiverPrompt: 'Consider if they have forgotten family members, close friends, or gotten confused in familiar locations like their own home.',
    type: 'multiple_choice',
    options: [
      { value: 'no', label: 'No, always recognizes them', concernLevel: 'none', points: 0 },
      { value: 'occasional_place', label: 'Occasionally confused about places', concernLevel: 'mild', points: 2 },
      { value: 'occasional_people', label: 'Occasionally does not recognize people', concernLevel: 'moderate', points: 3 },
      { value: 'frequent', label: 'Frequently does not recognize people or places', concernLevel: 'concerning', points: 4 },
    ],
    weight: 5,
    triggerFollowUp: true,
    concernThreshold: ['occasional_people', 'frequent'],
    mocaReference: 'Recognition Memory',
    order: 3,
  },
];

// ============= ORIENTATION DOMAIN (2 questions) =============
const ORIENTATION_QUESTIONS: BaselineQuestion[] = [
  {
    id: 'orientation_1',
    domain: 'orientation',
    questionText: 'How aware is {elderName} of the current date, day of the week, and time of day?',
    caregiverPrompt: 'Ask them what day it is, what month we are in, or what time of day it is during casual conversation.',
    type: 'multiple_choice',
    options: [
      { value: 'fully_aware', label: 'Fully aware of date and time', concernLevel: 'none', points: 0 },
      { value: 'minor_confusion', label: 'Minor confusion (off by a day or two)', concernLevel: 'mild', points: 1 },
      { value: 'moderate_confusion', label: 'Often unsure of day or date', concernLevel: 'moderate', points: 3 },
      { value: 'significant_confusion', label: 'Frequently confused about month or year', concernLevel: 'concerning', points: 4 },
    ],
    weight: 4,
    triggerFollowUp: true,
    concernThreshold: ['moderate_confusion', 'significant_confusion'],
    mocaReference: 'Orientation to Time',
    order: 4,
  },
  {
    id: 'orientation_2',
    domain: 'orientation',
    questionText: 'Does {elderName} know where they are when at home or in familiar places?',
    caregiverPrompt: 'Notice if they seem confused about being in their own home, neighborhood, or places they visit regularly.',
    type: 'multiple_choice',
    options: [
      { value: 'always_knows', label: 'Always knows where they are', concernLevel: 'none', points: 0 },
      { value: 'rarely_confused', label: 'Rarely confused about location', concernLevel: 'mild', points: 1 },
      { value: 'sometimes_confused', label: 'Sometimes confused about location', concernLevel: 'moderate', points: 3 },
      { value: 'often_confused', label: 'Often confused, even at home', concernLevel: 'concerning', points: 4 },
    ],
    weight: 4,
    triggerFollowUp: true,
    concernThreshold: ['sometimes_confused', 'often_confused'],
    mocaReference: 'Orientation to Place',
    order: 5,
  },
];

// ============= ATTENTION DOMAIN (2 questions) =============
const ATTENTION_QUESTIONS: BaselineQuestion[] = [
  {
    id: 'attention_1',
    domain: 'attention',
    questionText: 'Can {elderName} follow along with TV shows, movies, or conversations without losing track?',
    caregiverPrompt: 'Notice if they can follow a plot, remember what happened earlier in the show, or stay engaged in a conversation.',
    type: 'multiple_choice',
    options: [
      { value: 'follows_easily', label: 'Yes, follows without difficulty', concernLevel: 'none', points: 0 },
      { value: 'occasional_confusion', label: 'Usually follows with occasional confusion', concernLevel: 'mild', points: 1 },
      { value: 'often_loses_track', label: 'Often loses track of what is happening', concernLevel: 'moderate', points: 3 },
      { value: 'cannot_follow', label: 'Frequently cannot follow', concernLevel: 'concerning', points: 4 },
    ],
    weight: 3,
    triggerFollowUp: true,
    concernThreshold: ['often_loses_track', 'cannot_follow'],
    mocaReference: 'Attention/Vigilance',
    order: 6,
  },
  {
    id: 'attention_2',
    domain: 'attention',
    questionText: 'Is {elderName} easily distracted during activities or conversations?',
    caregiverPrompt: 'Observe if they can focus on one task or frequently lose focus mid-activity or mid-sentence.',
    type: 'frequency',
    options: [
      { value: 'rarely', label: 'Rarely distracted', concernLevel: 'none', points: 0 },
      { value: 'sometimes', label: 'Sometimes distracted', concernLevel: 'mild', points: 1 },
      { value: 'often', label: 'Often distracted', concernLevel: 'moderate', points: 3 },
      { value: 'very_easily', label: 'Very easily distracted', concernLevel: 'concerning', points: 4 },
    ],
    weight: 3,
    triggerFollowUp: true,
    concernThreshold: ['often', 'very_easily'],
    mocaReference: 'Sustained Attention',
    order: 7,
  },
];

// ============= LANGUAGE DOMAIN (2 questions) =============
const LANGUAGE_QUESTIONS: BaselineQuestion[] = [
  {
    id: 'language_1',
    domain: 'language',
    questionText: 'Does {elderName} have difficulty finding the right words when speaking?',
    caregiverPrompt: 'Notice if they pause often to search for words, use vague terms like "thing" or "that," or struggle to name familiar objects.',
    type: 'frequency',
    options: [
      { value: 'no_difficulty', label: 'No word-finding difficulty', concernLevel: 'none', points: 0 },
      { value: 'occasionally', label: 'Occasionally pauses for words', concernLevel: 'mild', points: 1 },
      { value: 'frequently', label: 'Frequently struggles to find words', concernLevel: 'moderate', points: 3 },
      { value: 'significant', label: 'Significant difficulty expressing thoughts', concernLevel: 'concerning', points: 4 },
    ],
    weight: 4,
    triggerFollowUp: true,
    concernThreshold: ['frequently', 'significant'],
    mocaReference: 'Language/Naming',
    order: 8,
  },
  {
    id: 'language_2',
    domain: 'language',
    questionText: 'Can {elderName} follow multi-step instructions (e.g., "get your coat and then come to the door")?',
    caregiverPrompt: 'Give a simple two-step instruction during daily activities and observe if they complete both steps without reminders.',
    type: 'multiple_choice',
    options: [
      { value: 'follows_all', label: 'Follows all steps easily', concernLevel: 'none', points: 0 },
      { value: 'needs_reminding', label: 'May need reminding of second step', concernLevel: 'mild', points: 1 },
      { value: 'single_step', label: 'Can only follow one step at a time', concernLevel: 'moderate', points: 3 },
      { value: 'difficulty', label: 'Has difficulty with even single instructions', concernLevel: 'concerning', points: 4 },
    ],
    weight: 4,
    triggerFollowUp: true,
    concernThreshold: ['single_step', 'difficulty'],
    mocaReference: 'Verbal Fluency',
    order: 9,
  },
];

// ============= EXECUTIVE FUNCTION DOMAIN (2 questions) =============
const EXECUTIVE_QUESTIONS: BaselineQuestion[] = [
  {
    id: 'executive_1',
    domain: 'executive',
    questionText: 'Has {elderName} shown poor judgment in decisions (financial, safety, or social)?',
    caregiverPrompt: 'Examples include giving money to strangers or scams, leaving the stove on, wearing inappropriate clothing for weather, or making unsafe decisions.',
    type: 'frequency',
    options: [
      { value: 'never', label: 'No poor judgment observed', concernLevel: 'none', points: 0 },
      { value: 'rare', label: 'Rare minor lapses', concernLevel: 'mild', points: 1 },
      { value: 'occasional', label: 'Occasional concerning decisions', concernLevel: 'moderate', points: 3 },
      { value: 'frequent', label: 'Frequent poor judgment', concernLevel: 'concerning', points: 4 },
    ],
    weight: 5,
    triggerFollowUp: true,
    concernThreshold: ['occasional', 'frequent'],
    mocaReference: 'Executive Function',
    order: 10,
  },
  {
    id: 'executive_2',
    domain: 'executive',
    questionText: 'Can {elderName} plan and complete familiar tasks (making a simple meal, managing medication)?',
    caregiverPrompt: 'Consider if they can sequence steps for familiar activities they used to do independently.',
    type: 'multiple_choice',
    options: [
      { value: 'independent', label: 'Completes tasks independently', concernLevel: 'none', points: 0 },
      { value: 'some_help', label: 'Needs occasional reminders', concernLevel: 'mild', points: 1 },
      { value: 'significant_help', label: 'Needs significant assistance to complete', concernLevel: 'moderate', points: 3 },
      { value: 'cannot', label: 'Cannot complete without full assistance', concernLevel: 'concerning', points: 4 },
    ],
    weight: 5,
    triggerFollowUp: true,
    concernThreshold: ['significant_help', 'cannot'],
    mocaReference: 'Planning/Sequencing',
    order: 11,
  },
];

// ============= MOOD & BEHAVIOR DOMAIN (2 questions) =============
const MOOD_BEHAVIOR_QUESTIONS: BaselineQuestion[] = [
  {
    id: 'mood_1',
    domain: 'mood_behavior',
    questionText: 'Has {elderName} shown signs of depression, sadness, or loss of interest in activities they used to enjoy?',
    caregiverPrompt: 'Notice changes in mood, motivation, or withdrawal from hobbies and social activities.',
    type: 'frequency',
    options: [
      { value: 'none', label: 'No signs of depression', concernLevel: 'none', points: 0 },
      { value: 'occasional', label: 'Occasional low mood', concernLevel: 'mild', points: 1 },
      { value: 'frequent', label: 'Frequent sadness or withdrawal', concernLevel: 'moderate', points: 3 },
      { value: 'persistent', label: 'Persistent depression or apathy', concernLevel: 'concerning', points: 4 },
    ],
    weight: 4,
    triggerFollowUp: true,
    concernThreshold: ['frequent', 'persistent'],
    mocaReference: 'Neuropsychiatric Symptoms',
    order: 12,
  },
  {
    id: 'mood_2',
    domain: 'mood_behavior',
    questionText: 'Has {elderName} become more anxious, agitated, or suspicious than before?',
    caregiverPrompt: 'Notice increased worry, restlessness, irritability, or unfounded suspicions about others.',
    type: 'multiple_choice',
    options: [
      { value: 'no_change', label: 'No change in behavior', concernLevel: 'none', points: 0 },
      { value: 'mild_increase', label: 'Slightly more anxious than usual', concernLevel: 'mild', points: 1 },
      { value: 'moderate_increase', label: 'Noticeably more anxious or suspicious', concernLevel: 'moderate', points: 3 },
      { value: 'significant_increase', label: 'Significantly agitated or paranoid', concernLevel: 'concerning', points: 4 },
    ],
    weight: 4,
    triggerFollowUp: true,
    concernThreshold: ['moderate_increase', 'significant_increase'],
    mocaReference: 'Behavioral Changes',
    order: 13,
  },
];

// ============= Exported Question Bank =============
export const BASELINE_QUESTIONS: BaselineQuestion[] = [
  ...MEMORY_QUESTIONS,
  ...ORIENTATION_QUESTIONS,
  ...ATTENTION_QUESTIONS,
  ...LANGUAGE_QUESTIONS,
  ...EXECUTIVE_QUESTIONS,
  ...MOOD_BEHAVIOR_QUESTIONS,
];

// ============= Questions by Domain =============
export const QUESTIONS_BY_DOMAIN: Record<AssessmentDomain, BaselineQuestion[]> = {
  memory: MEMORY_QUESTIONS,
  orientation: ORIENTATION_QUESTIONS,
  attention: ATTENTION_QUESTIONS,
  language: LANGUAGE_QUESTIONS,
  executive: EXECUTIVE_QUESTIONS,
  mood_behavior: MOOD_BEHAVIOR_QUESTIONS,
};

// ============= Helper Functions =============

/**
 * Get question by ID
 */
export function getQuestionById(questionId: string): BaselineQuestion | undefined {
  return BASELINE_QUESTIONS.find(q => q.id === questionId);
}

/**
 * Get questions for a specific domain
 */
export function getQuestionsForDomain(domain: AssessmentDomain): BaselineQuestion[] {
  return QUESTIONS_BY_DOMAIN[domain] || [];
}

/**
 * Get next baseline question in sequence
 */
export function getNextBaselineQuestion(
  currentQuestionId: string | null,
  answeredQuestionIds: string[]
): BaselineQuestion | null {
  if (!currentQuestionId) {
    // Start with first question
    return BASELINE_QUESTIONS[0] || null;
  }

  const currentIndex = BASELINE_QUESTIONS.findIndex(q => q.id === currentQuestionId);
  if (currentIndex === -1) {
    return null;
  }

  // Find next unanswered question
  for (let i = currentIndex + 1; i < BASELINE_QUESTIONS.length; i++) {
    if (!answeredQuestionIds.includes(BASELINE_QUESTIONS[i].id)) {
      return BASELINE_QUESTIONS[i];
    }
  }

  return null; // All questions answered
}

/**
 * Replace {elderName} placeholder in question text
 */
export function formatQuestionText(question: BaselineQuestion, elderName: string): string {
  return question.questionText.replace(/{elderName}/g, elderName);
}

/**
 * Check if an answer should trigger AI follow-up
 */
export function shouldTriggerFollowUp(
  question: BaselineQuestion,
  answer: string
): boolean {
  return question.triggerFollowUp && question.concernThreshold.includes(answer);
}

/**
 * Get concern level for an answer
 */
export function getConcernLevelForAnswer(
  question: BaselineQuestion,
  answer: string
): { concernLevel: import('@/types/dementiaAssessment').ConcernLevel; points: number } {
  const option = question.options.find(o => o.value === answer);
  return {
    concernLevel: option?.concernLevel || 'none',
    points: option?.points || 0,
  };
}

/**
 * Calculate max possible score for a domain
 */
export function getMaxScoreForDomain(domain: AssessmentDomain): number {
  const questions = QUESTIONS_BY_DOMAIN[domain] || [];
  return questions.reduce((sum, q) => {
    const maxPoints = Math.max(...q.options.map(o => o.points));
    return sum + maxPoints * q.weight;
  }, 0);
}

/**
 * Get total number of baseline questions
 */
export function getTotalBaselineQuestions(): number {
  return BASELINE_QUESTIONS.length;
}
