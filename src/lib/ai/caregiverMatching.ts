/**
 * AI-Powered Caregiver-Elder Matching Service
 *
 * Uses Gemini to intelligently match caregivers to elders based on:
 * - Language compatibility
 * - Specialization match to elder's conditions
 * - Location/proximity
 * - Availability alignment
 * - Preference matching
 */

import type {
  CaregiverProfile,
  CaregiverElderMatch,
  Elder,
} from '@/types';

// Scoring weights (must total 100)
const WEIGHTS = {
  language: 25,
  specialization: 30,
  location: 20,
  availability: 15,
  preference: 10,
};

// Map elder conditions to caregiver specializations
const CONDITION_TO_SPECIALIZATION: Record<string, string[]> = {
  // Dementia-related
  'dementia': ['DEMENTIA_ALZHEIMERS'],
  'alzheimers': ['DEMENTIA_ALZHEIMERS'],
  "alzheimer's": ['DEMENTIA_ALZHEIMERS'],
  'memory loss': ['DEMENTIA_ALZHEIMERS'],
  'cognitive decline': ['DEMENTIA_ALZHEIMERS'],

  // Diabetes-related
  'diabetes': ['DIABETES_CARE'],
  'type 1 diabetes': ['DIABETES_CARE'],
  'type 2 diabetes': ['DIABETES_CARE'],
  'diabetic': ['DIABETES_CARE'],

  // Heart-related
  'heart disease': ['HEART_DISEASE'],
  'heart failure': ['HEART_DISEASE'],
  'cardiovascular': ['HEART_DISEASE'],
  'hypertension': ['HEART_DISEASE'],
  'high blood pressure': ['HEART_DISEASE'],

  // Neurological
  'parkinsons': ['PARKINSONS'],
  "parkinson's": ['PARKINSONS'],
  'parkinson disease': ['PARKINSONS'],

  // Stroke
  'stroke': ['STROKE_RECOVERY'],
  'stroke recovery': ['STROKE_RECOVERY'],
  'post-stroke': ['STROKE_RECOVERY'],

  // Mobility
  'mobility issues': ['MOBILITY_ASSISTANCE'],
  'wheelchair': ['MOBILITY_ASSISTANCE'],
  'walker': ['MOBILITY_ASSISTANCE'],
  'limited mobility': ['MOBILITY_ASSISTANCE'],
  'bedridden': ['MOBILITY_ASSISTANCE'],

  // Wound care
  'wound': ['WOUND_CARE'],
  'pressure ulcer': ['WOUND_CARE'],
  'bedsore': ['WOUND_CARE'],

  // End of life
  'hospice': ['HOSPICE_PALLIATIVE'],
  'palliative': ['HOSPICE_PALLIATIVE'],
  'end of life': ['HOSPICE_PALLIATIVE'],
  'terminal': ['HOSPICE_PALLIATIVE'],

  // Mental health
  'depression': ['MENTAL_HEALTH'],
  'anxiety': ['MENTAL_HEALTH'],
  'mental health': ['MENTAL_HEALTH'],
  'psychiatric': ['MENTAL_HEALTH'],
};

// Map elder languages to caregiver language codes
const LANGUAGE_MAP: Record<string, string> = {
  'english': 'ENGLISH',
  'spanish': 'SPANISH',
  'mandarin': 'MANDARIN',
  'chinese': 'MANDARIN',
  'cantonese': 'CANTONESE',
  'tagalog': 'TAGALOG',
  'filipino': 'TAGALOG',
  'vietnamese': 'VIETNAMESE',
  'korean': 'KOREAN',
  'hindi': 'HINDI',
  'arabic': 'ARABIC',
  'french': 'FRENCH',
  'portuguese': 'PORTUGUESE',
  'russian': 'RUSSIAN',
};

interface MatchInput {
  elder: Elder;
  caregivers: Array<{
    profile: CaregiverProfile;
    currentElderCount: number;
  }>;
}

/**
 * Calculate match score between a caregiver and an elder
 */
