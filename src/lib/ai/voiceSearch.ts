/**
 * Voice Search Service - Gemini 3 Pro Integration
 *
 * Enables voice-powered search across entire webapp:
 * - Pricing information
 * - Feature descriptions
 * - Help articles
 * - User data (medications, elders, schedules)
 * - Settings and configuration
 *
 * Uses Gemini 3 Pro for semantic understanding and intelligent routing
 */

import { PRICING } from '@/lib/constants/pricing';

export interface VoiceSearchQuery {
  query: string;
  userId: string;
  context?: {
    currentPage?: string;
    groupId?: string;
    agencyId?: string;
    userPermissions?: {
      // Subscription info
      subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
      subscriptionTier?: 'family' | 'single_agency' | 'multi_agency' | null;
      emailVerified: boolean;
      phoneVerified: boolean;

      // Group permissions
      groups: Array<{
        groupId: string;
        role: 'admin' | 'member';
      }>;

      // Agency permissions
      agencies: Array<{
        agencyId: string;
        role: 'super_admin' | 'caregiver_admin' | 'caregiver' | 'family_member';
        assignedElderIds?: string[]; // For caregivers with limited access
      }>;
    };
  };
}

export interface VoiceSearchResult {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: Array<{
    type: 'pricing' | 'feature' | 'help' | 'user_data' | 'settings';
    title: string;
    content: string;
    url?: string;
  }>;
  suggestedActions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
  audioResponse?: string; // Base64 encoded audio (future enhancement)
}

/**
 * Static content knowledge base
 * This will be indexed for voice search
 */
