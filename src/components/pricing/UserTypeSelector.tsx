'use client';

export type UserType = 'family' | 'agency' | null;

interface UserTypeSelectorProps {
  selectedType: UserType;
  onSelect: (type: UserType) => void;
}

/**
 * Family Care SVG Icon
 * Shows a person caring for another (heart + person silhouettes)
 */
function FamilyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main caregiver figure */}
      <circle cx="24" cy="16" r="8" fill="currentColor" opacity="0.9" />
      <path
        d="M12 52V42C12 36.477 16.477 32 22 32H26C31.523 32 36 36.477 36 42V52"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Elder figure (smaller, to the right) */}
      <circle cx="46" cy="22" r="6" fill="currentColor" opacity="0.6" />
      <path
        d="M38 52V44C38 40.134 41.134 37 45 37H47C50.866 37 54 40.134 54 44V52"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Heart connecting them */}
      <path
        d="M35 28C35 26 36.5 24 38.5 24C40 24 41 25 41.5 26C42 25 43 24 44.5 24C46.5 24 48 26 48 28C48 32 41.5 36 41.5 36C41.5 36 35 32 35 28Z"
        fill="#EF4444"
        opacity="0.8"
      />
    </svg>
  );
}

/**
 * Care Agency SVG Icon
 * Shows a building with multiple staff figures
 */
function AgencyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Building outline */}
      <path
        d="M8 56V20L32 8L56 20V56"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Building base */}
      <rect x="8" y="54" width="48" height="4" fill="currentColor" opacity="0.3" />

      {/* Windows - row 1 */}
      <rect x="16" y="26" width="8" height="8" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="40" y="26" width="8" height="8" rx="1" fill="currentColor" opacity="0.4" />

      {/* Windows - row 2 */}
      <rect x="16" y="40" width="8" height="8" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="40" y="40" width="8" height="8" rx="1" fill="currentColor" opacity="0.4" />

      {/* Center door */}
      <rect x="27" y="42" width="10" height="14" rx="1" fill="currentColor" opacity="0.6" />

      {/* Medical cross on building */}
      <rect x="30" y="22" width="4" height="12" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="26" y="26" width="12" height="4" rx="1" fill="currentColor" opacity="0.8" />

      {/* Staff figures at bottom */}
      <circle cx="18" cy="60" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="32" cy="60" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="46" cy="60" r="3" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function UserTypeSelector({ selectedType, onSelect }: UserTypeSelectorProps) {
  const options = [
    {
      type: 'family' as const,
      title: "I'm caring for a family member",
      description: 'Personal care management for your loved ones',
      Icon: FamilyIcon,
    },
    {
      type: 'agency' as const,
      title: 'I manage or work with a care agency',
      description: 'Professional care coordination for multiple clients',
      Icon: AgencyIcon,
    },
  ];

  return (
    <div className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Who will be using MyGuide.Health?
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select your situation to see the recommended plan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {options.map(({ type, title, description, Icon }) => {
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center text-center
                ${isSelected
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div className={`
                w-20 h-20 mb-4 transition-colors
                ${isSelected ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}
              `}>
                <Icon className="w-full h-full" />
              </div>

              {/* Text */}
              <h3 className={`
                font-semibold text-base mb-1 transition-colors
                ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}
              `}>
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