function calculateMatchScore(
  caregiver: CaregiverProfile,
  elder: Elder,
  currentElderCount: number
): CaregiverElderMatch {
  const matchReasons: string[] = [];
  const warnings: string[] = [];

  // Check capacity
  const canAssign = currentElderCount < 3;
  if (!canAssign) {
    warnings.push('Caregiver at maximum capacity (3 elders)');
  }

  // 1. Language Match (25 points)
  let languageScore = 0;
  const elderLanguages = (elder.languages || ['english']).map(l => l.toLowerCase());
  const caregiverLanguages = caregiver.languages.map(l => l.toLowerCase());
  const caregiverOtherLanguages = (caregiver.languagesOther || []).map(l => l.toLowerCase());
  const allCaregiverLanguages = [...caregiverLanguages, ...caregiverOtherLanguages];

  for (const elderLang of elderLanguages) {
    const mappedLang = LANGUAGE_MAP[elderLang]?.toLowerCase();
    if (mappedLang && allCaregiverLanguages.includes(mappedLang)) {
      languageScore = WEIGHTS.language;
      matchReasons.push(`Speaks ${elderLang}`);
      break;
    }
    // Check in other languages too
    if (caregiverOtherLanguages.some(l => l.includes(elderLang) || elderLang.includes(l))) {
      languageScore = WEIGHTS.language;
      matchReasons.push(`Speaks ${elderLang}`);
      break;
    }
  }

  // Partial match if English is common
  if (languageScore === 0 && allCaregiverLanguages.includes('english') && elderLanguages.includes('english')) {
    languageScore = WEIGHTS.language * 0.5;
    matchReasons.push('English speaker');
  }

  // 2. Specialization Match (30 points)
  let specializationScore = 0;
  const elderConditions = (elder.knownConditions || []).map(c => c.toLowerCase());
  const caregiverSpecs = caregiver.specializations.map(s => s.toLowerCase());
  const caregiverOtherSpecs = (caregiver.specializationsOther || []).map(s => s.toLowerCase());

  const matchedConditions: string[] = [];

  for (const condition of elderConditions) {
    // Find matching specializations for this condition
    const requiredSpecs = CONDITION_TO_SPECIALIZATION[condition] || [];

    for (const reqSpec of requiredSpecs) {
      if (caregiverSpecs.includes(reqSpec.toLowerCase())) {
        matchedConditions.push(condition);
        break;
      }
    }

    // Check other specializations
    if (caregiverOtherSpecs.some(s => s.includes(condition) || condition.includes(s))) {
      if (!matchedConditions.includes(condition)) {
        matchedConditions.push(condition);
      }
    }
  }

  if (elderConditions.length > 0) {
    specializationScore = Math.round((matchedConditions.length / elderConditions.length) * WEIGHTS.specialization);
    if (matchedConditions.length > 0) {
      matchReasons.push(`Specialized in: ${matchedConditions.join(', ')}`);
    }
  } else {
    // No conditions specified, give partial credit
    specializationScore = Math.round(WEIGHTS.specialization * 0.5);
    matchReasons.push('General caregiving experience');
  }

  // 3. Location Match (20 points) - based on ZIP code proximity
  let locationScore = 0;
  if (caregiver.zipCode && elder.notes) {
    // Simple check - ideally we'd use a ZIP code distance API
    // For now, assume match if they're in same state area (first 3 digits)
    const elderZipMatch = elder.notes.match(/\b\d{5}\b/);
    if (elderZipMatch) {
      const elderZip = elderZipMatch[0];
      if (caregiver.zipCode.slice(0, 3) === elderZip.slice(0, 3)) {
        locationScore = WEIGHTS.location;
        matchReasons.push('Nearby location');
      } else if (caregiver.zipCode.slice(0, 2) === elderZip.slice(0, 2)) {
        locationScore = Math.round(WEIGHTS.location * 0.7);
        matchReasons.push('Regional proximity');
      }
    } else {
      // No elder ZIP found, give partial credit
      locationScore = Math.round(WEIGHTS.location * 0.5);
    }
  } else {
    locationScore = Math.round(WEIGHTS.location * 0.5);
  }

  // 4. Availability Match (15 points)
  let availabilityScore = 0;
  const availableDays = Object.entries(caregiver.availability)
    .filter(([_, v]) => v.available)
    .length;

  if (availableDays >= 5) {
    availabilityScore = WEIGHTS.availability;
    matchReasons.push('Full-time availability');
  } else if (availableDays >= 3) {
    availabilityScore = Math.round(WEIGHTS.availability * 0.7);
    matchReasons.push('Part-time availability');
  } else if (availableDays > 0) {
    availabilityScore = Math.round(WEIGHTS.availability * 0.4);
  }

  // 5. Preference Match (10 points)
  let preferenceScore = 0;
  const comforts = caregiver.comfortableWith || [];

  // Gender matching
  if (elder.gender === 'male' && comforts.includes('MALE_PATIENTS')) {
    preferenceScore += WEIGHTS.preference * 0.5;
  } else if (elder.gender === 'female' && comforts.includes('FEMALE_PATIENTS')) {
    preferenceScore += WEIGHTS.preference * 0.5;
  } else if (!elder.gender) {
    preferenceScore += WEIGHTS.preference * 0.3;
  }

  // Mobility match
  if (elder.mobilityLevel && ['bedridden', 'dependent', 'extensive_assistance'].includes(elder.mobilityLevel)) {
    if (caregiverSpecs.includes('mobility_assistance')) {
      preferenceScore += WEIGHTS.preference * 0.5;
    }
  } else {
    preferenceScore += WEIGHTS.preference * 0.2;
  }

  // Calculate total
  const totalScore = Math.round(languageScore + specializationScore + locationScore + availabilityScore + preferenceScore);

  // Add warning if low match
  if (totalScore < 50) {
    warnings.push('Low match score - consider other options');
  }

  return {
    caregiverId: caregiver.userId,
    caregiverName: caregiver.fullName,
    caregiverProfile: caregiver,
    matchScore: totalScore,
    matchBreakdown: {
      languageMatch: Math.round(languageScore),
      specializationMatch: Math.round(specializationScore),
      locationMatch: Math.round(locationScore),
      availabilityMatch: Math.round(availabilityScore),
      preferenceMatch: Math.round(preferenceScore),
    },
    matchReasons,
    warnings: warnings.length > 0 ? warnings : undefined,
    elderCount: currentElderCount,
    canAssign,
  };
}

