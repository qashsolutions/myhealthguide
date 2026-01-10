'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Zap,
  Apple,
  Wind,
  Heart,
  Brain,
  Footprints,
  Hand,
  Smile,
  Moon,
  Droplet,
  Eye,
  Thermometer,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  COMMON_SYMPTOMS,
  SYMPTOM_CATEGORIES,
  type SymptomCategory,
  type CommonSymptom,
  searchSymptoms,
  getSymptomsByCategory,
} from '@/lib/symptom-checker/commonSymptoms';
import { cn } from '@/lib/utils';

interface CommonSymptomsSelectorProps {
  onSelect: (symptom: CommonSymptom) => void;
  className?: string;
}

// Map category icons to Lucide components
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Zap,
  Apple,
  Wind,
  Heart,
  Brain,
  Footprints,
  Hand,
  Smile,
  Moon,
  Droplet,
  Eye,
  Thermometer,
};

// Urgency badge colors
const URGENCY_COLORS: Record<CommonSymptom['urgencyHint'], string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  emergency: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const URGENCY_LABELS: Record<CommonSymptom['urgencyHint'], string> = {
  low: 'Low',
  moderate: 'Moderate',
  urgent: 'Urgent',
  emergency: 'Emergency',
};

export function CommonSymptomsSelector({ onSelect, className }: CommonSymptomsSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SymptomCategory | 'all'>('all');

  // Filter symptoms based on search and category
  const filteredSymptoms = useMemo(() => {
    let symptoms: CommonSymptom[];

    if (searchQuery.trim()) {
      symptoms = searchSymptoms(searchQuery);
    } else if (selectedCategory === 'all') {
      symptoms = COMMON_SYMPTOMS;
    } else {
      symptoms = getSymptomsByCategory(selectedCategory);
    }

    return symptoms;
  }, [searchQuery, selectedCategory]);

  // Get category counts for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: COMMON_SYMPTOMS.length };
    for (const category of Object.keys(SYMPTOM_CATEGORIES) as SymptomCategory[]) {
      counts[category] = getSymptomsByCategory(category).length;
    }
    return counts;
  }, []);

  const handleSelect = (symptom: CommonSymptom) => {
    onSelect(symptom);
    setIsExpanded(false);
    setSearchQuery('');
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          'w-full p-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-700',
          'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
          'text-blue-600 dark:text-blue-400 text-sm font-medium',
          'flex items-center justify-center gap-2 transition-colors',
          className
        )}
      >
        <Search className="w-4 h-4" />
        Browse 100 Common Health Issues
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <Card className={cn('border-blue-200 dark:border-blue-800', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Common Health Issues
            <Badge variant="secondary" className="ml-1 text-xs flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Offline Ready
            </Badge>
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-8 px-2"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select a common issue to quickly describe symptoms
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              selectedCategory === 'all' && !searchQuery
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            All ({categoryCounts.all})
          </button>
          {(Object.keys(SYMPTOM_CATEGORIES) as SymptomCategory[]).map((category) => {
            const config = SYMPTOM_CATEGORIES[category];
            const IconComponent = CATEGORY_ICONS[config.icon] || Thermometer;
            const isSelected = selectedCategory === category && !searchQuery;

            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setSearchQuery('');
                }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <IconComponent className="w-3 h-3" />
                {config.label.split(' ')[0]} ({categoryCounts[category]})
              </button>
            );
          })}
        </div>

        {/* Symptoms List */}
        <div className="h-[250px] overflow-y-auto rounded-md border">
          <div className="p-2 space-y-1.5">
            {filteredSymptoms.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No symptoms found matching your search
              </div>
            ) : (
              filteredSymptoms.map((symptom) => {
                const categoryConfig = SYMPTOM_CATEGORIES[symptom.category];
                const IconComponent = CATEGORY_ICONS[categoryConfig.icon] || Thermometer;

                return (
                  <button
                    key={symptom.id}
                    type="button"
                    onClick={() => handleSelect(symptom)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors',
                      'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      symptom.urgencyHint === 'emergency' && 'border-red-200 dark:border-red-800'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-1.5 rounded-lg flex-shrink-0',
                        symptom.urgencyHint === 'emergency'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-gray-100 dark:bg-gray-800'
                      )}>
                        {symptom.urgencyHint === 'emergency' ? (
                          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {symptom.title}
                          </span>
                          <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded',
                            URGENCY_COLORS[symptom.urgencyHint]
                          )}>
                            {URGENCY_LABELS[symptom.urgencyHint]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {symptom.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Emergency Warning */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            For emergencies (chest pain, stroke symptoms, severe bleeding), call <strong>911 immediately</strong>.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
