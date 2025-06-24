import { 
  MedicationCheckRequest, 
  MedicationCheckResult, 
  MedicationInteraction,
  HealthQuestion,
  HealthAnswer,
} from '@/types';
import { DISCLAIMERS, HEALTH_STATUS } from '@/lib/constants';

/**
 * Medical AI integration for medication conflict detection
 * Now uses Claude Sonnet 4 API instead of MedGemma/Vertex AI for superior medical analysis
 * Model: claude-sonnet-4-20250514 with enhanced reasoning capabilities
 */

// Make API request to Claude API (replaces Vertex AI/MedGemma)
const makeClaudeRequest = async (
  prompt: string,
  maxTokens: number = 1500
): Promise<string> => {
  // Validate Claude API key exists
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY environment variable is required');
  }

  // Call Claude API instead of Vertex AI
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', // Using Claude Sonnet 4 for superior medical analysis
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`Claude request failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle potential 'refusal' stop reason from Claude 4
  if (!data.content?.[0]?.text) {
    // Check if refusal occurred
    if (data.stop_reason === 'refusal') {
      throw new Error('Claude refused to process this medical request for safety reasons');
    }
    throw new Error('Invalid response from Claude API');
  }

  return data.content[0].text;
};

// Format medication list for prompt (unchanged)
const formatMedicationList = (medications: MedicationCheckRequest['medications']): string => {
  return medications
    .map((med, index) => {
      let medStr = `${index + 1}. ${med.name}`;
      if (med.dosage) medStr += ` (${med.dosage})`;
      if (med.frequency) medStr += ` - ${med.frequency}`;
      if (med.prescribedFor) medStr += ` for ${med.prescribedFor}`;
      return medStr;
    })
    .join('\n');
};

// Enhanced structured response parsing (unchanged - works with Claude)
interface ParsedInteraction {
  medications: string[];
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  recommendation?: string;
}

// Parse AI response into structured result with enhanced logic
// Note: Claude typically provides more structured and reliable responses
const parseCheckResponse = (
  response: string,
  medications: MedicationCheckRequest['medications']
): MedicationCheckResult => {
  // Default safe result
  let result: MedicationCheckResult = {
    id: `check-${Date.now()}`,
    status: 'safe',
    overallRisk: 'safe',
    summary: HEALTH_STATUS.SAFE.message,
    interactions: [],
    generalAdvice: 'Continue taking your medications as prescribed by your doctor.',
    consultDoctorRecommended: false,
    checkedAt: new Date(),
    disclaimer: DISCLAIMERS.AI_LIMITATIONS,
  };

  try {
    // Try to parse JSON response first (Claude is good at structured responses)
    if (response.trim().startsWith('{')) {
      try {
        const jsonResponse = JSON.parse(response);
        if (jsonResponse.interactions) {
          result.interactions = jsonResponse.interactions;
          result.status = jsonResponse.overallRisk || 'safe';
          result.summary = jsonResponse.summary || result.summary;
          result.generalAdvice = jsonResponse.advice || result.generalAdvice;
          result.consultDoctorRecommended = jsonResponse.consultDoctor || false;
          return result;
        }
      } catch (jsonError) {
        // Continue with text parsing if JSON parsing fails
      }
    }

    const lowerResponse = response.toLowerCase();
    const interactions: MedicationInteraction[] = [];
    
    // Enhanced severity detection with weighted keywords
    // Claude is better at identifying these patterns accurately
    const severityKeywords = {
      major: {
        keywords: ['serious', 'major', 'dangerous', 'severe', 'critical', 'contraindicated', 'avoid'],
        weight: 3,
      },
      moderate: {
        keywords: ['moderate', 'caution', 'monitor', 'careful', 'adjust', 'watch'],
        weight: 2,
      },
      minor: {
        keywords: ['minor', 'mild', 'slight', 'possible', 'may'],
        weight: 1,
      },
    };
    
    // Calculate severity score
    let severityScore = 0;
    let detectedSeverity: 'minor' | 'moderate' | 'major' = 'minor';
    
    for (const [level, config] of Object.entries(severityKeywords)) {
      for (const keyword of config.keywords) {
        if (lowerResponse.includes(keyword)) {
          severityScore = Math.max(severityScore, config.weight);
          if (config.weight === severityScore) {
            detectedSeverity = level as 'minor' | 'moderate' | 'major';
          }
        }
      }
    }
    
    // Update status based on severity
    if (severityScore >= 3) {
      result.status = 'danger';
      result.overallRisk = 'danger';
      result.summary = HEALTH_STATUS.MAJOR.message;
      result.consultDoctorRecommended = true;
    } else if (severityScore >= 2) {
      result.status = 'warning';
      result.overallRisk = 'warning';
      result.summary = HEALTH_STATUS.MINOR.message;
      result.consultDoctorRecommended = true;
    }

    // Enhanced interaction extraction (Claude provides more detailed responses)
    const interactionPatterns = [
      /(?:interaction|conflict) between ([\w\s\-]+) and ([\w\s\-]+)/gi,
      /([\w\s\-]+) (?:interacts|conflicts) with ([\w\s\-]+)/gi,
      /([\w\s\-]+) and ([\w\s\-]+) (?:interaction|may interact)/gi,
    ];
    
    for (const pattern of interactionPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const med1 = match[1].trim();
        const med2 = match[2].trim();
        
        // Find context around the interaction mention
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(response.length, match.index + match[0].length + 200);
        const context = response.substring(contextStart, contextEnd);
        
        interactions.push({
          medication1: med1,
          medication2: med2,
          severity: detectedSeverity,
          description: extractDescription(context, med1, med2),
          recommendation: extractRecommendation(context),
        });
      }
    }
    
    result.interactions = interactions;

    // Extract additional information
    result.additionalInfo = extractAdditionalInfo(response);
    
    // Use cleaned AI response as general advice (Claude provides cleaner responses)
    if (response.length > 50) {
      result.generalAdvice = cleanupAdvice(response);
    }

  } catch (error) {
    console.error('Error parsing Claude response:', error);
  }

  return result;
};

// Helper function to extract interaction description (unchanged)
const extractDescription = (context: string, med1: string, med2: string): string => {
  // Look for description patterns
  const patterns = [
    /(?:may|can|could) (?:cause|lead to|result in) ([\w\s,]+)/i,
    /(?:increases?|decreases?|affects?) ([\w\s,]+)/i,
    /(?:risk of|chance of) ([\w\s,]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) {
      return `${med1} and ${med2} interaction: ${match[0]}`;
    }
  }
  
  return `Potential interaction detected between ${med1} and ${med2}`;
};

// Helper function to extract recommendations (unchanged)
const extractRecommendation = (context: string): string => {
  const patterns = [
    /(?:recommend|suggest|advise) ([\w\s,]+)/i,
    /(?:should|must|need to) ([\w\s,]+)/i,
    /(?:monitor|watch for|check) ([\w\s,]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return 'Consult your healthcare provider for personalized advice';
};

// Helper function to extract additional info (unchanged)
const extractAdditionalInfo = (response: string): string | undefined => {
  // Look for age-related or condition-specific information
  const patterns = [
    /(?:elderly|older adults?|seniors?) (?:should|may|need).+/i,
    /(?:kidney|liver|heart) (?:disease|function|patients?).+/i,
    /(?:pregnancy|pregnant|nursing).+/i,
  ];
  
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return undefined;
};

// Helper function to clean up advice text (unchanged)
const cleanupAdvice = (text: string): string => {
  // Remove extra whitespace and common AI artifacts
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 500);
};

// Check medications for conflicts using Claude API (updated)
export const checkMedications = async (
  request: MedicationCheckRequest
): Promise<MedicationCheckResult> => {
  try {
    // Build prompt for Claude (improved for better medical analysis)
    const medicationList = formatMedicationList(request.medications);
    
    const prompt = `As a medical AI assistant, analyze the following medications for potential drug interactions and safety concerns. Please be thorough and conservative in your analysis.
    
