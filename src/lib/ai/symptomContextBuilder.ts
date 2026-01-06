/**
 * Symptom Context Builder Service
 *
 * Builds comprehensive patient context for AI symptom assessment.
 * Considers age, gender, lifestyle, and other factors to provide
 * tailored medical considerations.
 *
 * Reusable across AI features: symptom checker, health chat, drug interactions, etc.
 */

import type { Gender, DietType, AlcoholUse, ActivityLevel } from '@/types/symptomChecker';

export interface PatientProfile {
  age: number;
  gender: Gender;
  medications?: string;
  knownConditions?: string;
  dietType?: DietType;
  smoker?: boolean;
  alcoholUse?: AlcoholUse;
  activityLevel?: ActivityLevel;
  // Additional context
  isCaregiverReporting?: boolean; // Caregiver reporting on behalf of patient
  recentHospitalization?: boolean;
  livesAlone?: boolean;
}

export interface SymptomContext {
  patientInfo: string;
  ageConsiderations: string;
  genderConsiderations: string;
  lifestyleConsiderations: string;
  specialConsiderations: string;
  fullContext: string; // Combined prompt-ready string
}

/**
 * Build comprehensive symptom context for AI prompts
 */
export function buildSymptomContext(profile: PatientProfile): SymptomContext {
  const patientInfo = buildPatientInfo(profile);
  const ageConsiderations = buildAgeConsiderations(profile);
  const genderConsiderations = buildGenderConsiderations(profile);
  const lifestyleConsiderations = buildLifestyleConsiderations(profile);
  const specialConsiderations = buildSpecialConsiderations(profile);

  // Combine all sections into full context
  const sections = [
    patientInfo,
    ageConsiderations,
    genderConsiderations,
    lifestyleConsiderations,
    specialConsiderations,
  ].filter(Boolean);

  return {
    patientInfo,
    ageConsiderations,
    genderConsiderations,
    lifestyleConsiderations,
    specialConsiderations,
    fullContext: sections.join('\n'),
  };
}

/**
 * Build basic patient information section
 */
function buildPatientInfo(profile: PatientProfile): string {
  const lines = [
    'PATIENT INFORMATION:',
    `- Age: ${profile.age} years`,
    `- Gender: ${formatGender(profile.gender)}`,
  ];

  if (profile.medications) {
    lines.push(`- Current Medications: ${profile.medications}`);
  }
  if (profile.knownConditions) {
    lines.push(`- Known Health Conditions: ${profile.knownConditions}`);
  }
  if (profile.dietType) {
    lines.push(`- Diet Type: ${formatDietType(profile.dietType)}`);
  }
  if (profile.smoker !== undefined) {
    lines.push(`- Smoking: ${profile.smoker ? 'Yes' : 'No'}`);
  }
  if (profile.alcoholUse) {
    lines.push(`- Alcohol Use: ${profile.alcoholUse}`);
  }
  if (profile.activityLevel) {
    lines.push(`- Activity Level: ${profile.activityLevel}`);
  }

  return lines.join('\n');
}

/**
 * Build age-specific considerations
 */
