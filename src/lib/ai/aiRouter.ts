/**
 * AI Router Service
 *
 * Central router for all AI requests. Routes to Gemini (primary) or Claude (fallback)
 * based on query classification and availability.
 *
 * Architecture:
 * User Request → AI Router → Classification → Provider Selection → Response
 *
 * Fallback chain:
 * 1. Try primary provider (based on classification)
 * 2. If fails → Try fallback provider
 * 3. If both fail → Return graceful error
 */

import {
  AI_MODELS,
  AI_ENDPOINTS,
  AI_QUALITY,
  AI_ERRORS,
  USER_ERROR_MESSAGES,
  AI_LOGGING,
  QUERY_CLASSIFICATION,
  GEMINI_CONFIG,
  CLAUDE_CONFIG,
  AI_RETRY,
  getAPIKey,
  isProviderConfigured,
  getTimeoutForComplexity,
  calculateBackoffDelay,
  type QueryComplexity,
  type AIProvider,
  type AIRequestType,
  type ProviderSelection,
  type AIResponseMetadata,
} from './aiConfig';

// Request options
export interface AIRouterRequest {
  // The query/prompt to send
  query: string;

  // Optional system prompt
  systemPrompt?: string;

  // Type of request for better classification
  requestType?: AIRequestType;

  // Force a specific provider (overrides classification)
  forceProvider?: AIProvider;

  // Force a specific complexity level (overrides classification)
  forceComplexity?: QueryComplexity;

  // Context for better responses
  context?: {
    userId?: string;
    groupId?: string;
    elderId?: string;
    elderName?: string;
    medications?: string[];
    conditions?: string[];
  };

  // Whether to use thinking mode (for complex analysis)
  useThinking?: boolean;

  // Thinking level for Gemini
  thinkingLevel?: 'low' | 'medium' | 'high';
}

// Response from AI Router
export interface AIRouterResponse {
  // The response text
  response: string;

  // Whether the request was successful
  success: boolean;

  // Error message if failed
  error?: string;

  // Error code for programmatic handling
  errorCode?: string;

  // Metadata about the request
  metadata: AIResponseMetadata;
}

/**
 * Classify query complexity based on content analysis
 */
export function classifyQueryComplexity(
  query: string,
  requestType?: AIRequestType
): QueryComplexity {
  const lowerQuery = query.toLowerCase();
  const wordCount = query.split(/\s+/).filter((w) => w.length > 0).length;
  const charCount = query.length;

  // Request type hints
  if (requestType) {
    // These types are always complex
    if (
      requestType === 'drug_interaction' ||
      requestType === 'care_recommendation' ||
      requestType === 'analysis'
    ) {
      return 'complex';
    }

    // These types are usually simple
    if (requestType === 'search' || requestType === 'medication_info') {
      return 'simple';
    }
  }

  // Check for medical complexity keywords (always complex)
  const hasMedicalComplexity = QUERY_CLASSIFICATION.MEDICAL_COMPLEXITY_KEYWORDS.some(
    (keyword) => lowerQuery.includes(keyword)
  );
  if (hasMedicalComplexity) {
    return 'complex';
  }

  // Check for complexity keywords
  const complexityScore = QUERY_CLASSIFICATION.COMPLEXITY_KEYWORDS.filter(
    (keyword) => lowerQuery.includes(keyword)
  ).length;

  // Check for simple keywords
  const simplicityScore = QUERY_CLASSIFICATION.SIMPLE_KEYWORDS.filter((keyword) =>
    lowerQuery.includes(keyword)
  ).length;

  // Short queries with simple keywords
  if (
    charCount <= QUERY_CLASSIFICATION.SHORT_QUERY_MAX_LENGTH &&
    simplicityScore > 0 &&
    complexityScore === 0
  ) {
    return 'simple';
  }

  // Long queries or queries with many complexity indicators
  if (
    wordCount >= QUERY_CLASSIFICATION.COMPLEX_QUERY_MIN_WORDS ||
    complexityScore >= 2
  ) {
    return 'complex';
  }

  // Short to medium queries without complexity indicators
  if (
    wordCount <= QUERY_CLASSIFICATION.SIMPLE_QUERY_MAX_WORDS &&
    complexityScore === 0
  ) {
    return 'simple';
  }

  // Default to medium
  return 'medium';
}

