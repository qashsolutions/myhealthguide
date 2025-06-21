import { getAuthClient, VERTEX_AI_ENDPOINTS, MODEL_PARAMETERS, SAFETY_SETTINGS, validateConfig } from './config';
import { 
  MedicationCheckRequest, 
  MedicationCheckResult, 
  MedicationInteraction,
  HealthQuestion,
  HealthAnswer,
  VertexAIRequest,
  VertexAIResponse 
} from '@/types';
import { DISCLAIMERS, HEALTH_STATUS } from '@/lib/constants';

/**
 * MedGemma integration for medication conflict detection
 * Uses Vertex AI federated model
 */

// Make API request to Vertex AI
const makeVertexAIRequest = async (
  prompt: string,
  parameters: typeof MODEL_PARAMETERS.medication_check
): Promise<string> => {
  if (!validateConfig()) {
    throw new Error('Invalid Vertex AI configuration');
  }

  const auth = getAuthClient();
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken?.token) {
    throw new Error('Failed to get access token');
  }

  const response = await fetch(VERTEX_AI_ENDPOINTS.generateContent, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: parameters,
      safetySettings: SAFETY_SETTINGS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Vertex AI error:', error);
    throw new Error(`Vertex AI request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response from Vertex AI');
  }

  return data.candidates[0].content.parts[0].text;
};

// Format medication list for prompt
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

// Enhanced structured response parsing
interface ParsedInteraction {
  medications: string[];
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  recommendation?: string;
}

// Parse AI response into structured result with enhanced logic
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
    // Try to parse JSON response first (if AI returns structured data)
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

    // Enhanced interaction extraction
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
    
    // Use cleaned AI response as general advice
    if (response.length > 50) {
      result.generalAdvice = cleanupAdvice(response);
    }

  } catch (error) {
    console.error('Error parsing AI response:', error);
  }

  return result;
};

// Helper function to extract interaction description
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

// Helper function to extract recommendations
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

// Helper function to extract additional info
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

// Helper function to clean up advice text
const cleanupAdvice = (text: string): string => {
  // Remove extra whitespace and common AI artifacts
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 500);
};

// Check medications for conflicts
export const checkMedications = async (
  request: MedicationCheckRequest
): Promise<MedicationCheckResult> => {
  try {
    // Build prompt for MedGemma
    const medicationList = formatMedicationList(request.medications);
    
    const prompt = `As a medical AI assistant, analyze the following medications for potential drug interactions and safety concerns. 
    
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

IMPORTANT: If possible, structure your response as JSON in this format:
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

If JSON format is not possible, provide a detailed text response mentioning specific medication pairs if interactions exist.
Important: This is for educational purposes only. Always recommend consulting healthcare providers.`;

    // Make API request
    const aiResponse = await makeVertexAIRequest(
      prompt,
      MODEL_PARAMETERS.medication_check
    );

    // Parse and structure the response
    const result = parseCheckResponse(aiResponse, request.medications);
    
    return result;
  } catch (error) {
    console.error('Medication check error:', error);
    
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

// Answer health questions
export const answerHealthQuestion = async (
  question: HealthQuestion
): Promise<HealthAnswer> => {
  try {
    const prompt = `As a medical AI assistant, answer this health question for an elderly patient (65+ years old).

Question: ${question.question}
${question.context ? `Context: ${question.context}` : ''}

Please provide:
1. A clear, simple answer in language suitable for elderly patients
2. Avoid medical jargon
3. Include relevant safety information
4. Remind them to consult healthcare providers for medical decisions

Keep the answer concise (under 200 words) and helpful.`;

    // Make API request
    const aiResponse = await makeVertexAIRequest(
      prompt,
      MODEL_PARAMETERS.health_qa
    );

    return {
      id: `answer-${Date.now()}`,
      question: question.question,
      answer: aiResponse,
      confidence: 0.85, // Default confidence
      disclaimer: DISCLAIMERS.GENERAL,
      answeredAt: new Date(),
    };
  } catch (error) {
    console.error('Health Q&A error:', error);
    
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