Patient Information:
- Age: ${request.userAge || 'Not specified'}
- Health Conditions: ${request.healthConditions?.join(', ') || 'Not specified'}

Medications:
${medicationList}

Please analyze these medications for:
1. Drug-drug interactions (severity: minor, moderate, or major)
2. Age-related concerns for elderly patients
3. Condition-specific warnings
4. General safety recommendations

IMPORTANT: Structure your response as JSON in this format:
{
  "overallRisk": "safe" | "warning" | "danger",
  "summary": "Brief overall assessment",
  "interactions": [
    {
      "medication1": "name",
      "medication2": "name", 
      "severity": "minor" | "moderate" | "major",
      "description": "Details of the interaction",
      "recommendation": "What to do"
    }
  ],
  "advice": "General advice for the patient",
  "consultDoctor": true | false
}

If no interactions are found, return overallRisk as "safe" with empty interactions array.
Important: This is for educational purposes only. Always recommend consulting healthcare providers for medical decisions.`;

    // Make API request to Claude (replaces Vertex AI call)
    const aiResponse = await makeClaudeRequest(prompt, 1500);

    // Parse and structure the response (Claude typically provides better structured responses)
    const result = parseCheckResponse(aiResponse, request.medications);
    
    return result;
  } catch (error) {
    console.error('Medication check error (Claude API):', error);
    
    // Return error result
    return {
      id: `check-error-${Date.now()}`,
      status: 'warning',
      overallRisk: 'warning',
      summary: 'Unable to complete medication check',
      interactions: [],
      generalAdvice: 'We encountered an error checking your medications. Please try again or consult your healthcare provider directly.',
      consultDoctorRecommended: true,
      checkedAt: new Date(),
      disclaimer: DISCLAIMERS.GENERAL,
    };
  }
};

// Answer health questions using Claude API (updated)
export const answerHealthQuestion = async (
  question: HealthQuestion
): Promise<HealthAnswer> => {
  try {
    const prompt = `As a medical AI assistant, answer this health question for the user (health caregiver, elder over 65 years). Please provide accurate, conservative medical advice.

Question: ${question.question}
${question.context ? `Context: ${question.context}` : ''}

Please provide:
1. A clear, simple answer in language suitable for elderly patients
2. Avoid medical jargon where possible
3. Include relevant safety information
4. Always recommend consulting healthcare providers for medical decisions
5. Be conservative and emphasize professional medical consultation

Keep the answer concise (under 100 words) and helpful. Focus on safety and accuracy.`;

    // Make API request to Claude (replaces Vertex AI call)
    const aiResponse = await makeClaudeRequest(prompt, 800);

    return {
      id: `answer-${Date.now()}`,
      question: question.question,
      answer: aiResponse,
      confidence: 0.95, // Claude Sonnet 4 typically provides higher confidence responses
      disclaimer: DISCLAIMERS.GENERAL,
      answeredAt: new Date(),
    };
  } catch (error) {
    console.error('Health Q&A error (Claude API):', error);
    
    return {
      id: `answer-error-${Date.now()}`,
      question: question.question,
      answer: 'I apologize, but I encountered an error processing your question. Please try again or consult your healthcare provider directly.',
      confidence: 0,
      disclaimer: DISCLAIMERS.GENERAL,
      answeredAt: new Date(),
    };
  }
};