const SEARCH_KNOWLEDGE_BASE = {
  pricing: {
    family: {
      title: 'Family Plan',
      price: PRICING.FAMILY.MONTHLY_RATE,
      description: `The Family plan costs $${PRICING.FAMILY.MONTHLY_RATE} per month. It includes 1 admin plus 1 member, up to ${PRICING.FAMILY.MAX_ELDERS} elders, 25 MB storage, voice-powered logging, medication and diet tracking, and AI health insights. Perfect for small families.`,
      url: '/pricing',
    },
    single: {
      title: 'Single Agency Plan',
      price: PRICING.SINGLE_AGENCY.MONTHLY_RATE,
      description: `The Single Agency plan costs $${PRICING.SINGLE_AGENCY.MONTHLY_RATE} per month. It includes 1 admin plus up to ${PRICING.SINGLE_AGENCY.MAX_MEMBERS - 1} members, up to ${PRICING.SINGLE_AGENCY.MAX_ELDERS} elders, 50 MB storage, real-time collaboration, and weekly health reports. Ideal for families and caregivers.`,
      url: '/pricing',
    },
    multi: {
      title: 'Multi Agency Plan',
      price: PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE,
      description: `The Multi Agency plan costs $${PRICING.MULTI_AGENCY.ELDER_MONTHLY_RATE} per elder per month. It includes up to ${PRICING.MULTI_AGENCY.MAX_CAREGIVERS} caregivers, up to ${PRICING.MULTI_AGENCY.MAX_ELDERS} elders total, ${PRICING.MULTI_AGENCY.BILLING_CYCLE_DAYS}-day billing cycles, 500 MB storage, agency dashboard and analytics, and compliance tracking. Perfect for professional caregivers.`,
      url: '/pricing',
    },
    trial: {
      title: '14-Day Free Trial',
      description: 'All plans include a 14-day free trial. You can cancel anytime during the trial for a full refund. No credit card required upfront.',
      url: '/pricing',
    },
    refund: {
      title: 'Refund Policy',
      description: `We offer a ${PRICING.MULTI_AGENCY.REFUND_WINDOW_DAYS}-day full refund window. If you're not satisfied, you can cancel within ${PRICING.MULTI_AGENCY.REFUND_WINDOW_DAYS} days for a complete refund.`,
      url: '/pricing',
    },
  },
  features: {
    voice: {
      title: 'Voice-Powered Logging',
      description: 'Use your voice to quickly log medications, meals, and health observations. Our AI transcribes and categorizes your entries automatically.',
      url: '/features',
    },
    ai_insights: {
      title: 'AI Health Insights',
      description: 'Get intelligent daily summaries, pattern detection, and proactive health alerts powered by Google Gemini 3 Pro and MedGemma medical AI.',
      url: '/features',
    },
    medication: {
      title: 'Medication Tracking',
      description: 'Track medications, set reminders, monitor compliance, and detect missed doses. Generate clinical reports for doctor visits.',
      url: '/dashboard/medications',
    },
    diet: {
      title: 'Diet Tracking',
      description: 'Log meals with voice or text, get nutritional analysis, and track dietary patterns over time.',
      url: '/dashboard/diet',
    },
    collaboration: {
      title: 'Real-Time Collaboration',
      description: 'Invite family members and caregivers to collaborate. Share updates via SMS and email notifications.',
      url: '/dashboard/settings',
    },
  },
  help: {
    // ADMIN/SUPER ADMIN ONLY (Write access)
    add_elder: {
      title: 'How to Add an Elder',
      description: 'Go to Dashboard → Elders → Add Elder. Fill in their name, age, and medical information. You can add photos and medical conditions. (Admin only)',
      url: '/dashboard/elders',
      requiredRole: 'admin', // Admin or Super Admin only
    },
    add_member: {
      title: 'How to Invite a Member',
      description: 'Go to Dashboard → Settings → Team Members → Invite Member. Enter their email address and select their role (Admin or Member). (Admin only)',
      url: '/dashboard/settings',
      requiredRole: 'admin', // Admin only
    },
    add_caregiver: {
      title: 'How to Invite a Caregiver',
      description: 'Go to Dashboard → Agency → Caregivers → Add Caregiver. Enter their email, assign elders, and set permissions. (Super Admin only)',
      url: '/dashboard/settings',
      requiredRole: 'super_admin', // Super Admin only
    },
    add_medication: {
      title: 'How to Add a Medication',
      description: 'Go to Dashboard → Medications → Add Medication. Enter the medication name, dosage, frequency, and schedule. You can also use voice logging. (Admin/Caregiver only)',
      url: '/dashboard/medications',
      requiredRole: 'write', // Admin, Super Admin, Caregiver Admin, Caregiver
    },
    delete_data: {
      title: 'How to Delete Data',
      description: 'Admins can delete elders, medications, and logs. Go to the item and click the delete button. (Admin only)',
      url: '/dashboard',
      requiredRole: 'admin', // Admin or Super Admin only
    },

    // READ-ONLY (Members can access)
    view_medications: {
      title: 'How to View Medications',
      description: 'Go to Dashboard → Medications to view all medication schedules, logs, and compliance reports. Members have read-only access.',
      url: '/dashboard/medications',
      requiredRole: 'read', // Everyone including members
    },
    view_diet: {
      title: 'How to View Diet Logs',
      description: 'Go to Dashboard → Diet to view meal logs and nutritional analysis. Members have read-only access.',
      url: '/dashboard/diet',
      requiredRole: 'read',
    },
    view_reports: {
      title: 'How to View Reports',
      description: 'Go to Dashboard → Insights to view AI-generated health summaries and compliance reports. Members have read-only access.',
      url: '/dashboard/insights',
      requiredRole: 'read',
    },
    cancel_subscription: {
      title: 'How to Cancel Subscription',
      description: 'Go to Dashboard → Settings → Subscription → Manage Subscription. You can cancel anytime. If within 7 days, you\'ll receive a full refund. (Admin only)',
      url: '/dashboard/settings',
      requiredRole: 'admin', // Only admins can manage billing
    },
    voice_logging: {
      title: 'How to Use Voice Logging',
      description: 'Click the microphone icon on any logging page (medications, diet, vitals). Speak naturally, and our AI will transcribe and categorize your entry. (Admin/Caregiver only)',
      url: '/dashboard',
      requiredRole: 'write', // Only users with write access can log
    },
  },
};

/**
 * Process voice search query using Gemini 3 Pro
 */
