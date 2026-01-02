'use client';

import { Heart, Shield, CheckCircle } from 'lucide-react';

export type UserType = 'family' | 'agency' | null;

interface UserTypeSelectorProps {
  selectedType: UserType;
  onSelect: (type: UserType) => void;
}

export function UserTypeSelector({ selectedType, onSelect }: UserTypeSelectorProps) {
  const options = [
    {
      type: 'family' as const,
      title: "I'm caring for a family member",
      description: 'Personal care management for your loved ones',
      Icon: Heart,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900/50',
      selectedBgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-600',
    },
    {
      type: 'agency' as const,
      title: 'I manage or work with a care agency',
      description: 'Professional care coordination for multiple clients',
      Icon: Shield,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBgColor: 'bg-purple-100 dark:bg-purple-900/50',
      selectedBgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-600',
    },
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Who will be using MyGuide.Health?
        </h2>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Select your situation to see available plans
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {options.map(({ type, title, description, Icon, iconColor, iconBgColor, selectedBgColor, borderColor }) => {
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`
                relative p-8 rounded-2xl border-2 transition-all duration-200
                flex flex-col items-center text-center min-h-[200px]
                ${isSelected
                  ? `${borderColor} ${selectedBgColor} shadow-lg scale-[1.02]`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 hover:shadow-md'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle className={`w-6 h-6 ${type === 'family' ? 'text-blue-600' : 'text-purple-600'}`} />
                </div>
              )}

              {/* Icon in circle - matching plan card style */}
              <div className={`
                inline-flex items-center justify-center w-20 h-20 rounded-full mb-5
                ${isSelected ? iconBgColor : 'bg-gray-100 dark:bg-gray-700'}
                transition-colors duration-200
              `}>
                <Icon className={`
                  w-10 h-10 transition-colors duration-200
                  ${isSelected ? iconColor : 'text-gray-400 dark:text-gray-500'}
                `} />
              </div>

              {/* Text */}
              <h3 className={`
                font-semibold text-lg mb-2 transition-colors
                ${isSelected
                  ? (type === 'family' ? 'text-blue-900 dark:text-blue-100' : 'text-purple-900 dark:text-purple-100')
                  : 'text-gray-900 dark:text-white'
                }
              `}>
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px]">
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
