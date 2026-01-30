'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

// Smart Feature data with icons, descriptions, and dashboard routes
const SMART_FEATURES = [
  {
    id: 'drug-interactions',
    title: 'Drug Interaction Alerts',
    description: 'Checks medications against each other. Warns you before problems happen.',
    route: '/dashboard/drug-interactions',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#FEE2E2" />
        <rect x="20" y="24" width="10" height="18" rx="5" fill="#EF4444" />
        <rect x="34" y="22" width="10" height="18" rx="5" fill="#F97316" transform="rotate(30 39 31)" />
        <circle cx="48" cy="16" r="6" fill="#DC2626" />
        <path d="M48 13v3M48 19v1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    preview: {
      headline: 'Never miss a dangerous combination',
      bullets: [
        'Scans all medications for conflicts',
        'Alerts for food-drug interactions',
        'Severity ratings for each warning'
      ]
    }
  },
  {
    id: 'caregiver-burnout',
    title: 'Caregiver Wellness Check',
    description: 'Tracks your workload patterns. Alerts when you need a break.',
    route: '/dashboard/caregiver-burnout',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#FEF3C7" />
        <circle cx="32" cy="26" r="10" fill="#F59E0B" />
        <path d="M32 36v8" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 48h12" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="28" cy="24" r="2" fill="white" />
        <circle cx="36" cy="24" r="2" fill="white" />
        <path d="M28 29c0 2 2 3 4 3s4-1 4-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    preview: {
      headline: 'Your wellbeing matters too',
      bullets: [
        'Tracks hours and stress patterns',
        'Predicts burnout before it happens',
        'Suggests when to take breaks'
      ]
    }
  },
  {
    id: 'adherence-insights',
    title: 'Adherence Insights',
    description: 'Spots missed dose patterns. Helps improve medication routines.',
    route: '/dashboard/insights',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#DBEAFE" />
        <rect x="18" y="20" width="28" height="26" rx="3" fill="#3B82F6" />
        <path d="M22 28h20M22 34h14M22 40h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="46" cy="18" r="8" fill="#10B981" />
        <path d="M43 18l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    preview: {
      headline: 'Understand medication patterns',
      bullets: [
        'Weekly compliance reports',
        'Identifies problem times',
        'Personalized improvement tips'
      ]
    }
  },
  {
    id: 'dementia-screening',
    title: 'Cognitive Health Screening',
    description: 'Track cognitive changes over time. Share reports with doctors.',
    route: '/dashboard/dementia-screening',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#E0E7FF" />
        <circle cx="32" cy="26" r="12" fill="#6366F1" fillOpacity="0.3" />
        <path d="M24 22c2-3 5-5 8-5s6 2 8 5" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
        <circle cx="27" cy="26" r="2.5" fill="#6366F1" />
        <circle cx="37" cy="26" r="2.5" fill="#6366F1" />
        <path d="M32 34v6M28 40h8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    preview: {
      headline: 'Early detection saves lives',
      bullets: [
        'Simple screening assessments',
        'Tracks changes over months',
        'Shareable reports for doctors'
      ]
    }
  },
  {
    id: 'schedule-conflicts',
    title: 'Schedule Conflict Detection',
    description: 'Flags overlapping medications or appointments automatically.',
    route: '/dashboard/medications',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#FCE7F3" />
        <rect x="16" y="20" width="18" height="22" rx="2" fill="#EC4899" />
        <rect x="30" y="22" width="18" height="22" rx="2" fill="#F472B6" />
        <path d="M20 28h10M20 34h6M34 30h10M34 36h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="48" cy="16" r="6" fill="#EC4899" />
        <path d="M48 13v4M48 19v1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    preview: {
      headline: 'Prevent scheduling mistakes',
      bullets: [
        'Detects medication overlaps',
        'Flags appointment conflicts',
        'Smart timing suggestions'
      ]
    }
  },
  {
    id: 'health-trends',
    title: 'Health Trend Analysis',
    description: "See what's improving or declining. Charts make it clear.",
    route: '/dashboard/insights',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#D1FAE5" />
        <path d="M16 42l10-10 8 6 12-16" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="42" r="3" fill="#10B981" />
        <circle cx="26" cy="32" r="3" fill="#10B981" />
        <circle cx="34" cy="38" r="3" fill="#10B981" />
        <circle cx="46" cy="22" r="3" fill="#10B981" />
      </svg>
    ),
    preview: {
      headline: 'Visualize health over time',
      bullets: [
        'Weekly and monthly charts',
        'Spot improvements instantly',
        'Share trends with care team'
      ]
    }
  },
  {
    id: 'nutrition-analysis',
    title: 'Smart Nutrition Analysis',
    description: 'Age-aware meal scoring. Condition-specific dietary guidance.',
    route: '/dashboard/nutrition-analysis',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#FEF3C7" />
        <ellipse cx="32" cy="34" rx="14" ry="10" fill="#F59E0B" />
        <ellipse cx="32" cy="32" rx="12" ry="8" fill="#FCD34D" />
        <circle cx="26" cy="30" r="3" fill="#10B981" />
        <circle cx="36" cy="32" r="2.5" fill="#EF4444" />
        <circle cx="32" cy="35" r="2" fill="#8B5CF6" />
        <path d="M32 18v-4M30 16l2-2 2 2" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    preview: {
      headline: 'Personalized nutrition insights',
      bullets: [
        'Scores meals for seniors',
        'Flags condition-specific concerns',
        'Tracks daily macro intake'
      ]
    }
  },
  {
    id: 'refill-prediction',
    title: 'Medication Refill Alerts',
    description: 'Predicts when medications run low. Never run out again.',
    route: '/dashboard/medications',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#DBEAFE" />
        <rect x="22" y="18" width="20" height="28" rx="4" fill="#3B82F6" />
        <rect x="22" y="18" width="20" height="12" fill="#60A5FA" rx="4" />
        <path d="M28 26h8M32 22v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="46" cy="46" r="10" fill="#F59E0B" />
        <path d="M46 42v5l3 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    preview: {
      headline: 'Stay ahead of refills',
      bullets: [
        'Tracks medication supply',
        'Predicts refill dates',
        'Sends timely reminders'
      ]
    }
  },
  {
    id: 'health-chat',
    title: 'Health Assistant',
    description: 'Ask health questions in plain English. Get helpful information.',
    route: '/dashboard/health-chat',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
        <circle cx="32" cy="32" r="28" fill="#E0E7FF" />
        <rect x="14" y="18" width="28" height="22" rx="4" fill="#6366F1" />
        <path d="M22 42l-4 6v-6h-4" fill="#6366F1" />
        <circle cx="24" cy="29" r="2" fill="white" />
        <circle cx="32" cy="29" r="2" fill="white" />
        <circle cx="40" cy="29" r="2" fill="white" />
        <circle cx="48" cy="16" r="8" fill="#10B981" />
        <path d="M45 16h6M48 13v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    preview: {
      headline: 'Your health questions answered',
      bullets: [
        'Ask in plain English',
        'Get easy-to-understand info',
        'Not medical advice - just helpful context'
      ]
    }
  }
];

