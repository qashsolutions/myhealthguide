/**
 * FDA API Service - OpenFDA Drug Label Data
 *
 * CRITICAL RULES:
 * 1. Store FDA data VERBATIM - no interpretation, no summarization
 * 2. Never modify FDA text
 * 3. Never assign our own severity/categories
 * 4. Always attribute to FDA
 * 5. Link to source
 */

import { logPHIThirdPartyDisclosure, UserRole } from './phiAuditLog';

export interface FDADrugLabelData {
  // Raw FDA response - stored as-is
  source: 'openfda';
  sourceUrl: string;
  fetchedAt: Date;

  // Medication info
  brandName: string[];
  genericName: string[];
  substanceName: string[];

  // FDA Label Sections (VERBATIM from FDA)
  drugInteractions?: string[]; // Array of exact FDA text
  contraindications?: string[]; // Array of exact FDA text
  adverseReactions?: string[]; // Array of exact FDA text
  warningsAndCautions?: string[]; // Array of exact FDA text
  dosageAndAdministration?: string[]; // Array of exact FDA text
  useInSpecificPopulations?: string[]; // Array of exact FDA text

  // Metadata only (NOT interpretation)
  hasDrugInteractions: boolean; // Just a flag
  hasContraindications: boolean; // Just a flag
  hasAdverseReactions: boolean; // Just a flag

  // Original FDA JSON (full response for legal record)
  rawFDAResponse: any;

  lastVerified: Date;
}

const FDA_BASE_URL = 'https://api.fda.gov/drug/label.json';
const CACHE_DURATION_DAYS = 30; // Re-fetch FDA data after 30 days

/**
 * Fetch drug label data from FDA
 * Tries multiple search strategies to find the drug
 */
export async function fetchFDADrugLabel(
  medicationName: string,
  userId?: string,
  userRole?: UserRole,
  groupId?: string,
  elderId?: string
): Promise<FDADrugLabelData | null> {
  try {
    // Try search strategies in order of specificity
    const searchStrategies = [
      `openfda.brand_name:"${medicationName}"`,
      `openfda.generic_name:"${medicationName}"`,
      `openfda.substance_name:"${medicationName}"`,
      // Fallback: partial match
      `openfda.brand_name:${medicationName}`,
      `openfda.generic_name:${medicationName}`
    ];

    for (const searchQuery of searchStrategies) {
      const url = `${FDA_BASE_URL}?search=${encodeURIComponent(searchQuery)}&limit=1`;

      // HIPAA Audit: Log third-party PHI disclosure to FDA Drug Information API
      if (userId && userRole && groupId && elderId) {
        try {
          await logPHIThirdPartyDisclosure({
            userId,
            userRole,
            groupId,
            elderId,
            serviceName: 'FDA Drug Information API',
            serviceType: 'drug_information_lookup',
            dataShared: ['medication_name'],
            purpose: `Look up drug label information for ${medicationName} from FDA database`,
          });
        } catch (logError) {
          console.error('Error logging PHI disclosure:', logError);
          // Continue with FDA API call even if logging fails
        }
      }

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`FDA API error for query "${searchQuery}":`, response.status);
        continue; // Try next strategy
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];

        // Extract data VERBATIM - no modification
        const labelData: FDADrugLabelData = {
          source: 'openfda',
          sourceUrl: url,
          fetchedAt: new Date(),

          // Brand/generic names from FDA
          brandName: result.openfda?.brand_name || [],
          genericName: result.openfda?.generic_name || [],
          substanceName: result.openfda?.substance_name || [],

          // VERBATIM FDA sections
          drugInteractions: result.drug_interactions || undefined,
          contraindications: result.contraindications || undefined,
          adverseReactions: result.adverse_reactions || undefined,
          warningsAndCautions: result.warnings_and_cautions || undefined,
          dosageAndAdministration: result.dosage_and_administration || undefined,
          useInSpecificPopulations: result.use_in_specific_populations || undefined,

          // Boolean flags ONLY (not interpretation)
          hasDrugInteractions: !!(result.drug_interactions && result.drug_interactions.length > 0),
          hasContraindications: !!(result.contraindications && result.contraindications.length > 0),
          hasAdverseReactions: !!(result.adverse_reactions && result.adverse_reactions.length > 0),

          // Store entire FDA response for legal record
          rawFDAResponse: result,

          lastVerified: new Date()
        };

        console.log(`✅ FDA data found for "${medicationName}" using strategy: ${searchQuery}`);
        return labelData;
      }
    }

    // No results from any strategy
    console.warn(`⚠️ No FDA data found for medication: "${medicationName}"`);
    return null;

  } catch (error) {
    console.error('Error fetching FDA drug label:', error);
    return null;
  }
}

/**
 * Check if cached FDA data is still valid
 */
export function isFDADataStale(lastVerified: Date): boolean {
  const now = new Date();
  const daysSinceVerification = Math.floor(
    (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceVerification >= CACHE_DURATION_DAYS;
}

/**
 * Search for potential interactions between two medications
 * Returns TRUE if medication1's FDA data mentions medication2 (or vice versa)
 * DOES NOT interpret what the interaction means - just flags it exists
 */
export function checkForMentionInFDAData(
  fdaData1: FDADrugLabelData,
  medication2Name: string
): boolean {
  const searchTerms = [
    medication2Name.toLowerCase(),
    // Also check generic/brand names
    ...(fdaData1.genericName || []).map(n => n.toLowerCase()),
    ...(fdaData1.brandName || []).map(n => n.toLowerCase())
  ];

  // Check if any FDA sections mention the other medication
  const sectionsToCheck = [
    ...(fdaData1.drugInteractions || []),
    ...(fdaData1.contraindications || []),
    ...(fdaData1.warningsAndCautions || [])
  ];

  const allText = sectionsToCheck.join(' ').toLowerCase();

  return searchTerms.some(term => allText.includes(term));
}

/**
 * Check if a symptom might be listed in FDA adverse reactions
 * DOES NOT say it IS a side effect - just that FDA mentions it
 */
export function checkSymptomInFDAData(
  fdaData: FDADrugLabelData,
  symptom: string
): { found: boolean; fdaText?: string[] } {
  if (!fdaData.adverseReactions) {
    return { found: false };
  }

  const symptomLower = symptom.toLowerCase();
  const matchingTexts: string[] = [];

  // Search for symptom in FDA adverse reactions text
  fdaData.adverseReactions.forEach(text => {
    if (text.toLowerCase().includes(symptomLower)) {
      matchingTexts.push(text); // Store EXACT FDA text
    }
  });

  return {
    found: matchingTexts.length > 0,
    fdaText: matchingTexts.length > 0 ? matchingTexts : undefined
  };
}

/**
 * Rate limit helper for FDA API
 * Free tier: 240 requests/minute, 120,000/day
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 250; // 250ms between requests = 240/min max

export async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return fetch(url);
}