/**
 * Select the best provider based on query classification and availability
 */
export function selectProvider(
  complexity: QueryComplexity,
  forceProvider?: AIProvider
): ProviderSelection {
  // If forced, use that provider
  if (forceProvider) {
    const fallback: AIProvider = forceProvider === 'gemini' ? 'claude' : 'gemini';
    return {
      primary: forceProvider,
      fallback,
      complexity,
      reason: `Forced to use ${forceProvider}`,
    };
  }

  // Check provider availability
  const geminiAvailable = isProviderConfigured('gemini');
  const claudeAvailable = isProviderConfigured('claude');

  // Neither available
  if (!geminiAvailable && !claudeAvailable) {
    return {
      primary: 'gemini',
      fallback: 'claude',
      complexity,
      reason: 'No providers configured - will fail gracefully',
    };
  }

  // Only Gemini available
  if (geminiAvailable && !claudeAvailable) {
    return {
      primary: 'gemini',
      fallback: 'gemini', // No fallback
      complexity,
      reason: 'Only Gemini configured',
    };
  }

  // Only Claude available
  if (!geminiAvailable && claudeAvailable) {
    return {
      primary: 'claude',
      fallback: 'claude', // No fallback
      complexity,
      reason: 'Only Claude configured',
    };
  }

  // Both available - route based on complexity
  // Gemini is primary for all cases (faster, cheaper)
  // Claude is fallback (better quality when needed)
  switch (complexity) {
    case 'simple':
      return {
        primary: 'gemini',
        fallback: 'claude',
        complexity,
        reason: 'Simple query - Gemini primary for speed',
      };

    case 'medium':
      return {
        primary: 'gemini',
        fallback: 'claude',
        complexity,
        reason: 'Medium query - Gemini primary, Claude fallback',
      };

    case 'complex':
      // For complex queries, still try Gemini first but rely on Claude as strong fallback
      return {
        primary: 'gemini',
        fallback: 'claude',
        complexity,
        reason: 'Complex query - Gemini with thinking, Claude fallback for quality',
      };
  }
}

/**
 * Make a request to Gemini API
 */
async function callGemini(
  query: string,
  systemPrompt: string,
  complexity: QueryComplexity,
  useThinking: boolean,
  thinkingLevel: 'low' | 'medium' | 'high',
  timeout: number
): Promise<string> {
  const apiKey = getAPIKey('gemini');
  if (!apiKey) {
    throw new Error(AI_ERRORS.INVALID_API_KEY);
  }

  // Select config based on complexity
  const config =
    complexity === 'simple'
      ? GEMINI_CONFIG.SIMPLE
      : complexity === 'complex'
        ? GEMINI_CONFIG.COMPLEX
        : GEMINI_CONFIG.DEFAULT;

  // Build generation config
  const generationConfig: Record<string, unknown> = {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    topP: config.topP,
    topK: config.topK,
  };

  // Add thinking config for complex queries
  if (useThinking || complexity === 'complex') {
    generationConfig.thinkingConfig = {
      thinkingLevel: thinkingLevel || GEMINI_CONFIG.THINKING.MEDIUM,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `${AI_ENDPOINTS.GEMINI}/${AI_MODELS.GEMINI_PRIMARY}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${query}` : query }],
            },
          ],
          generationConfig,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      // Check for rate limiting
      if (response.status === 429) {
        throw new Error(AI_ERRORS.RATE_LIMITED);
      }

      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        throw new Error(AI_ERRORS.INVALID_API_KEY);
      }

      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract response text
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)
        ?.text;

    if (!text) {
      throw new Error(AI_ERRORS.INVALID_RESPONSE);
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(AI_ERRORS.TIMEOUT);
      }
      throw error;
    }

    throw new Error(AI_ERRORS.PROVIDER_UNAVAILABLE);
  }
}