function buildAgeConsiderations(profile: PatientProfile): string {
  const { age } = profile;

  // Elderly patients (65+)
  if (age >= 65) {
    const lines = [
      '',
      'ELDERLY PATIENT CONSIDERATIONS (Age 65+):',
      '- ATYPICAL PRESENTATIONS: Symptoms often present differently in elderly:',
      '  * Infections may not cause fever',
      '  * Heart attacks may present as fatigue, confusion, or shortness of breath rather than chest pain',
      '  * UTIs commonly cause confusion/delirium rather than urinary symptoms',
      '  * Depression may present as physical complaints or cognitive changes',
      '',
      '- POLYPHARMACY AWARENESS:',
      '  * Multiple medications increase drug interaction risk',
      '  * Side effects may mimic new symptoms',
      '  * Always consider medication as potential cause',
      '',
      '- FALL RISK: Any dizziness, weakness, or balance issues require careful evaluation',
      '',
      '- DEHYDRATION: Common and underrecognized - can cause confusion, weakness, falls',
      '',
      '- SKIN FRAGILITY: Bruising and skin tears occur more easily',
      '',
      '- MALNUTRITION RISK: Consider if symptoms relate to poor nutrition',
      '',
      '- COGNITIVE FACTORS:',
      '  * Patient may have difficulty describing symptoms accurately',
      '  * Memory issues may affect symptom history',
      '  * Caregiver observations are valuable',
    ];

    // Add very elderly considerations (80+)
    if (age >= 80) {
      lines.push(
        '',
        '- VERY ELDERLY (80+) ADDITIONAL FACTORS:',
        '  * Higher frailty risk - even minor illnesses can have serious impact',
        '  * Slower recovery expected',
        '  * Quality of life considerations important',
        '  * End-of-life preferences may be relevant for serious conditions'
      );
    }

    // Add specific age-related conditions
    if (age >= 70) {
      lines.push(
        '',
        '- AGE-RELATED CONDITIONS TO CONSIDER:',
        '  * Osteoarthritis and joint pain',
        '  * Vision and hearing changes',
        '  * Constipation (very common)',
        '  * Sleep disturbances',
        '  * Urinary issues (incontinence, frequency)'
      );
    }

    return lines.join('\n');
  }

  // Middle-aged adults (50-64)
  if (age >= 50) {
    return `
MIDDLE-AGED ADULT CONSIDERATIONS (Age 50-64):
- Increased cardiovascular risk - be alert for cardiac symptoms
- Cancer screening age - consider if symptoms could indicate need for screening
- Hormonal changes (menopause for women, andropause for men)
- Beginning of age-related conditions (arthritis, vision changes)
- Work stress and lifestyle diseases more common`;
  }

  // Younger adults don't need special age considerations
  return '';
}

/**
 * Build gender-specific considerations
 */
