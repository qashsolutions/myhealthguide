'use client';

import { useRouter } from 'next/navigation';
import {
  Pill,
  Leaf,
  Utensils,
  FileText,
  BarChart3,
  Home,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Suggestion } from '@/lib/suggestions/suggestionEngine';

const ICON_MAP = {
  Pill,
  Leaf,
  Utensils,
  FileText,
  BarChart3,
  Home,
  Check,
} as const;

interface SuggestionBannerProps {
  suggestions: Suggestion[];
  visible: boolean;
  onDismiss: () => void;
  onSelect: (suggestion: Suggestion) => void;
}

export function SuggestionBanner({ suggestions, visible, onDismiss, onSelect }: SuggestionBannerProps) {
  const router = useRouter();

  if (!visible || suggestions.length === 0) return null;

  const handleSelect = (suggestion: Suggestion) => {
    if (suggestion.href) {
      router.push(suggestion.href);
    }
    onSelect(suggestion);
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          What&apos;s next?
        </span>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss suggestions"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {suggestions.map((suggestion) => {
          const Icon = ICON_MAP[suggestion.icon];
          const isRecommended = suggestion.priority === 'recommended';

          return (
            <button
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors min-h-[40px]',
                isRecommended
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{suggestion.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
