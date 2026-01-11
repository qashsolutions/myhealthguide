/**
 * AI Configuration
 *
 * Central configuration for AI services.
 * All API keys are stored in Vercel environment variables.
 *
 * IMPORTANT: Never hardcode API keys. Always use process.env references.
 */

// Model identifiers
export const AI_MODELS = {
  // Primary: Google Gemini 3 Pro Preview
  GEMINI_PRIMARY: 'gemini-3-pro-preview',

  // Secondary/Fallback: Claude Opus 4.5
  CLAUDE_FALLBACK: 'claude-opus-4-5-20251101',
} as const;

// API endpoints
export const AI_ENDPOINTS = {
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta/models',
  CLAUDE: 'https://api.anthropic.com/v1/messages',
} as const;

// Timeout settings (in milliseconds)
export const AI_TIMEOUTS = {
  // Standard timeout for simple queries
  SIMPLE: 15000, // 15 seconds

  // Extended timeout for complex queries
  COMPLEX: 30000, // 30 seconds

  // Maximum timeout for long-form generation
  EXTENDED: 60000, // 60 seconds
} as const;

// Retry settings
export const AI_RETRY = {
  // Maximum retry attempts per provider
  MAX_ATTEMPTS: 2,

  // Base delay for exponential backoff (ms)
  BASE_DELAY: 1000,

  // Maximum delay between retries (ms)
  MAX_DELAY: 10000,

  // Backoff multiplier
  MULTIPLIER: 2,
} as const;

// Quality thresholds for response validation
export const AI_QUALITY = {
  // Minimum response length for valid response (characters)
  MIN_RESPONSE_LENGTH: 10,

  // Maximum retries before accepting lower quality response
  MAX_QUALITY_RETRIES: 1,

  // Response must not be just an error message
  ERROR_PATTERNS: [
    'i cannot',
    'i am unable',
    'error occurred',
    'something went wrong',
    'please try again',
  ],
} as const;

// Query classification thresholds
export const QUERY_CLASSIFICATION = {
  // Character count thresholds
  SHORT_QUERY_MAX_LENGTH: 100,
  MEDIUM_QUERY_MAX_LENGTH: 500,

  // Word count thresholds
  SIMPLE_QUERY_MAX_WORDS: 20,
  COMPLEX_QUERY_MIN_WORDS: 50,

  // Complexity indicators (keywords that suggest complex query)
  COMPLEXITY_KEYWORDS: [
    'analyze',
    'compare',
    'explain why',
    'interaction',
    'multiple',
    'comprehensive',
    'detailed',
    'assess',
    'evaluate',
    'recommend',
    'suggest',
    'consider',
    'implications',
    'consequences',
    'alternatives',
    'trade-offs',
    'pros and cons',
    'in-depth',
    'thorough',
  ],

  // Simple query indicators
  SIMPLE_KEYWORDS: [
    'what is',
    'define',
    'list',
    'when',
    'where',
    'how much',
    'how many',
    'name',
    'show',
    'find',
    'search',
    'look up',
  ],

  // Medical complexity indicators (always route to better model)
  MEDICAL_COMPLEXITY_KEYWORDS: [
    'drug interaction',
    'medication interaction',
    'contraindication',
    'side effect',
    'adverse',
    'symptoms',
    'diagnosis',
    'treatment',
    'dosage',
    'overdose',
    'withdrawal',
    'allergy',
    'condition',
    'chronic',
    'acute',
    'emergency',
  ],
} as const;

// Gemini-specific configuration
export const GEMINI_CONFIG = {
  // Default generation config
  DEFAULT: {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topP: 0.95,
    topK: 40,
  },

  // Simple queries - faster, more focused
  SIMPLE: {
    temperature: 0.3,
    maxOutputTokens: 1024,
    topP: 0.9,
    topK: 20,
  },

  // Complex queries - more thorough
  COMPLEX: {
    temperature: 0.5,
    maxOutputTokens: 4096,
    topP: 0.95,
    topK: 40,
  },

  // Thinking mode levels
  THINKING: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  } as const,
} as const;