function buildGenderConsiderations(profile: PatientProfile): string {
  const { gender, age } = profile;

  if (gender === 'female') {
    const lines = [
      '',
      'FEMALE PATIENT CONSIDERATIONS:',
      '',
      '- CARDIOVASCULAR:',
      '  * Heart attack symptoms often DIFFER from men',
      '  * May present as: fatigue, nausea, jaw pain, back pain, shortness of breath',
      '  * Classic chest pain less common in women',
      '  * Cardiovascular disease is #1 killer of women - take symptoms seriously',
    ];

    // Reproductive age considerations
    if (age < 55) {
      lines.push(
        '',
        '- REPRODUCTIVE HEALTH:',
        '  * Consider menstrual cycle impact on symptoms',
        '  * Ovarian cysts, endometriosis, fibroids can cause abdominal/pelvic pain',
        '  * Ectopic pregnancy if reproductive age with abdominal pain (emergency)',
        '  * PMS/PMDD can cause various physical symptoms'
      );
    }

    // Perimenopause/Menopause
    if (age >= 40 && age <= 60) {
      lines.push(
        '',
        '- PERIMENOPAUSE/MENOPAUSE (Ages 40-60):',
        '  * Hot flashes, night sweats, sleep disturbances',
        '  * Mood changes, anxiety, depression',
        '  * Joint pain and muscle aches',
        '  * Vaginal dryness, UTI frequency',
        '  * Irregular periods (perimenopause)'
      );
    }

    // Post-menopausal
    if (age >= 50) {
      lines.push(
        '',
        '- POST-MENOPAUSAL CONSIDERATIONS:',
        '  * Osteoporosis risk - fractures from minor falls',
        '  * Increased cardiovascular risk',
        '  * Vaginal atrophy - UTI susceptibility',
        '  * Breast health awareness'
      );
    }

    lines.push(
      '',
      '- OTHER FEMALE-SPECIFIC:',
      '  * Higher UTI risk - consider with any urinary or abdominal symptoms',
      '  * Autoimmune conditions more common (lupus, RA, thyroid)',
      '  * Thyroid disorders (hypo/hyperthyroidism) - fatigue, weight changes, mood',
      '  * Migraines more common in women',
      '  * Pelvic floor issues (incontinence, prolapse) especially after childbirth or with age',
      '  * Breast-related symptoms warrant evaluation'
    );

    return lines.join('\n');
  }

  if (gender === 'male') {
    const lines = [
      '',
      'MALE PATIENT CONSIDERATIONS:',
      '',
      '- CARDIOVASCULAR:',
      '  * Higher baseline cardiovascular disease risk',
      '  * Classic heart attack presentation more common but atypical still possible',
      '  * Erectile dysfunction can be early indicator of cardiovascular disease',
      '  * Take chest pain, shortness of breath very seriously',
    ];

    // Prostate considerations
    if (age >= 40) {
      lines.push(
        '',
        '- PROSTATE HEALTH:',
        `  * Prostate issues increasingly common${age >= 50 ? ' (especially after 50)' : ''}`,
        '  * BPH (benign prostatic hyperplasia): urinary frequency, weak stream, nighttime urination',
        '  * Prostatitis: pelvic pain, urinary symptoms, fever',
        '  * Prostate cancer screening discussions appropriate'
      );
    }

    lines.push(
      '',
      '- MALE-SPECIFIC CONSIDERATIONS:',
      '  * Men often underreport pain and symptoms - probe for details',
      '  * May delay seeking care - symptoms could be more advanced',
      '  * Testicular issues: pain, swelling, lumps warrant prompt evaluation',
      '  * Hernias: inguinal hernias more common - abdominal/groin bulge or pain',
      '  * Gout more common in men - sudden joint pain especially big toe'
    );

    // Older male considerations
    if (age >= 60) {
      lines.push(
        '',
        '- OLDER MALE CONSIDERATIONS:',
        '  * Testosterone decline: fatigue, mood changes, decreased muscle mass',
        '  * Osteoporosis (often overlooked in men)',
        '  * Abdominal aortic aneurysm risk (especially if smoker)'
      );
    }

    return lines.join('\n');
  }

  // Non-binary, other, or prefer not to say
  if (gender === 'other' || gender === 'prefer_not_to_say') {
    return `
INCLUSIVE PATIENT CONSIDERATIONS:
- Patient has indicated gender as "${formatGender(gender)}"
- IMPORTANT: Consider full range of possible conditions regardless of gender presentation
- Ask clarifying questions if specific anatomy is relevant to symptoms
- Consider both traditionally "male" and "female" conditions as appropriate
- If patient is transgender:
  * Hormone therapy may affect symptom presentation and lab values
  * May have anatomy different from gender identity
  * Respect identity while ensuring comprehensive medical consideration
  * Some patients may have had gender-affirming surgeries affecting anatomy
- Patient may have experienced healthcare discrimination - maintain trust through respectful care
- Focus on symptoms presented without assumptions about anatomy`;
  }

  return '';
}

/**
 * Build lifestyle-specific considerations
 */
function buildLifestyleConsiderations(profile: PatientProfile): string {
  const lines: string[] = [];
  const { smoker, alcoholUse, activityLevel, dietType, age } = profile;

  // Smoking
  if (smoker === true) {
    lines.push(
      '',
      '- SMOKER:',
      '  * Increased risk: lung conditions, COPD, cardiovascular disease, cancer',
      '  * Respiratory symptoms warrant careful evaluation',
      '  * Wound healing may be impaired',
      '  * Consider smoking cessation discussion'
    );
  }

  // Alcohol
  if (alcoholUse === 'regular') {
    lines.push(
      '',
      '- REGULAR ALCOHOL USE:',
      '  * Consider liver-related symptoms',
      '  * GI issues (gastritis, reflux) more common',
      '  * Medication interactions possible',
      '  * Withdrawal symptoms if suddenly stopped'
    );
  }

  // Sedentary lifestyle
  if (activityLevel === 'sedentary') {
    lines.push(
      '',
      '- SEDENTARY LIFESTYLE:',
      '  * Higher risk: cardiovascular disease, diabetes, obesity-related conditions',
      '  * DVT (blood clots) risk if immobile',
      '  * Muscle weakness and deconditioning',
      '  * Joint stiffness'
    );
  }

  // Diet considerations
  if (dietType === 'diabetic_friendly') {
    lines.push(
      '',
      '- DIABETIC DIET (likely diabetic patient):',
      '  * Blood sugar fluctuations may cause symptoms',
      '  * Neuropathy: numbness, tingling, pain',
      '  * Wound healing concerns',
      '  * Increased infection risk'
    );
  } else if (dietType === 'renal') {
    lines.push(
      '',
      '- RENAL DIET (likely kidney disease):',
      '  * Electrolyte imbalances possible',
      '  * Fluid retention symptoms',
      '  * Medication dosing affected by kidney function'
    );
  }

  if (lines.length === 0) {
    return '';
  }

  return ['', 'LIFESTYLE CONSIDERATIONS:', ...lines].join('\n');
}