// Preview Modal Component
function PreviewModal({
  feature,
  onClose,
  onSignUp
}: {
  feature: typeof SMART_FEATURES[0];
  onClose: () => void;
  onSignUp: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-2">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold">{feature.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {feature.preview.headline}
          </h4>
          <ul className="space-y-3 mb-6">
            {feature.preview.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600 dark:text-gray-300">{bullet}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={onSignUp}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try Free for 15 Days
          </button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
            No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SmartFeaturesGrid() {
  const { user } = useAuth();
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<typeof SMART_FEATURES[0] | null>(null);

  const handleCardClick = (feature: typeof SMART_FEATURES[0]) => {
    if (user) {
      // Logged in - go to dashboard
      router.push(feature.route);
    } else {
      // Not logged in - show preview modal
      setSelectedFeature(feature);
    }
  };

  const handleSignUp = () => {
    setSelectedFeature(null);
    router.push('/signup');
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SMART_FEATURES.map((feature) => {
          const isHovered = hoveredId === feature.id;

          return (
            <div
              key={feature.id}
              className={`
                bg-white dark:bg-gray-800 rounded-xl cursor-pointer
                transition-all duration-300 ease-out overflow-hidden
                ${isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-md hover:shadow-lg'}
              `}
              onMouseEnter={() => setHoveredId(feature.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleCardClick(feature)}
            >
              {/* Collapsed State - Just icon and title */}
              <div className={`p-4 ${isHovered ? 'pb-2' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    {feature.title}
                  </h3>
                </div>
              </div>

              {/* Expanded State - Description */}
              <div
                className={`
                  px-4 overflow-hidden transition-all duration-300 ease-out
                  ${isHovered ? 'max-h-24 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'}
                `}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
                <div className="mt-2 flex items-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                  {user ? 'Go to feature →' : 'Learn more →'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {selectedFeature && (
        <PreviewModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
          onSignUp={handleSignUp}
        />
      )}
    </>
  );
}
