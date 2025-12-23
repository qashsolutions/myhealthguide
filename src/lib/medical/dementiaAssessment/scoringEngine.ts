/**
 * Dementia Assessment Scoring Engine
 *
 * Calculates domain scores and overall risk level based on assessment answers.
 * Uses weighted scoring with concern level thresholds.
 */

import type {
  DementiaAssessmentSession,
  QuestionAnswer,
  DomainScore,
  AssessmentDomain,
  OverallRiskLevel,
  ConcernLevel,
} from '@/types/dementiaAssessment';
import { DOMAIN_LABELS, DOMAIN_ORDER } from '@/types/dementiaAssessment';
import { QUESTIONS_BY_DOMAIN, getMaxScoreForDomain } from './questionBank';

// ============= Domain Score Calculation =============

/**
 * Calculate scores for all domains
 */
export function calculateDomainScores(
  session: DementiaAssessmentSession
): DomainScore[] {
  const scores: DomainScore[] = [];

  for (const domain of DOMAIN_ORDER) {
    const domainScore = calculateSingleDomainScore(session, domain);
    scores.push(domainScore);
  }

  return scores;
}

/**
 * Calculate score for a single domain
 */
function calculateSingleDomainScore(
  session: DementiaAssessmentSession,
  domain: AssessmentDomain
): DomainScore {
  const domainAnswers = session.answers.filter(a => a.domain === domain);
  const domainQuestions = QUESTIONS_BY_DOMAIN[domain] || [];

  // Calculate raw score (sum of points * weight)
  let rawScore = 0;
  let maxPossibleScore = 0;
  let concerningAnswers = 0;
  const keyFindings: string[] = [];

  for (const question of domainQuestions) {
    const answer = domainAnswers.find(a => a.questionId === question.id && !a.isAdaptive);
    if (answer) {
      rawScore += answer.points * question.weight;

      if (answer.concernLevel === 'concerning' || answer.concernLevel === 'moderate') {
        concerningAnswers++;
        keyFindings.push(`${answer.answerLabel} (${answer.concernLevel})`);
      }
    }

    // Calculate max possible for this question
    const maxPoints = Math.max(...question.options.map(o => o.points));
    maxPossibleScore += maxPoints * question.weight;
  }

  // Also consider adaptive questions for this domain
  const adaptiveAnswers = domainAnswers.filter(a => a.isAdaptive);
  for (const answer of adaptiveAnswers) {
    if (answer.concernLevel === 'concerning' || answer.concernLevel === 'moderate') {
      concerningAnswers++;
      keyFindings.push(`[Follow-up] ${answer.answerLabel} (${answer.concernLevel})`);
    }
  }

  // Normalize to 0-100 scale
  const normalizedScore = maxPossibleScore > 0
    ? Math.round((rawScore / maxPossibleScore) * 100)
    : 0;

  // Determine concern level for domain
  const concernLevel = getDomainConcernLevel(normalizedScore, concerningAnswers, domainQuestions.length);

  return {
    domain,
    domainLabel: DOMAIN_LABELS[domain],
    rawScore,
    maxPossibleScore,
    normalizedScore,
    concernLevel,
    questionsAsked: domainAnswers.length,
    concerningAnswers,
    keyFindings: keyFindings.slice(0, 3), // Top 3 findings
  };
}

/**
 * Determine concern level for a domain based on score and answer patterns
 */
function getDomainConcernLevel(
  normalizedScore: number,
  concerningAnswers: number,
  totalQuestions: number
): ConcernLevel {
  // High normalized score means more concerning answers
  const concernRatio = totalQuestions > 0 ? concerningAnswers / totalQuestions : 0;

  if (normalizedScore >= 75 || concernRatio >= 0.5) {
    return 'concerning';
  } else if (normalizedScore >= 50 || concernRatio >= 0.3) {
    return 'moderate';
  } else if (normalizedScore >= 25 || concernRatio >= 0.15) {
    return 'mild';
  }

  return 'none';
}

// ============= Overall Risk Calculation =============

/**
 * Calculate overall risk score and level
 */