/**
 * Make a request to Claude API
 */
async function callClaude(
  query: string,
  systemPrompt: string,
  complexity: QueryComplexity,
  timeout: number
): Promise<string> {
  const apiKey = getAPIKey('claude');
  if (!apiKey) {
    throw new Error(AI_ERRORS.INVALID_API_KEY);
  }

  // Select config based on complexity
  const config =
    complexity === 'simple'
      ? CLAUDE_CONFIG.SIMPLE
      : complexity === 'complex'
        ? CLAUDE_CONFIG.COMPLEX
        : CLAUDE_CONFIG.DEFAULT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(AI_ENDPOINTS.CLAUDE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODELS.CLAUDE_FALLBACK,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        system: systemPrompt || undefined,
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      // Check for rate limiting
      if (response.status === 429) {
        throw new Error(AI_ERRORS.RATE_LIMITED);
      }

      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        throw new Error(AI_ERRORS.INVALID_API_KEY);
      }

      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract response text
    const text = data.content?.[0]?.text;

    if (!text) {
      throw new Error(AI_ERRORS.INVALID_RESPONSE);
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(AI_ERRORS.TIMEOUT);
      }
      throw error;
    }

    throw new Error(AI_ERRORS.PROVIDER_UNAVAILABLE);
  }
}

/**
 * Validate response quality
 */
function isValidResponse(response: string): boolean {
  // Check minimum length
  if (response.length < AI_QUALITY.MIN_RESPONSE_LENGTH) {
    return false;
  }

  // Check for error patterns
  const lowerResponse = response.toLowerCase();
  const hasErrorPattern = AI_QUALITY.ERROR_PATTERNS.some((pattern) =>
    lowerResponse.startsWith(pattern)
  );

  if (hasErrorPattern && response.length < 100) {
    // Short error-like responses are invalid
    return false;
  }

  return true;
}

/**
 * Call a provider with retry logic
 */