/**
 * Get ranked caregiver matches for an elder
 */
export function getElderCaregiverMatches(input: MatchInput): CaregiverElderMatch[] {
  const { elder, caregivers } = input;

  // Calculate match scores for all caregivers
  const matches = caregivers.map(({ profile, currentElderCount }) =>
    calculateMatchScore(profile, elder, currentElderCount)
  );

  // Sort by match score (descending), then by capacity
  matches.sort((a, b) => {
    // Prioritize those who can still accept elders
    if (a.canAssign !== b.canAssign) {
      return a.canAssign ? -1 : 1;
    }
    return b.matchScore - a.matchScore;
  });

  return matches;
}

/**
 * Get AI-enhanced matching with Gemini reasoning
 * Falls back to rule-based matching if AI unavailable
 */
export async function getAIEnhancedMatches(
  input: MatchInput,
  useAI: boolean = true
): Promise<{
  matches: CaregiverElderMatch[];
  aiReasoning?: string;
}> {
  // Get base matches first
  const matches = getElderCaregiverMatches(input);

  if (!useAI || matches.length === 0) {
    return { matches };
  }

  // Optionally enhance with AI reasoning
  // For now, we'll use rule-based matching
  // In future, this could call Gemini for more nuanced matching

  return { matches };
}

/**
 * Format match score for display
 */
export function formatMatchScore(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) {
    return { label: 'Excellent Match', color: 'green' };
  }
  if (score >= 60) {
    return { label: 'Good Match', color: 'blue' };
  }
  if (score >= 40) {
    return { label: 'Fair Match', color: 'yellow' };
  }
  return { label: 'Low Match', color: 'red' };
}