export async function processVoiceSearch(
  query: VoiceSearchQuery
): Promise<VoiceSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      answer: "Voice search is currently unavailable. Please try again later.",
      confidence: 'low',
      sources: [],
    };
  }

  try {
    // Check if user is authenticated
    const isPublicUser = !query.context?.userPermissions;

    // Build context from knowledge base with permission filtering
    const knowledgeContext = buildKnowledgeContext(query.context?.userPermissions);

    // Create prompt for Gemini 3 Pro
    const prompt = `You are a helpful AI assistant for myguide.health, an elder care management platform.

AVAILABLE KNOWLEDGE:
${knowledgeContext}

USER QUESTION: "${query.query}"
${query.context?.currentPage ? `Current Page: ${query.context.currentPage}` : ''}
${isPublicUser ? 'USER STATUS: Public user (not logged in)' : 'USER STATUS: Authenticated user'}

TASK:
1. Understand the user's intent
2. Find the most relevant information from the knowledge base
3. Provide a concise, helpful answer (2-3 sentences max)
4. If the question is about user-specific data (e.g., "What medications is Mom taking?"):
   ${isPublicUser ? '- Tell them they need to sign up/login to access personal data' : '- Acknowledge that you need to check their account'}
5. ALWAYS be helpful, friendly, and supportive

IMPORTANT:
- If asking about pricing, provide exact numbers
- If asking about features, explain clearly how to use them
- If asking "how to" questions, provide step-by-step guidance
${isPublicUser ? '- If public user asks about personal data features, encourage them to sign up for 14-day free trial' : ''}
- If you don't know, suggest contacting support

Respond in JSON format:
{
  "answer": "your helpful response",
  "confidence": "high|medium|low",
  "sources": [
    {
      "type": "pricing|feature|help|user_data|settings",
      "title": "source title",
      "content": "relevant excerpt",
      "url": "/path/to/page"
    }
  ],
  "suggestedActions": [
    {
      "label": "button text",
      "action": "navigation|external",
      "url": "/path"
    }
  ]
}`;

    // Call Gemini 3 Pro
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3, // Lower for factual accuracy
            maxOutputTokens: 1024,
            thinking_config: {
              include_thoughts: false // Quick search doesn't need deep reasoning
            }
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return result as VoiceSearchResult;
    }

    // Fallback if parsing fails
    return {
      answer: generatedText,
      confidence: 'medium',
      sources: [],
    };

  } catch (error) {
    console.error('Voice search error:', error);
    return {
      answer: "I encountered an error processing your search. Please try rephrasing your question.",
      confidence: 'low',
      sources: [],
      suggestedActions: [
        {
          label: 'Contact Support',
          action: 'external',
          url: '/contact',
        }
      ],
    };
  }
}

/**
 * Build knowledge context from static content with permission-based filtering
 */