async function callProviderWithRetry(
  provider: AIProvider,
  query: string,
  systemPrompt: string,
  complexity: QueryComplexity,
  useThinking: boolean,
  thinkingLevel: 'low' | 'medium' | 'high',
  timeout: number
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < AI_RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      let response: string;

      if (provider === 'gemini') {
        response = await callGemini(
          query,
          systemPrompt,
          complexity,
          useThinking,
          thinkingLevel,
          timeout
        );
      } else {
        response = await callClaude(query, systemPrompt, complexity, timeout);
      }

      // Validate response
      if (isValidResponse(response)) {
        return response;
      }

      // Invalid response - retry if we have attempts left
      lastError = new Error(AI_ERRORS.INVALID_RESPONSE);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry for certain errors
      if (
        lastError.message === AI_ERRORS.INVALID_API_KEY ||
        lastError.message === AI_ERRORS.RATE_LIMITED
      ) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      if (attempt < AI_RETRY.MAX_ATTEMPTS - 1) {
        const delay = calculateBackoffDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(AI_ERRORS.PROVIDER_UNAVAILABLE);
}

/**
 * Main AI Router function
 *
 * Routes requests to the appropriate AI provider based on classification
 * and handles fallback automatically.
 */
export async function routeAIRequest(
  request: AIRouterRequest
): Promise<AIRouterResponse> {
  const startTime = Date.now();

  // Classify query
  const complexity =
    request.forceComplexity ||
    classifyQueryComplexity(request.query, request.requestType);

  // Select provider
  const selection = selectProvider(complexity, request.forceProvider);

  // Get timeout based on complexity
  const timeout = getTimeoutForComplexity(complexity);

  // Build system prompt with context
  let systemPrompt = request.systemPrompt || '';
  if (request.context) {
    const contextParts: string[] = [];
    if (request.context.elderName) {
      contextParts.push(`Patient name: ${request.context.elderName}`);
    }
    if (request.context.medications?.length) {
      contextParts.push(`Current medications: ${request.context.medications.join(', ')}`);
    }
    if (request.context.conditions?.length) {
      contextParts.push(`Known conditions: ${request.context.conditions.join(', ')}`);
    }
    if (contextParts.length > 0) {
      systemPrompt = `${systemPrompt}\n\nContext:\n${contextParts.join('\n')}`.trim();
    }
  }

  // Log classification decision
  if (AI_LOGGING.LOG_CLASSIFICATION) {
    console.log(
      `[AI Router] Classification: ${complexity}, Primary: ${selection.primary}, Reason: ${selection.reason}`
    );
  }

  let usedFallback = false;
  let finalProvider: AIProvider = selection.primary;
  let responseText = '';
  let errorMessage: string | undefined;
  let errorCode: string | undefined;

  // Try primary provider
  try {
    if (AI_LOGGING.LOG_PROVIDER) {
      console.log(`[AI Router] Calling ${selection.primary} (primary)...`);
    }

    responseText = await callProviderWithRetry(
      selection.primary,
      request.query,
      systemPrompt,
      complexity,
      request.useThinking || false,
      request.thinkingLevel || 'medium',
      timeout
    );
  } catch (primaryError) {
    const primaryErrorMessage =
      primaryError instanceof Error ? primaryError.message : String(primaryError);

    if (AI_LOGGING.LOG_ERRORS) {
      console.error(`[AI Router] ${selection.primary} failed:`, primaryErrorMessage);
    }

    // Try fallback if available and different from primary
    if (selection.fallback !== selection.primary) {
      try {
        if (AI_LOGGING.LOG_FALLBACKS) {
          console.log(
            `[AI Router] Falling back to ${selection.fallback}...`
          );
        }

        responseText = await callProviderWithRetry(
          selection.fallback,
          request.query,
          systemPrompt,
          complexity,
          false, // No thinking mode for fallback
          'medium',
          timeout
        );

        usedFallback = true;
        finalProvider = selection.fallback;
      } catch (fallbackError) {
        const fallbackErrorMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);

        if (AI_LOGGING.LOG_ERRORS) {
          console.error(
            `[AI Router] ${selection.fallback} also failed:`,
            fallbackErrorMessage
          );
        }

        // Both failed
        errorCode = AI_ERRORS.ALL_PROVIDERS_FAILED;
        errorMessage = USER_ERROR_MESSAGES[AI_ERRORS.ALL_PROVIDERS_FAILED];
      }
    } else {
      // No fallback available
      errorCode = primaryErrorMessage;
      errorMessage =
        USER_ERROR_MESSAGES[primaryErrorMessage as keyof typeof USER_ERROR_MESSAGES] ||
        USER_ERROR_MESSAGES[AI_ERRORS.PROVIDER_UNAVAILABLE];
    }
  }

  const endTime = Date.now();
  const latencyMs = endTime - startTime;

  // Log latency
  if (AI_LOGGING.LOG_LATENCY) {
    console.log(
      `[AI Router] Completed in ${latencyMs}ms, Provider: ${finalProvider}, Fallback: ${usedFallback}`
    );
  }

  // Build metadata
  const metadata: AIResponseMetadata = {
    provider: finalProvider,
    model:
      finalProvider === 'gemini'
        ? AI_MODELS.GEMINI_PRIMARY
        : AI_MODELS.CLAUDE_FALLBACK,
    latencyMs,
    usedFallback,
    complexity,
    timestamp: new Date(),
  };

  // Return response
  if (errorMessage) {
    return {
      response: '',
      success: false,
      error: errorMessage,
      errorCode,
      metadata,
    };
  }

  return {
    response: responseText,
    success: true,
    metadata,
  };
}

/**
 * Convenience function for simple chat requests
 */
