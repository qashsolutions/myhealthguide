/**
 * Voice Navigation System
 *
 * Enables voice-based navigation throughout the app.
 * Supports fuzzy matching for natural language commands.
 */

export interface VoiceNavigationRoute {
  route: string;
  aliases: string[];  // All variations of the command
  description: string;
  category: 'navigation' | 'action' | 'info';
  requiresAuth: boolean;
}

export interface VoiceNavigationResult {
  type: 'navigation' | 'action' | 'help' | 'not_understood';
  route?: string;
  message: string;
  confidence: number;
  suggestions?: string[];
}

/**
 * Voice Navigation Route Configuration
 * Maps voice commands to routes with fuzzy matching aliases
 */
export const VOICE_NAVIGATION_ROUTES: VoiceNavigationRoute[] = [
  // === MAIN NAVIGATION ===
  {
    route: '/dashboard',
    aliases: [
      'dashboard', 'home', 'main', 'overview', 'start',
      'go to dashboard', 'show dashboard', 'open dashboard',
      'go home', 'take me home', 'main page'
    ],
    description: 'Dashboard overview',
    category: 'navigation',
    requiresAuth: true,
  },

  // === DAILY CARE (Merged page with tabs) ===
  {
    route: '/dashboard/daily-care',
    aliases: [
      'daily care', 'care', 'daily',
      'go to daily care', 'show daily care', 'open daily care'
    ],
    description: 'Daily care management',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/daily-care?tab=medications',
    aliases: [
      'medications', 'meds', 'medicine', 'medicines', 'drugs', 'pills',
      'go to medications', 'show medications', 'open medications',
      'go to meds', 'show meds', 'my medications', 'medication list'
    ],
    description: 'Medication tracking',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/daily-care?tab=supplements',
    aliases: [
      'supplements', 'vitamins', 'supplement',
      'go to supplements', 'show supplements', 'open supplements',
      'my vitamins', 'vitamin list'
    ],
    description: 'Supplement tracking',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/daily-care?tab=diet',
    aliases: [
      'diet', 'meals', 'food', 'nutrition', 'eating',
      'go to diet', 'show diet', 'open diet',
      'meal log', 'food log', 'what did they eat'
    ],
    description: 'Diet and meal tracking',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/daily-care?tab=activity',
    aliases: [
      'activity', 'activities', 'exercise', 'movement',
      'go to activity', 'show activity', 'open activity',
      'daily activity', 'activity log'
    ],
    description: 'Activity tracking',
    category: 'navigation',
    requiresAuth: true,
  },

  // === HEALTH PROFILE ===
  {
    route: '/dashboard/elder-profile',
    aliases: [
      'health profile', 'profile', 'elder profile', 'loved one profile',
      'go to profile', 'show profile', 'open profile',
      'medical profile', 'health info', 'health information'
    ],
    description: 'Health profile',
    category: 'navigation',
    requiresAuth: true,
  },

  // === SMART INSIGHTS ===
  {
    route: '/dashboard/insights',
    aliases: [
      'insights', 'trends', 'analysis', 'analytics overview',
      'go to insights', 'show insights', 'open insights',
      'health insights', 'care insights', 'weekly summary'
    ],
    description: 'Health insights and trends',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/analytics',
    aliases: [
      'analytics', 'reports', 'data', 'statistics', 'stats',
      'go to analytics', 'show analytics', 'open analytics',
      'health analytics', 'compliance reports'
    ],
    description: 'Analytics and reports',
    category: 'navigation',
    requiresAuth: true,
  },

  // === SAFETY ALERTS ===
  {
    route: '/dashboard/safety-alerts',
    aliases: [
      'safety alerts', 'alerts', 'safety', 'warnings',
      'go to safety alerts', 'show alerts', 'open alerts',
      'drug interactions', 'incidents', 'screening'
    ],
    description: 'Safety alerts and warnings',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/drug-interactions',
    aliases: [
      'drug interactions', 'interactions', 'drug checker',
      'go to drug interactions', 'check interactions',
      'medication interactions', 'med interactions'
    ],
    description: 'Drug interaction checker',
    category: 'navigation',
    requiresAuth: true,
  },

  // === AI FEATURES ===
  {
    route: '/dashboard/ask-ai',
    aliases: [
      'ask ai', 'ai', 'assistant', 'smart assistant',
      'go to ask ai', 'talk to ai', 'open ai',
      'health assistant', 'ai chat'
    ],
    description: 'AI health assistant',
    category: 'navigation',
    requiresAuth: true,
  },
  {
    route: '/dashboard/health-chat',
    aliases: [
      'health chat', 'chat', 'talk',
      'go to chat', 'open chat',
      'ask a question', 'health questions'
    ],
    description: 'Health chat',
    category: 'navigation',
    requiresAuth: true,
  },

  // === NOTES ===
  {
    route: '/dashboard/notes',
    aliases: [
      'notes', 'my notes', 'care notes', 'observations',
      'go to notes', 'show notes', 'open notes',
      'caregiver notes', 'daily notes'
    ],
    description: 'Personal notes',
    category: 'navigation',
    requiresAuth: true,
  },

  // === SETTINGS ===
  {
    route: '/dashboard/settings',
    aliases: [
      'settings', 'preferences', 'account', 'configuration', 'config',
      'go to settings', 'show settings', 'open settings',
      'my settings', 'app settings', 'account settings'
    ],
    description: 'App settings',
    category: 'navigation',
    requiresAuth: true,
  },

  // === ELDERS / LOVED ONES ===
  {
    route: '/dashboard/elders',
    aliases: [
      'elders', 'loved ones', 'family members', 'patients', 'clients',
      'go to elders', 'show elders', 'manage elders',
      'my loved ones', 'care recipients'
    ],
    description: 'Manage loved ones',
    category: 'navigation',
    requiresAuth: true,
  },

  // === PUBLIC PAGES ===
  {
    route: '/pricing',
    aliases: [
      'pricing', 'plans', 'subscription', 'cost', 'price', 'prices',
      'go to pricing', 'show pricing', 'open pricing',
      'how much', 'subscription plans', 'billing'
    ],
    description: 'Pricing and plans',
    category: 'navigation',
    requiresAuth: false,
  },
  {
    route: '/help',
    aliases: [
      'help', 'support', 'faq', 'questions',
      'go to help', 'show help', 'open help',
      'help me', 'i need help', 'get help'
    ],
    description: 'Help and support',
    category: 'navigation',
    requiresAuth: false,
  },
  {
    route: '/symptom-checker',
    aliases: [
      'symptom checker', 'symptoms', 'check symptoms',
      'go to symptom checker', 'open symptom checker',
      'i have symptoms', 'symptom check', 'feeling sick'
    ],
    description: 'Symptom checker',
    category: 'navigation',
    requiresAuth: false,
  },
  {
    route: '/community',
    aliases: [
      'community', 'care community', 'tips', 'caregiver tips',
      'go to community', 'show community', 'open community',
      'caregiver community', 'support community'
    ],
    description: 'Care community',
    category: 'navigation',
    requiresAuth: false,
  },
  {
    route: '/features',
    aliases: [
      'features', 'what can you do', 'capabilities',
      'go to features', 'show features',
      'app features', 'what features'
    ],
    description: 'App features',
    category: 'navigation',
    requiresAuth: false,
  },
  {
    route: '/about',
    aliases: [
      'about', 'about us', 'company', 'who are you',
      'go to about', 'show about',
      'about the app', 'about myguide'
    ],
    description: 'About us',
    category: 'navigation',
    requiresAuth: false,
  },

  // === ACTIONS ===
  {
    route: '/dashboard/medications/new',
    aliases: [
      'add medication', 'new medication', 'create medication',
      'add a medication', 'add med', 'new med',
      'log medication', 'add medicine'
    ],
    description: 'Add new medication',
    category: 'action',
    requiresAuth: true,
  },
  {
    route: '/dashboard/supplements/new',
    aliases: [
      'add supplement', 'new supplement', 'create supplement',
      'add a supplement', 'add vitamin', 'new vitamin'
    ],
    description: 'Add new supplement',
    category: 'action',
    requiresAuth: true,
  },
  {
    route: '/dashboard/diet/new',
    aliases: [
      'add meal', 'new meal', 'log meal', 'record meal',
      'add food', 'log food', 'what they ate',
      'add diet entry', 'log diet'
    ],
    description: 'Log a meal',
    category: 'action',
    requiresAuth: true,
  },
  {
    route: '/dashboard/notes/new',
    aliases: [
      'add note', 'new note', 'create note', 'write note',
      'add a note', 'take note', 'make note'
    ],
    description: 'Add a note',
    category: 'action',
    requiresAuth: true,
  },
  {
    route: '/dashboard/elders/new',
    aliases: [
      'add elder', 'new elder', 'add loved one', 'new loved one',
      'add a loved one', 'add family member', 'add patient'
    ],
    description: 'Add new loved one',
    category: 'action',
    requiresAuth: true,
  },
];