/**
 * Build special considerations (caregiver reporting, etc.)
 */
function buildSpecialConsiderations(profile: PatientProfile): string {
  const lines: string[] = [];

  if (profile.isCaregiverReporting) {
    lines.push(
      '',
      'CAREGIVER-REPORTED SYMPTOMS:',
      '- Symptoms are being reported by a caregiver, not the patient directly',
      '- Caregiver observations are valuable but may differ from patient experience',
      '- Consider asking caregiver about:',
      '  * Changes in behavior or routine',
      '  * Appetite and eating patterns',
      '  * Sleep quality',
      '  * Mobility changes',
      '  * Mood or cognitive changes'
    );
  }

  if (profile.livesAlone) {
    lines.push(
      '',
      'LIVES ALONE:',
      '- Higher risk if condition worsens without someone noticing',
      '- Fall risk more concerning without immediate help available',
      '- May delay seeking care',
      '- Social isolation can contribute to mental health symptoms'
    );
  }

  if (profile.recentHospitalization) {
    lines.push(
      '',
      'RECENT HOSPITALIZATION:',
      '- Post-hospital syndrome: vulnerable period after discharge',
      '- New symptoms may relate to hospital stay',
      '- Medication changes may have occurred',
      '- Follow-up care may be needed'
    );
  }

  if (lines.length === 0) {
    return '';
  }

  return lines.join('\n');
}

/**
 * Format gender for display
 */
function formatGender(gender: Gender): string {
  switch (gender) {
    case 'male':
      return 'Male';
    case 'female':
      return 'Female';
    case 'other':
      return 'Other / Non-binary';
    case 'prefer_not_to_say':
      return 'Prefer not to say';
    default:
      return gender;
  }
}

/**
 * Format diet type for display
 */
function formatDietType(diet: DietType): string {
  const labels: Record<DietType, string> = {
    regular: 'Regular',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    diabetic_friendly: 'Diabetic-Friendly',
    low_sodium: 'Low Sodium',
    gluten_free: 'Gluten-Free',
    heart_healthy: 'Heart Healthy',
    renal: 'Renal Diet',
    other: 'Other',
  };
  return labels[diet] || diet;
}

/**
 * Get a quick summary of key risk factors for the patient
 * Useful for displaying in UI or including in shorter prompts
 */
export function getPatientRiskSummary(profile: PatientProfile): string[] {
  const risks: string[] = [];

  if (profile.age >= 80) {
    risks.push('Very elderly (80+)');
  } else if (profile.age >= 65) {
    risks.push('Elderly (65+)');
  }

  if (profile.gender === 'female' && profile.age >= 50) {
    risks.push('Post-menopausal female');
  }

  if (profile.smoker) {
    risks.push('Smoker');
  }

  if (profile.alcoholUse === 'regular') {
    risks.push('Regular alcohol use');
  }

  if (profile.activityLevel === 'sedentary') {
    risks.push('Sedentary lifestyle');
  }

  if (profile.knownConditions) {
    risks.push('Has known conditions');
  }

  if (profile.medications) {
    risks.push('Taking medications');
  }

  return risks;
}
