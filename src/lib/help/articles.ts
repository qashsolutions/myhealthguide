import { UserRole } from '@/types';

export type HelpCategory =
  | 'voice'
  | 'ai'
  | 'tracking'
  | 'safety'
  | 'notifications'
  | 'collaboration'
  | 'agency'
  | 'analytics'
  | 'security'
  | 'data';

export interface HelpArticle {
  id: string;
  title: string;
  description: string; // Brief explanation
  value: string; // Key benefit - "Save X time" or "Prevent Y issues"
  path: string; // Navigation breadcrumb
  route: string; // Actual URL/route
  roles: UserRole[]; // Who can access
  category: HelpCategory;
  tags: string[]; // For search - include synonyms
  featured: boolean; // Show in "Popular" section
  icon: string; // Lucide icon name
}

/**
 * Comprehensive Help Articles Database
 *
 * This is the single source of truth for all help documentation.
 * Search is powered by MiniSearch for fuzzy matching.
 */
export const helpArticles: HelpArticle[] = [
  // ============================================
  // VOICE-POWERED FEATURES
  // ============================================
  {
    id: 'voice-medication',
    title: 'Voice Medication Logging',
    description: 'Log medications by speaking naturally - "John took Lisinopril 10mg at 9am"',
    value: 'Save 2 minutes per medication entry',
    path: 'Dashboard → Medications → Voice Logging',
    route: '/dashboard/medications/voice',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'voice',
    tags: ['voice', 'medication', 'meds', 'pills', 'speak', 'log', 'record', 'hands-free'],
    featured: true,
    icon: 'Mic',
  },
  {
    id: 'voice-diet',
    title: 'Voice Diet Tracking',
    description: 'Record meals by speaking - "Mary ate oatmeal with blueberries for breakfast"',
    value: 'Log meals 3x faster than typing',
    path: 'Dashboard → Diet → Voice Logging',
    route: '/dashboard/diet/voice',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'voice',
    tags: ['voice', 'diet', 'food', 'meals', 'nutrition', 'eating', 'speak'],
    featured: true,
    icon: 'Utensils',
  },

  // ============================================
  // AI-DRIVEN FEATURES
  // ============================================
  {
    id: 'medgemma-hub',
    title: 'MedGemma AI Hub',
    description: 'Central hub for Google MedGemma AI - model info, consent management, and feature overview',
    value: 'Manage all AI-powered features in one place',
    path: 'Dashboard → MedGemma AI',
    route: '/dashboard/medgemma',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'ai',
    tags: ['medgemma', 'ai', 'hub', 'google', 'consent', 'models', '4b', '27b'],
    featured: true,
    icon: 'Brain',
  },
  {
    id: 'clinical-notes',
    title: 'AI Clinical Notes',
    description: 'Generate comprehensive clinical notes for doctor visits using MedGemma AI',
    value: 'Save 15 minutes per doctor visit',
    path: 'Dashboard → MedGemma AI → Clinical Notes',
    route: '/dashboard/clinical-notes',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'ai',
    tags: ['ai', 'clinical', 'notes', 'doctor', 'medgemma', 'visit', 'medical', 'summary'],
    featured: true,
    icon: 'FileText',
  },
  {
    id: 'health-chat',
    title: 'AI Health Chat',
    description: 'Ask questions about care, medications, and health using MedGemma',
    value: 'Get instant answers to health questions',
    path: 'Dashboard → MedGemma AI → Health Chat',
    route: '/dashboard/health-chat',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'ai',
    tags: ['ai', 'chat', 'ask', 'questions', 'help', 'assistant', 'gemini'],
    featured: true,
    icon: 'MessageSquare',
  },
  {
    id: 'daily-insights',
    title: 'Daily AI Health Insights',
    description: 'AI analyzes medication compliance, diet patterns, and health changes daily',
    value: 'Catch health issues 2-3 days earlier',
    path: 'Dashboard → Insights',
    route: '/dashboard/insights',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'ai',
    tags: ['ai', 'insights', 'daily', 'summary', 'analysis', 'patterns', 'health'],
    featured: true,
    icon: 'Sparkles',
  },
  {
    id: 'nutrition-analysis',
    title: 'AI Nutrition Analysis',
    description: 'AI analyzes dietary patterns and provides nutritional recommendations',
    value: 'Improve nutritional balance',
    path: 'Dashboard → Nutrition Analysis',
    route: '/dashboard/nutrition-analysis',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'ai',
    tags: ['ai', 'nutrition', 'diet', 'food', 'analysis', 'recommendations'],
    featured: false,
    icon: 'Apple',
  },

  // ============================================
  // HEALTH TRACKING
  // ============================================
  {
    id: 'add-medication',
    title: 'Add Medication',
    description: 'Add new medications with dosage, schedule, and refill tracking',
    value: 'Never miss a dose or refill',
    path: 'Dashboard → Medications → New',
    route: '/dashboard/medications/new',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'tracking',
    tags: ['medication', 'meds', 'pills', 'add', 'new', 'prescription', 'drugs'],
    featured: false,
    icon: 'Pill',
  },
  {
    id: 'medication-adherence',
    title: 'Medication Adherence Tracking',
    description: 'Monitor medication compliance with visual charts and predictions',
    value: 'Increase adherence by 30%',
    path: 'Dashboard → Medication Adherence',
    route: '/dashboard/medication-adherence',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'tracking',
    tags: ['medication', 'adherence', 'compliance', 'tracking', 'missed', 'doses'],
    featured: false,
    icon: 'TrendingUp',
  },
  {
    id: 'add-diet',
    title: 'Log Diet Entry',
    description: 'Record meals, snacks, and fluid intake with nutritional details',
    value: 'Track dietary patterns',
    path: 'Dashboard → Diet → New',
    route: '/dashboard/diet/new',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'tracking',
    tags: ['diet', 'food', 'meals', 'nutrition', 'eating', 'log', 'add'],
    featured: false,
    icon: 'Utensils',
  },
  {
    id: 'supplements',
    title: 'Supplement Tracking',
    description: 'Monitor vitamins and supplements alongside medications',
    value: 'Prevent supplement interactions',
    path: 'Dashboard → Supplements',
    route: '/dashboard/supplements',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'tracking',
    tags: ['supplements', 'vitamins', 'minerals', 'tracking'],
    featured: false,
    icon: 'Apple',
  },
  {
    id: 'add-elder',
    title: 'Add Elder',
    description: 'Add a new elder to your care group with health profile',
    value: 'Organize care for multiple elders',
    path: 'Dashboard → Elders → New',
    route: '/dashboard/elders/new',
    roles: ['admin', 'super_admin'],
    category: 'tracking',
    tags: ['elder', 'add', 'new', 'patient', 'senior', 'profile'],
    featured: false,
    icon: 'UserPlus',
  },

  // ============================================
  // MEDICAL SAFETY
  // ============================================
  {
    id: 'drug-interactions',
    title: 'Drug Interaction Checker',
    description: 'Real-time FDA drug label checking for medication interactions',
    value: 'Prevent dangerous drug combinations',
    path: 'Dashboard → Drug Interactions',
    route: '/dashboard/drug-interactions',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'safety',
    tags: ['drug', 'interactions', 'fda', 'safety', 'medications', 'warnings'],
    featured: true,
    icon: 'AlertTriangle',
  },
  {
    id: 'schedule-conflicts',
    title: 'Schedule Conflict Detection',
    description: 'Identifies timing conflicts between multiple medications',
    value: 'Optimize medication schedules',
    path: 'Dashboard → Schedule Conflicts',
    route: '/dashboard/schedule-conflicts',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'safety',
    tags: ['schedule', 'conflicts', 'timing', 'medications', 'doses'],
    featured: false,
    icon: 'Clock',
  },
  {
    id: 'dementia-screening',
    title: 'Dementia Screening',
    description: 'Pattern-based screening flags behavioral changes for professional assessment',
    value: 'Early detection of cognitive changes',
    path: 'Dashboard → Dementia Screening',
    route: '/dashboard/dementia-screening',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'safety',
    tags: ['dementia', 'screening', 'cognitive', 'assessment', 'memory', 'alzheimers'],
    featured: false,
    icon: 'Brain',
  },
  {
    id: 'caregiver-burnout',
    title: 'Caregiver Burnout Detection',
    description: 'AI monitors caregiver activity patterns and alerts for burnout risk',
    value: 'Prevent caregiver burnout',
    path: 'Dashboard → Caregiver Burnout',
    route: '/dashboard/caregiver-burnout',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'safety',
    tags: ['caregiver', 'burnout', 'stress', 'wellbeing', 'health'],
    featured: false,
    icon: 'Heart',
  },
  {
    id: 'incidents',
    title: 'Incident Reporting',
    description: 'Log and track incidents, falls, or concerning events',
    value: 'Maintain comprehensive incident records',
    path: 'Dashboard → Incidents',
    route: '/dashboard/incidents',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'safety',
    tags: ['incidents', 'falls', 'accidents', 'events', 'reporting'],
    featured: false,
    icon: 'AlertTriangle',
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  {
    id: 'alerts',
    title: 'Smart Alerts & Notifications',
    description: 'Push notifications for medication reminders, missed doses, and health changes',
    value: 'Never miss important care tasks',
    path: 'Dashboard → Alerts',
    route: '/dashboard/alerts',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'notifications',
    tags: ['alerts', 'notifications', 'reminders', 'push', 'missed', 'doses'],
    featured: false,
    icon: 'Bell',
  },

  // ============================================
  // COLLABORATION
  // ============================================
  {
    id: 'invite-members',
    title: 'Invite Family Members',
    description: 'Send secure encrypted invites to family members or caregivers',
    value: 'Coordinate care with your team',
    path: 'Dashboard → Settings → Family Members → Invite',
    route: '/dashboard/settings',
    roles: ['admin', 'super_admin'],
    category: 'collaboration',
    tags: ['invite', 'family', 'members', 'caregivers', 'team', 'collaborate'],
    featured: false,
    icon: 'UserPlus',
  },
  {
    id: 'join-group',
    title: 'Join a Care Group',
    description: 'Join an existing care group using an invite code',
    value: 'Access shared care information',
    path: 'Dashboard → Join Group',
    route: '/dashboard/join',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'collaboration',
    tags: ['join', 'group', 'invite', 'code', 'family', 'team'],
    featured: false,
    icon: 'Users',
  },
  {
    id: 'family-updates',
    title: 'Family Update Reports',
    description: 'Automated summaries for family members who dont log care daily',
    value: 'Keep family informed automatically',
    path: 'Dashboard → Family Updates',
    route: '/dashboard/family-updates',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'collaboration',
    tags: ['family', 'updates', 'reports', 'summaries', 'share'],
    featured: false,
    icon: 'FileText',
  },
  {
    id: 'activity-history',
    title: 'Activity History',
    description: 'Complete audit trail of who did what and when',
    value: 'Full accountability and transparency',
    path: 'Dashboard → Activity',
    route: '/dashboard/activity',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'collaboration',
    tags: ['activity', 'history', 'audit', 'log', 'trail', 'who', 'when'],
    featured: false,
    icon: 'Clock',
  },

  // ============================================
  // AGENCY MANAGEMENT
  // ============================================
  {
    id: 'agency-dashboard',
    title: 'Agency Dashboard',
    description: 'Multi-tenant dashboard for professional caregiving agencies',
    value: 'Manage multiple client groups efficiently',
    path: 'Dashboard → Agency',
    route: '/dashboard/agency',
    roles: ['super_admin'],
    category: 'agency',
    tags: ['agency', 'dashboard', 'management', 'multi-tenant', 'professional'],
    featured: true,
    icon: 'Building2',
  },
  {
    id: 'caregiver-assignments',
    title: 'Caregiver Assignments',
    description: 'Assign specific caregivers to specific elders with access control',
    value: 'Organize care responsibilities',
    path: 'Dashboard → Agency → Assignments',
    route: '/dashboard/agency',
    roles: ['super_admin'],
    category: 'agency',
    tags: ['caregiver', 'assignments', 'assign', 'elders', 'agency'],
    featured: false,
    icon: 'Users',
  },
  {
    id: 'agency-analytics',
    title: 'Agency Analytics',
    description: 'Aggregate compliance, alerts, and performance metrics across all groups',
    value: 'Data-driven agency management',
    path: 'Dashboard → Agency → Analytics',
    route: '/dashboard/agency',
    roles: ['super_admin'],
    category: 'agency',
    tags: ['agency', 'analytics', 'metrics', 'compliance', 'performance'],
    featured: false,
    icon: 'TrendingUp',
  },
  {
    id: 'agency-billing',
    title: 'Agency Billing',
    description: 'Per-elder billing at $30 per 31-day cycle with 7-day refund window',
    value: 'Transparent pay-per-elder pricing',
    path: 'Dashboard → Agency → Billing',
    route: '/dashboard/agency',
    roles: ['super_admin'],
    category: 'agency',
    tags: ['agency', 'billing', 'pricing', 'payment', 'subscription', 'elder'],
    featured: false,
    icon: 'DollarSign',
  },
  {
    id: 'shift-handoff',
    title: 'Shift Handoff',
    description: 'Smooth transitions between caregiver shifts with notes and updates',
    value: 'Ensure continuity of care',
    path: 'Dashboard → Shift Handoff',
    route: '/dashboard/shift-handoff',
    roles: ['caregiver', 'caregiver_admin', 'super_admin'],
    category: 'agency',
    tags: ['shift', 'handoff', 'transition', 'notes', 'caregivers'],
    featured: false,
    icon: 'ArrowRightLeft',
  },
  {
    id: 'availability',
    title: 'Caregiver Availability',
    description: 'Manage caregiver schedules and availability',
    value: 'Optimize caregiver scheduling',
    path: 'Dashboard → Availability',
    route: '/dashboard/availability',
    roles: ['caregiver', 'caregiver_admin', 'super_admin'],
    category: 'agency',
    tags: ['availability', 'schedule', 'calendar', 'caregivers', 'shifts'],
    featured: false,
    icon: 'Calendar',
  },
  {
    id: 'timesheet',
    title: 'Timesheet',
    description: 'Track caregiver hours and generate timesheets',
    value: 'Accurate payroll and billing',
    path: 'Dashboard → Timesheet',
    route: '/dashboard/timesheet',
    roles: ['caregiver', 'caregiver_admin', 'super_admin'],
    category: 'agency',
    tags: ['timesheet', 'hours', 'time', 'tracking', 'payroll'],
    featured: false,
    icon: 'Clock',
  },

  // ============================================
  // ANALYTICS
  // ============================================
  {
    id: 'calendar',
    title: 'Care Calendar',
    description: 'Visual calendar of all care activities, medications, and appointments',
    value: 'See your care schedule at a glance',
    path: 'Dashboard → Calendar',
    route: '/dashboard/calendar',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'analytics',
    tags: ['calendar', 'schedule', 'appointments', 'activities', 'visual'],
    featured: false,
    icon: 'Calendar',
  },

  // ============================================
  // SECURITY & COMPLIANCE
  // ============================================
  {
    id: 'phi-disclosures',
    title: 'PHI Disclosure Tracking',
    description: '6-year accounting of PHI disclosures for HIPAA compliance',
    value: 'HIPAA-compliant disclosure tracking',
    path: 'Dashboard → PHI Disclosures',
    route: '/dashboard/phi-disclosures',
    roles: ['admin', 'super_admin'],
    category: 'security',
    tags: ['phi', 'disclosures', 'hipaa', 'compliance', 'privacy', 'security'],
    featured: false,
    icon: 'Shield',
  },
  {
    id: 'settings',
    title: 'Account Settings',
    description: 'Manage profile, permissions, notifications, and privacy settings',
    value: 'Customize your experience',
    path: 'Dashboard → Settings',
    route: '/dashboard/settings',
    roles: ['admin', 'caregiver', 'caregiver_admin', 'super_admin'],
    category: 'security',
    tags: ['settings', 'account', 'profile', 'preferences', 'privacy'],
    featured: false,
    icon: 'Settings',
  },

  // ============================================
  // DATA MANAGEMENT
  // ============================================
  {
    id: 'export-data',
    title: 'Export All Data',
    description: 'Download all your data in JSON/CSV formats for portability',
    value: 'Full data ownership and portability',
    path: 'Dashboard → Export All Data',
    route: '/dashboard/export-all',
    roles: ['admin', 'super_admin'],
    category: 'data',
    tags: ['export', 'download', 'data', 'backup', 'portability', 'gdpr'],
    featured: false,
    icon: 'Download',
  },
  {
    id: 'documents',
    title: 'Document Management',
    description: 'Upload and organize medical documents, prescriptions, and records',
    value: 'Keep all documents in one place',
    path: 'Dashboard → Documents',
    route: '/dashboard/documents',
    roles: ['admin', 'caregiver_admin', 'super_admin'],
    category: 'data',
    tags: ['documents', 'files', 'upload', 'medical', 'records', 'prescriptions'],
    featured: false,
    icon: 'FileText',
  },
];
