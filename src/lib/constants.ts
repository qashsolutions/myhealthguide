/**
 * Application constants for Careguide
 * AI-powered caregiver and patient matchmaking platform
 */

// App metadata
export const APP_NAME = 'Careguide';
export const APP_DESCRIPTION = 'AI-powered caregiver and patient matchmaking platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://myguide.health';

// Feature flags
export const FEATURES = {
  VOICE_ENABLED: true,
  MEDICATION_CHECK: true,
  HEALTH_QA: true,
  EMAIL_NOTIFICATIONS: true,
} as const;

// Medical disclaimers
export const DISCLAIMERS = {
  GENERAL: 'This information is for educational purposes only and is not intended as medical advice. Always consult with your healthcare provider before making changes to your medications or treatment plan.',
  
  AI_LIMITATIONS: 'Our AI system has limitations and may not catch all medication interactions. Results should be verified with a healthcare professional.',
  
  EMERGENCY: 'If you are experiencing a medical emergency, call 911 immediately. Do not rely on our AI system for urgent medical decisions.',
  
  NOT_FDA_APPROVED: 'This tool is not FDA-approved for medical diagnosis or treatment recommendations.',
  
  HIPAA_NOTICE: 'We implement industry-standard security measures to protect your health information, but no system is 100% secure.',
} as const;

// Health status messages
export const HEALTH_STATUS = {
  SAFE: {
    title: 'Safe Combination',
    icon: '✅',
    message: 'No major conflicts found',
    color: 'health-safe',
    description: 'Based on our analysis, these medications appear to be safe to take together. However, always follow your doctor\'s instructions.',
  },
  MINOR: {
    title: 'Minor Interaction',
    icon: '⚠️',
    message: 'Minor interaction detected',
    color: 'health-warning',
    description: 'We found a minor interaction that you should mention to your doctor at your next visit.',
  },
  MAJOR: {
    title: 'Important Alert',
    icon: '🚨',
    message: 'Serious interaction detected',
    color: 'health-danger',
    description: 'We detected a potentially serious interaction. Please contact your healthcare provider as soon as possible.',
  },
} as const;

// Voice commands
export const VOICE_COMMANDS = [
  { command: 'Add medication', description: 'Add a new medication to your list' },
  { command: 'Check my medications', description: 'Run AI analysis on your medications' },
  { command: 'Read the results', description: 'Have AI results read aloud' },
  { command: 'What does this mean?', description: 'Get explanation in simple terms' },
  { command: 'Contact my doctor', description: 'Get contact information' },
  { command: 'Start over', description: 'Clear all medications and start fresh' },
] as const;

// API endpoints
export const API_ROUTES = {
  AUTH: {
    SIGNUP: '/api/auth/signup',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  MEDICATION: {
    CHECK: '/api/medication/check',
    SEARCH: '/api/medication/search',
  },
  HEALTH_QA: '/api/health-qa',
  EMAIL: {
    WELCOME: '/api/email/welcome',
    RESET: '/api/email/reset',
  },
} as const;

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_MIN: 'Password must be at least 6 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PHONE_INVALID: 'Please enter a valid phone number',
  MEDICATION_NAME: 'Please enter a medication name',
} as const;

// Error messages (user-friendly)
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to connect. Please check your internet connection.',
  AUTH_FAILED: 'Unable to sign in. Please check your email and password.',
  SIGNUP_FAILED: 'Unable to create account. This email may already be registered.',
  MEDICATION_CHECK_FAILED: 'Unable to check medications. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SIGNUP: 'Welcome to Careguide! Check your email for confirmation.',
  LOGIN: 'Welcome back! You\'re now signed in.',
  MEDICATION_ADDED: 'Medication added to your list.',
  CHECK_COMPLETE: 'Medication check complete. See your results below.',
  EMAIL_SENT: 'Email sent successfully.',
  PASSWORD_RESET: 'Password reset email sent. Check your inbox.',
} as const;

// Accessibility labels
export const ARIA_LABELS = {
  NAVIGATION: 'Main navigation',
  MENU_TOGGLE: 'Toggle navigation menu',
  CLOSE_MODAL: 'Close dialog',
  ADD_MEDICATION: 'Add medication to list',
  REMOVE_MEDICATION: 'Remove medication from list',
  CHECK_MEDICATIONS: 'Check medications for conflicts',
  VOICE_INPUT: 'Start voice input',
  VOICE_STOP: 'Stop voice input',
  READ_ALOUD: 'Read results aloud',
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  MEDICATION_CHECK: '/medication-check',
  HEALTH_QA: '/health-qa',
  PRESCRIPTION_PRICES: '/prescription-prices',
  DRUG_PRICES: '/drug-prices',
  ACCOUNT: '/account',
  ACCOUNT_DELETE: '/account/delete',
  PRIVACY: '/privacy',
  UNSUBSCRIBE: '/account/delete', // Redirects to account deletion
  MEDICAL_DISCLAIMER: '/medical-disclaimer',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'mhg_auth_token',
  USER_PREFERENCES: 'mhg_user_prefs',
  DISCLAIMER_ACCEPTED: 'mhg_disclaimer_accepted',
  VOICE_ENABLED: 'mhg_voice_enabled',
} as const;

// Animation durations (ms)
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VOICE_FEEDBACK: 2000,
} as const;

// Eldercare-specific settings
export const ELDERCARE_CONFIG = {
  MIN_FONT_SIZE: '1.2rem',
  MIN_TOUCH_TARGET: 44, // pixels
  MIN_CONTRAST_RATIO: 4.5,
  MAX_LINE_LENGTH: 65, // characters
  VOICE_SPEECH_RATE: 0.8, // slower for elderly
  VOICE_VOLUME: 0.9,
} as const;

// Feature descriptions for dashboard
export const FEATURES_DESCRIPTION = {
  MEDICATION_CHECK: {
    title: 'Check My Medications',
    description: 'AI-powered analysis to check for medication conflicts',
    icon: 'pill',
  },
  HEALTH_QA: {
    title: 'Ask Health Questions',
    description: 'Get answers to general health questions from our AI',
    icon: 'message-circle',
  },
  MY_ACCOUNT: {
    title: 'My Account',
    description: 'Manage your profile and preferences',
    icon: 'user',
  },
} as const;

// Email templates config
export const EMAIL_CONFIG = {
  FROM: 'Careguide <admin@myguide.health>',
  REPLY_TO: 'support@myguide.health',
  SUBJECTS: {
    WELCOME: 'Welcome to Careguide',
    PASSWORD_RESET: 'Reset Your Password',
    MEDICATION_REMINDER: 'Medication Safety Reminder',
  },
} as const;