/**
 * Help command responses
 */
export const HELP_RESPONSE: VoiceNavigationResult = {
  type: 'help',
  message: 'Here are some things you can say:',
  confidence: 1,
  suggestions: [
    '"Go to dashboard" - Open main dashboard',
    '"Medications" - View medication list',
    '"Add medication" - Add a new medication',
    '"Diet" or "Meals" - View meal log',
    '"Insights" - View health insights',
    '"Settings" - Open settings',
    '"Help" - Show this help',
  ],
};

/**
 * Calculate similarity score between two strings using Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Check if the query contains keywords that match an alias
 */
function containsKeywords(query: string, alias: string): boolean {
  const queryWords = query.toLowerCase().split(/\s+/);
  const aliasWords = alias.toLowerCase().split(/\s+/);

  // Check if all alias words appear in the query
  return aliasWords.every(aliasWord =>
    queryWords.some(queryWord =>
      queryWord.includes(aliasWord) || aliasWord.includes(queryWord)
    )
  );
}

/**
 * Process voice navigation command
 * Uses fuzzy matching to find the best matching route
 */
export function processVoiceNavigation(
  query: string,
  isAuthenticated: boolean = false
): VoiceNavigationResult {
  const normalizedQuery = query.toLowerCase().trim();

  // Check for help commands first
  const helpAliases = ['help', 'what can i say', 'what can you do', 'commands', 'options'];
  if (helpAliases.some(alias => normalizedQuery.includes(alias))) {
    return HELP_RESPONSE;
  }

  let bestMatch: { route: VoiceNavigationRoute; score: number } | null = null;

  // Find best matching route
  for (const route of VOICE_NAVIGATION_ROUTES) {
    // Skip auth-required routes for unauthenticated users
    if (route.requiresAuth && !isAuthenticated) continue;

    for (const alias of route.aliases) {
      const normalizedAlias = alias.toLowerCase();

      // Exact match
      if (normalizedQuery === normalizedAlias) {
        return {
          type: 'navigation',
          route: route.route,
          message: `Going to ${route.description}...`,
          confidence: 1,
        };
      }

      // Query contains the alias exactly
      if (normalizedQuery.includes(normalizedAlias)) {
        const score = normalizedAlias.length / normalizedQuery.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { route, score: Math.min(score + 0.3, 0.95) };
        }
      }

      // Keyword matching
      if (containsKeywords(normalizedQuery, normalizedAlias)) {
        const score = 0.7;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { route, score };
        }
      }

      // Fuzzy matching for typos
      const similarity = similarityScore(normalizedQuery, normalizedAlias);
      if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { route, score: similarity };
      }
    }
  }

  // Return best match if confidence is high enough
  if (bestMatch && bestMatch.score >= 0.5) {
    return {
      type: 'navigation',
      route: bestMatch.route.route,
      message: `Going to ${bestMatch.route.description}...`,
      confidence: bestMatch.score,
    };
  }

  // No match found
  return {
    type: 'not_understood',
    message: "I didn't understand that command.",
    confidence: 0,
    suggestions: [
      'Try saying "Go to medications"',
      'Or say "Help" to see available commands',
    ],
  };
}

/**
 * Get all available voice commands for display
 */
export function getAvailableCommands(isAuthenticated: boolean = false): Array<{
  command: string;
  description: string;
  category: string;
}> {
  const commands: Array<{ command: string; description: string; category: string }> = [];

  for (const route of VOICE_NAVIGATION_ROUTES) {
    if (route.requiresAuth && !isAuthenticated) continue;

    // Get the primary command (first alias that starts with "go to" or the first short alias)
    const primaryAlias = route.aliases.find(a => a.startsWith('go to')) ||
                         route.aliases.find(a => a.split(' ').length === 1) ||
                         route.aliases[0];

    commands.push({
      command: `"${primaryAlias}"`,
      description: route.description,
      category: route.category,
    });
  }

  return commands;
}