function buildKnowledgeContext(permissions?: {
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'canceled';
  subscriptionTier?: 'family' | 'single_agency' | 'multi_agency' | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  groups: Array<{ groupId: string; role: 'admin' | 'member' }>;
  agencies: Array<{
    agencyId: string;
    role: 'super_admin' | 'caregiver_admin' | 'caregiver' | 'family_member';
    assignedElderIds?: string[];
  }>;
}): string {
  // PUBLIC USER (not logged in)
  if (!permissions) {
    let context = '## PUBLIC USER - LIMITED KNOWLEDGE:\n\n';

    context += '## PRICING INFORMATION:\n';
    Object.entries(SEARCH_KNOWLEDGE_BASE.pricing).forEach(([key, item]) => {
      context += `- ${item.title}: ${item.description}\n`;
    });

    context += '\n## FEATURES (Overview):\n';
    Object.entries(SEARCH_KNOWLEDGE_BASE.features).forEach(([key, item]) => {
      context += `- ${item.title}: ${item.description}\n`;
    });

    context += '\n## HOW TO GET STARTED:\n';
    context += '- Sign Up: Go to /signup for 14-day free trial\n';
    context += '- Login: Go to /login if you already have an account\n';
    context += '- Contact Us: Visit /contact for questions\n';
    context += '- View Pricing: Visit /pricing to compare plans\n';

    context += '\nIMPORTANT FOR PUBLIC USERS:\n';
    context += '- Cannot access personal health data (medications, elders, logs)\n';
    context += '- Must sign up for 14-day free trial to use the app\n';
    context += '- All plans include full features during trial\n';
    context += '- Can ask about pricing, features, and how the app works\n';

    return context;
  }

  // AUTHENTICATED USER (with permissions)
  let context = '## PRICING INFORMATION:\n';

  // Always show pricing info (public knowledge)
  Object.entries(SEARCH_KNOWLEDGE_BASE.pricing).forEach(([key, item]) => {
    context += `- ${item.title}: ${item.description}\n`;
  });

  context += '\n## FEATURES:\n';

  // Filter features based on subscription tier
  Object.entries(SEARCH_KNOWLEDGE_BASE.features).forEach(([key, item]) => {
    // Voice logging: Available to all subscribers
    // AI insights: Available to all subscribers
    // Medication tracking: Available to all subscribers
    // Diet tracking: Available to all subscribers
    // Collaboration: Single Agency and Multi Agency only

    if (key === 'collaboration') {
      if (permissions?.subscriptionTier === 'single_agency' ||
          permissions?.subscriptionTier === 'multi_agency') {
        context += `- ${item.title}: ${item.description}\n`;
      }
    } else {
      // All other features available to everyone
      context += `- ${item.title}: ${item.description}\n`;
    }
  });

  context += '\n## HELP & HOW-TO:\n';

  // Determine user's access level
  const isGroupAdmin = permissions?.groups.some(g => g.role === 'admin');
  const isSuperAdmin = permissions?.agencies.some(a => a.role === 'super_admin');
  const isCaregiverAdmin = permissions?.agencies.some(a => a.role === 'caregiver_admin');
  const isCaregiver = permissions?.agencies.some(a => a.role === 'caregiver');
  const isMemberOnly = permissions?.groups.some(g => g.role === 'member') && !isGroupAdmin && !isSuperAdmin;

  // Filter help based on role and permissions
  Object.entries(SEARCH_KNOWLEDGE_BASE.help).forEach(([key, item]: [string, any]) => {
    const requiredRole = item.requiredRole;

    // Super Admin only features
    if (requiredRole === 'super_admin') {
      if (isSuperAdmin) {
        context += `- ${item.title}: ${item.description}\n`;
      }
    }
    // Admin only features (Family/Single Agency admin OR Super Admin)
    else if (requiredRole === 'admin') {
      if (isGroupAdmin || isSuperAdmin) {
        context += `- ${item.title}: ${item.description}\n`;
      }
    }
    // Write access features (Admin, Super Admin, Caregiver Admin, Caregiver)
    else if (requiredRole === 'write') {
      if (isGroupAdmin || isSuperAdmin || isCaregiverAdmin || isCaregiver) {
        context += `- ${item.title}: ${item.description}\n`;
      }
    }
    // Read access features (everyone including members)
    else if (requiredRole === 'read') {
      context += `- ${item.title}: ${item.description}\n`;
    }
  });

  // Add detailed permission context to help AI understand user's access level
  if (permissions) {
    context += '\n## USER ACCESS LEVEL:\n';

    // Subscription status
    context += `- Subscription Status: ${permissions.subscriptionStatus}\n`;
    context += `- Subscription Tier: ${permissions.subscriptionTier || 'none'}\n`;
    context += `- Email Verified: ${permissions.emailVerified}\n`;
    context += `- Phone Verified: ${permissions.phoneVerified}\n`;

    // Group roles
    if (permissions.groups.length > 0) {
      context += `\n- Groups (${permissions.groups.length}):\n`;
      permissions.groups.forEach((group, index) => {
        context += `  ${index + 1}. Group ${group.groupId.substring(0, 8)} - Role: ${group.role}\n`;
      });

      // Check if user is admin in any group
      const isGroupAdmin = permissions.groups.some(g => g.role === 'admin');
      const isMemberOnly = permissions.groups.some(g => g.role === 'member') && !isGroupAdmin;

      if (isGroupAdmin) {
        context += '  * User is ADMIN (FULL ACCESS to all features for all elders)\n';
        context += '  * Can add/edit/delete elders, medications, logs\n';
        context += '  * Can invite/remove members\n';
        context += '  * Can manage billing and settings\n';
      } else if (isMemberOnly) {
        context += '  * User is MEMBER (READ ONLY ACCESS)\n';
        context += '  * Can VIEW all data but CANNOT add/edit/delete anything\n';
        context += '  * Cannot invite members or manage settings\n';
      }
    } else {
      context += '\n- Groups: None\n';
    }

    // Agency roles
    if (permissions.agencies.length > 0) {
      context += `\n- Agencies (${permissions.agencies.length}):\n`;
      permissions.agencies.forEach((agency, index) => {
        context += `  ${index + 1}. Agency ${agency.agencyId.substring(0, 8)} - Role: ${agency.role}\n`;
        if (agency.assignedElderIds && agency.assignedElderIds.length > 0) {
          context += `     Assigned Elders: ${agency.assignedElderIds.length}\n`;
        }
      });

      // Check user's highest agency role
      const isSuperAdmin = permissions.agencies.some(a => a.role === 'super_admin');
      const isCaregiverAdmin = permissions.agencies.some(a => a.role === 'caregiver_admin');
      const isCaregiver = permissions.agencies.some(a => a.role === 'caregiver');
      const isFamilyMember = permissions.agencies.some(a => a.role === 'family_member');

      if (isSuperAdmin) {
        context += '  * User is SUPER ADMIN (FULL ACCESS to all agency features)\n';
        context += '  * Can manage all caregivers and elders\n';
        context += '  * Can add/edit/delete any data across entire agency\n';
        context += '  * Can manage billing and agency settings\n';
      } else if (isCaregiverAdmin) {
        context += '  * User is CAREGIVER ADMIN (can manage caregivers)\n';
        context += '  * Can add/remove caregivers and assign elders\n';
        context += '  * Has write access to all elders\n';
      } else if (isCaregiver) {
        context += '  * User is CAREGIVER (limited to assigned elders)\n';
        context += '  * Can add/edit/delete data for assigned elders ONLY\n';
        context += '  * Cannot access elders not assigned to them\n';
        context += '  * Cannot manage other caregivers\n';
      } else if (isFamilyMember) {
        context += '  * User is FAMILY MEMBER (READ ONLY within agency)\n';
        context += '  * Can VIEW data but CANNOT add/edit/delete anything\n';
      }
    } else {
      context += '\n- Agencies: None\n';
    }

    // Payment status context
    if (permissions.subscriptionStatus === 'trial') {
      context += '\n- User is on FREE TRIAL (14 days)\n';
      context += '- Full features available during trial\n';
    } else if (permissions.subscriptionStatus === 'active') {
      context += '\n- User is PAYING SUBSCRIBER (full access)\n';
    } else if (permissions.subscriptionStatus === 'expired') {
      context += '\n- Subscription EXPIRED (limited access)\n';
      context += '- User should be prompted to renew\n';
    } else if (permissions.subscriptionStatus === 'canceled') {
      context += '\n- Subscription CANCELED\n';
    }

    context += '\nIMPORTANT FILTERING RULES:\n';
    context += '1. ADMINS & SUPER ADMINS: Full access to ALL features for ALL elders\n';
    context += '2. MEMBERS: READ ONLY access - can VIEW but CANNOT add/edit/delete anything\n';
    context += '3. CAREGIVERS: Write access ONLY to their assigned elders\n';
    context += '4. FAMILY MEMBERS (in agencies): READ ONLY access within agency\n';
    context += '5. ELDERS: Do NOT have user accounts - they are subjects of care, not users\n';
    context += '6. If user is MEMBER or FAMILY MEMBER, do NOT show "How to add/edit/delete" features\n';
    context += '7. If user is CAREGIVER, only show features for their assigned elders\n';
    context += '8. If subscription expired, prompt to renew\n';
    context += '9. Match response to user\'s role and subscription tier\n';
  }

  return context;
}

/**
 * Search user-specific data (medications, elders, etc.)
 * This will be implemented to query Firestore based on voice intent
 */
export async function searchUserData(
  query: string,
  userId: string,
  groupId?: string
): Promise<VoiceSearchResult> {
  // TODO: Implement Firestore queries based on voice intent
  // Example: "What medications is Dad taking?" → Query medications collection
  // Example: "When is the next dose scheduled?" → Query schedules collection

  return {
    answer: "User data search is coming soon!",
    confidence: 'low',
    sources: [],
  };
}

/**
 * Get voice search suggestions (autocomplete-style)
 */
export function getVoiceSearchSuggestions(partialQuery: string): string[] {
  const suggestions = [
    'How much does the family plan cost?',
    'What features are included?',
    'How do I add a medication?',
    'How do I invite a caregiver?',
    'When is my next billing date?',
    'How do I cancel my subscription?',
    'What medications is [elder name] taking?',
    'Show me medication compliance this week',
    'How do I use voice logging?',
  ];

  return suggestions.filter(s =>
    s.toLowerCase().includes(partialQuery.toLowerCase())
  );
}