// Claude-specific configuration
export const CLAUDE_CONFIG = {
  // Default configuration
  DEFAULT: {
    max_tokens: 2048,
    temperature: 0.7,
  },

  // Simple queries
  SIMPLE: {
    max_tokens: 1024,
    temperature: 0.3,
  },

  // Complex queries
  COMPLEX: {
    max_tokens: 4096,
    temperature: 0.5,
  },
} as const;

// Rate limiting configuration
export const RATE_LIMIT = {
  // Requests per minute per user
  USER_RPM: 20,

  // Requests per minute global
  GLOBAL_RPM: 100,

  // Cooldown period after rate limit hit (ms)
  COOLDOWN_MS: 60000,
} as const;

// Logging configuration
export const AI_LOGGING = {
  // Log provider used for each request
  LOG_PROVIDER: true,

  // Log response times
  LOG_LATENCY: true,

  // Log fallback events
  LOG_FALLBACKS: true,

  // Log errors
  LOG_ERRORS: true,

  // Log query classification decisions
  LOG_CLASSIFICATION: true,
} as const;

// Query types for routing
export type QueryComplexity = 'simple' | 'medium' | 'complex';
export type AIProvider = 'gemini' | 'claude';
export type AIRequestType =
  | 'chat'
  | 'symptom_check'
  | 'medication_info'
  | 'drug_interaction'
  | 'care_recommendation'
  | 'search'
  | 'summary'
  | 'analysis'
  | 'general';

// Provider selection result
export interface ProviderSelection {
  primary: AIProvider;
  fallback: AIProvider;
  complexity: QueryComplexity;
  reason: string;
}

// AI response metadata
export interface AIResponseMetadata {
  provider: AIProvider;
  model: string;
  latencyMs: number;
  usedFallback: boolean;
  complexity: QueryComplexity;
  timestamp: Date;
}

// Error types
export const AI_ERRORS = {
  TIMEOUT: 'AI_TIMEOUT',
  RATE_LIMITED: 'AI_RATE_LIMITED',
  INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  ALL_PROVIDERS_FAILED: 'AI_ALL_PROVIDERS_FAILED',
  INVALID_API_KEY: 'AI_INVALID_API_KEY',
} as const;

// User-friendly error messages
export const USER_ERROR_MESSAGES = {
  [AI_ERRORS.TIMEOUT]:
    'The request took too long. Please try again.',
  [AI_ERRORS.RATE_LIMITED]:
    'Too many requests. Please wait a moment and try again.',
  [AI_ERRORS.INVALID_RESPONSE]:
    'We received an unexpected response. Please try again.',
  [AI_ERRORS.PROVIDER_UNAVAILABLE]:
    'Our AI assistant is temporarily unavailable. Please try again shortly.',
  [AI_ERRORS.ALL_PROVIDERS_FAILED]:
    'Our AI assistant is temporarily unavailable. Please try again in a few minutes.',
  [AI_ERRORS.INVALID_API_KEY]:
    'Configuration error. Please contact support.',
} as const;

/**
 * Get API key for a provider
 * @param provider The AI provider
 * @returns The API key or undefined if not configured
 */
export function getAPIKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'gemini':
      return process.env.GEMINI_API_KEY;
    case 'claude':
      return process.env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check if a provider is configured (has API key)
 * @param provider The AI provider
 * @returns True if the provider is configured
 */
export function isProviderConfigured(provider: AIProvider): boolean {
  return !!getAPIKey(provider);
}

/**
 * Get timeout for a query complexity level
 * @param complexity The query complexity
 * @returns Timeout in milliseconds
 */
export function getTimeoutForComplexity(complexity: QueryComplexity): number {
  switch (complexity) {
    case 'simple':
      return AI_TIMEOUTS.SIMPLE;
    case 'medium':
      return AI_TIMEOUTS.COMPLEX;
    case 'complex':
      return AI_TIMEOUTS.EXTENDED;
    default:
      return AI_TIMEOUTS.COMPLEX;
  }
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay = AI_RETRY.BASE_DELAY * Math.pow(AI_RETRY.MULTIPLIER, attempt);
  return Math.min(delay, AI_RETRY.MAX_DELAY);
}