export function calculateOverallRisk(
  domainScores: DomainScore[]
): { score: number; level: OverallRiskLevel } {
  if (domainScores.length === 0) {
    return { score: 0, level: 'low' };
  }

  // Weighted average of domain scores
  // Priority domains (memory, orientation, executive) have higher weight
  const domainWeights: Record<AssessmentDomain, number> = {
    memory: 1.5,
    orientation: 1.3,
    executive: 1.3,
    attention: 1.0,
    language: 1.0,
    mood_behavior: 0.8,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const score of domainScores) {
    const weight = domainWeights[score.domain] || 1.0;
    weightedSum += score.normalizedScore * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Determine risk level
  const level = calculateRiskLevel(overallScore, domainScores);

  return { score: overallScore, level };
}

/**
 * Calculate risk level based on score and domain patterns
 */
function calculateRiskLevel(
  overallScore: number,
  domainScores: DomainScore[]
): OverallRiskLevel {
  const concerningDomains = domainScores.filter(d => d.concernLevel === 'concerning').length;
  const moderateDomains = domainScores.filter(d => d.concernLevel === 'moderate').length;

  // Check for high-priority domain concerns
  const memoryScore = domainScores.find(d => d.domain === 'memory');
  const orientationScore = domainScores.find(d => d.domain === 'orientation');
  const executiveScore = domainScores.find(d => d.domain === 'executive');

  // URGENT: Memory AND orientation both concerning
  if (
    memoryScore?.concernLevel === 'concerning' &&
    orientationScore?.concernLevel === 'concerning'
  ) {
    return 'urgent';
  }

  // CONCERNING: High overall score or multiple concerning domains
  if (overallScore >= 65 || concerningDomains >= 2) {
    return 'concerning';
  }

  // CONCERNING: Any priority domain is concerning
  if (
    memoryScore?.concernLevel === 'concerning' ||
    orientationScore?.concernLevel === 'concerning' ||
    executiveScore?.concernLevel === 'concerning'
  ) {
    return 'concerning';
  }

  // MODERATE: Moderate overall score or some concerning patterns
  if (
    overallScore >= 40 ||
    concerningDomains >= 1 ||
    moderateDomains >= 2
  ) {
    return 'moderate';
  }

  // MODERATE: Any priority domain is moderate
  if (
    memoryScore?.concernLevel === 'moderate' ||
    orientationScore?.concernLevel === 'moderate'
  ) {
    return 'moderate';
  }

  return 'low';
}

// ============= Key Findings & Observations =============

/**
 * Identify key observations from the assessment
 */
export function identifyKeyObservations(
  session: DementiaAssessmentSession,
  domainScores: DomainScore[]
): {
  keyObservations: string[];
  areasOfConcern: string[];
  strengthsNoted: string[];
} {
  const keyObservations: string[] = [];
  const areasOfConcern: string[] = [];
  const strengthsNoted: string[] = [];

  for (const score of domainScores) {
    if (score.concernLevel === 'concerning') {
      areasOfConcern.push(
        `${score.domainLabel}: Significant concerns noted (${score.concerningAnswers} concerning responses)`
      );

      if (score.keyFindings.length > 0) {
        keyObservations.push(
          `In ${score.domainLabel.toLowerCase()}: ${score.keyFindings[0]}`
        );
      }
    } else if (score.concernLevel === 'moderate') {
      areasOfConcern.push(
        `${score.domainLabel}: Some concerns noted`
      );
    } else if (score.concernLevel === 'none') {
      strengthsNoted.push(
        `${score.domainLabel}: No significant concerns`
      );
    }
  }

  // Add observations about patterns
  const concerningAnswers = session.answers.filter(
    a => a.concernLevel === 'concerning'
  );

  if (concerningAnswers.length >= 5) {
    keyObservations.push(
      `Multiple concerning responses across ${concerningAnswers.length} questions`
    );
  }

  const adaptiveCount = session.adaptiveQuestionsAsked;
  if (adaptiveCount >= 5) {
    keyObservations.push(
      `${adaptiveCount} follow-up questions were generated to explore concerns`
    );
  }

  return { keyObservations, areasOfConcern, strengthsNoted };
}

// ============= Comparison with Previous Assessment =============

/**
 * Compare current assessment with a previous one
 */
export function compareWithPrevious(
  currentScores: DomainScore[],
  previousScores: DomainScore[]
): {
  overallTrend: 'improved' | 'stable' | 'declined';
  domainChanges: { domain: AssessmentDomain; change: number }[];
  summary: string;
} {
  const domainChanges: { domain: AssessmentDomain; change: number }[] = [];
  let totalChange = 0;

  for (const current of currentScores) {
    const previous = previousScores.find(p => p.domain === current.domain);
    if (previous) {
      // Positive change means worsening (higher score = more concerns)
      const change = current.normalizedScore - previous.normalizedScore;
      domainChanges.push({ domain: current.domain, change });
      totalChange += change;
    }
  }

  const avgChange = domainChanges.length > 0
    ? totalChange / domainChanges.length
    : 0;

  let overallTrend: 'improved' | 'stable' | 'declined';
  let summary: string;

  if (avgChange <= -10) {
    overallTrend = 'improved';
    summary = 'Overall improvement noted compared to previous assessment.';
  } else if (avgChange >= 10) {
    overallTrend = 'declined';
    summary = 'Some decline noted compared to previous assessment. Consider discussing with healthcare provider.';
  } else {
    overallTrend = 'stable';
    summary = 'Results are relatively stable compared to previous assessment.';
  }

  // Add specific domain changes to summary
  const significantDeclines = domainChanges.filter(d => d.change >= 15);
  if (significantDeclines.length > 0) {
    const domains = significantDeclines
      .map(d => DOMAIN_LABELS[d.domain])
      .join(', ');
    summary += ` Notable changes in: ${domains}.`;
  }

  return { overallTrend, domainChanges, summary };
}

// ============= Score Interpretation Helpers =============

/**
 * Get risk level color for UI
 */
export function getRiskLevelColor(level: OverallRiskLevel): string {
  switch (level) {
    case 'urgent':
      return 'red';
    case 'concerning':
      return 'orange';
    case 'moderate':
      return 'yellow';
    case 'low':
      return 'green';
  }
}

/**
 * Get risk level description
 */
export function getRiskLevelDescription(level: OverallRiskLevel): string {
  switch (level) {
    case 'urgent':
      return 'Urgent: Multiple significant concerns identified. Strongly recommend professional cognitive assessment.';
    case 'concerning':
      return 'Concerning: Notable concerns identified in key areas. Professional evaluation recommended.';
    case 'moderate':
      return 'Moderate: Some areas of concern noted. Consider discussing with healthcare provider.';
    case 'low':
      return 'Low: No significant concerns identified. Continue regular monitoring.';
  }
}

/**
 * Get concern level color
 */
export function getConcernLevelColor(level: ConcernLevel): string {
  switch (level) {
    case 'concerning':
      return 'red';
    case 'moderate':
      return 'yellow';
    case 'mild':
      return 'blue';
    case 'none':
      return 'green';
  }
}