export async function chat(
  query: string,
  systemPrompt?: string
): Promise<AIRouterResponse> {
  return routeAIRequest({
    query,
    systemPrompt,
    requestType: 'chat',
  });
}

/**
 * Convenience function for medication-related queries
 */
export async function medicationQuery(
  query: string,
  medications?: string[]
): Promise<AIRouterResponse> {
  return routeAIRequest({
    query,
    requestType: 'medication_info',
    context: { medications },
    systemPrompt:
      'You are a helpful medical information assistant. Provide accurate, factual information about medications. Always recommend consulting a healthcare provider for medical decisions.',
  });
}

/**
 * Convenience function for drug interaction checks
 */
export async function checkDrugInteraction(
  medications: string[]
): Promise<AIRouterResponse> {
  return routeAIRequest({
    query: `Check for potential drug interactions between these medications: ${medications.join(', ')}. List any known interactions, their severity, and recommendations.`,
    requestType: 'drug_interaction',
    context: { medications },
    systemPrompt:
      'You are a pharmacology expert. Analyze drug interactions thoroughly and provide clinically relevant information. Always recommend consulting a healthcare provider or pharmacist for medication decisions.',
    forceComplexity: 'complex', // Always use complex for interactions
    useThinking: true,
  });
}

/**
 * Convenience function for symptom analysis
 */
export async function analyzeSymptoms(
  symptoms: string,
  elderName?: string,
  conditions?: string[]
): Promise<AIRouterResponse> {
  return routeAIRequest({
    query: symptoms,
    requestType: 'symptom_check',
    context: { elderName, conditions },
    systemPrompt:
      'You are a health information assistant. Help users understand potential causes of symptoms. Always recommend seeking professional medical care for diagnosis and treatment. Never provide diagnoses.',
    useThinking: true,
  });
}

/**
 * Convenience function for care recommendations
 */
export async function getCareRecommendation(
  query: string,
  context?: AIRouterRequest['context']
): Promise<AIRouterResponse> {
  return routeAIRequest({
    query,
    requestType: 'care_recommendation',
    context,
    systemPrompt:
      'You are a compassionate caregiving assistant. Provide practical, evidence-based care recommendations. Always consider the wellbeing of both the care recipient and caregiver.',
    forceComplexity: 'complex',
  });
}

/**
 * Convenience function for search queries
 */
export async function search(query: string): Promise<AIRouterResponse> {
  return routeAIRequest({
    query,
    requestType: 'search',
    forceComplexity: 'simple', // Search is typically simple
  });
}

/**
 * Test connection to AI providers
 * Returns status of each provider
 */
export async function testProviders(): Promise<{
  gemini: { available: boolean; latencyMs?: number; error?: string };
  claude: { available: boolean; latencyMs?: number; error?: string };
}> {
  const results = {
    gemini: { available: false, latencyMs: undefined as number | undefined, error: undefined as string | undefined },
    claude: { available: false, latencyMs: undefined as number | undefined, error: undefined as string | undefined },
  };

  // Test Gemini
  if (isProviderConfigured('gemini')) {
    const startGemini = Date.now();
    try {
      await callGemini('Say "hello"', '', 'simple', false, 'low', 10000);
      results.gemini.available = true;
      results.gemini.latencyMs = Date.now() - startGemini;
    } catch (error) {
      results.gemini.error =
        error instanceof Error ? error.message : String(error);
    }
  } else {
    results.gemini.error = 'GEMINI_API_KEY not configured';
  }

  // Test Claude
  if (isProviderConfigured('claude')) {
    const startClaude = Date.now();
    try {
      await callClaude('Say "hello"', '', 'simple', 10000);
      results.claude.available = true;
      results.claude.latencyMs = Date.now() - startClaude;
    } catch (error) {
      results.claude.error =
        error instanceof Error ? error.message : String(error);
    }
  } else {
    results.claude.error = 'ANTHROPIC_API_KEY not configured';
  }

  return results;
}
