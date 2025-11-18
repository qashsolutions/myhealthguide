'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ExternalLink, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { FDADrugLabelData } from '@/lib/medical/fdaApi';
import { format } from 'date-fns';

interface FDADataDisplayProps {
  fdaData: FDADrugLabelData;
  medicationName: string;
}

export function FDADataDisplay({ fdaData, medicationName }: FDADataDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Persistent Warning Banner */}
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="font-semibold text-red-900 dark:text-red-100">
            This is FDA drug label information - NOT medical advice
          </p>
        </div>
        <p className="text-sm text-red-800 dark:text-red-200 mt-2">
          Consult your doctor or pharmacist before making any medication decisions.
        </p>
      </div>

      {/* Source Attribution */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Data Source
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              U.S. Food and Drug Administration (FDA) Drug Label Database
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Fetched: {format(fdaData.fetchedAt, 'MMM d, yyyy')}</span>
              <span>•</span>
              <a
                href={fdaData.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                View FDA Source
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Drug Names */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-600 dark:bg-purple-700 rounded-lg">
            <Info className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Drug Identification
          </h3>
        </div>

        <div className="grid gap-3">
          {fdaData.brandName.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs uppercase font-semibold text-purple-700 dark:text-purple-400">
                  Brand Name{fdaData.brandName.length > 1 ? 's' : ''}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {fdaData.brandName.join(', ')}
                </span>
              </div>
            </div>
          )}

          {fdaData.genericName.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs uppercase font-semibold text-purple-700 dark:text-purple-400">
                  Generic Name{fdaData.genericName.length > 1 ? 's' : ''}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {fdaData.genericName.join(', ')}
                </span>
              </div>
            </div>
          )}

          {fdaData.substanceName.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs uppercase font-semibold text-purple-700 dark:text-purple-400">
                  Active Substance{fdaData.substanceName.length > 1 ? 's' : ''}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {fdaData.substanceName.join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* DRUG INTERACTIONS - VERBATIM */}
      {fdaData.drugInteractions && fdaData.drugInteractions.length > 0 && (
        <FDASection
          title="Drug Interactions"
          fdaTexts={fdaData.drugInteractions}
          severity="warning"
        />
      )}

      {/* CONTRAINDICATIONS - VERBATIM */}
      {fdaData.contraindications && fdaData.contraindications.length > 0 && (
        <FDASection
          title="Contraindications"
          fdaTexts={fdaData.contraindications}
          severity="critical"
        />
      )}

      {/* WARNINGS AND CAUTIONS - VERBATIM */}
      {fdaData.warningsAndCautions && fdaData.warningsAndCautions.length > 0 && (
        <FDASection
          title="Warnings and Cautions"
          fdaTexts={fdaData.warningsAndCautions}
          severity="warning"
        />
      )}

      {/* ADVERSE REACTIONS - VERBATIM */}
      {fdaData.adverseReactions && fdaData.adverseReactions.length > 0 && (
        <FDASection
          title="Adverse Reactions (Side Effects)"
          fdaTexts={fdaData.adverseReactions}
          severity="info"
        />
      )}

      {/* DOSAGE AND ADMINISTRATION - VERBATIM */}
      {fdaData.dosageAndAdministration && fdaData.dosageAndAdministration.length > 0 && (
        <FDASection
          title="Dosage and Administration"
          fdaTexts={fdaData.dosageAndAdministration}
          severity="info"
        />
      )}

      {/* USE IN SPECIFIC POPULATIONS - VERBATIM */}
      {fdaData.useInSpecificPopulations && fdaData.useInSpecificPopulations.length > 0 && (
        <FDASection
          title="Use in Specific Populations"
          fdaTexts={fdaData.useInSpecificPopulations}
          severity="info"
        />
      )}

      {/* Bottom Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-900 dark:text-yellow-100 font-medium">
          ⚠️ REMINDER: This information is from the FDA drug label and is NOT medical advice for
          this specific patient.
        </p>
        <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-2">
          Always consult a qualified healthcare professional before making decisions about
          medications. Call 911 for medical emergencies.
        </p>
      </div>
    </div>
  );
}

/**
 * Display a section of FDA data VERBATIM with collapsible functionality
 */
function FDASection({
  title,
  fdaTexts,
  severity
}: {
  title: string;
  fdaTexts: string[];
  severity: 'critical' | 'warning' | 'info';
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const severityStyles = {
    critical: {
      border: 'border-l-4 border-red-500',
      headerBg: 'bg-red-50 dark:bg-red-900/20',
      contentBg: 'bg-white dark:bg-gray-900',
      icon: <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />,
      iconColor: 'text-red-600 dark:text-red-400'
    },
    warning: {
      border: 'border-l-4 border-yellow-500',
      headerBg: 'bg-yellow-50 dark:bg-yellow-900/20',
      contentBg: 'bg-white dark:bg-gray-900',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    info: {
      border: 'border-l-4 border-blue-500',
      headerBg: 'bg-blue-50 dark:bg-blue-900/20',
      contentBg: 'bg-white dark:bg-gray-900',
      icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  };

  const style = severityStyles[severity];

  // Helper to format FDA text with better structure
  const formatFDAText = (text: string) => {
    // Split by double newlines for paragraphs, or by numbered sections
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    return paragraphs.map((paragraph, idx) => (
      <p key={idx} className="text-gray-800 dark:text-gray-200 leading-relaxed mb-3 last:mb-0">
        {paragraph.trim()}
      </p>
    ));
  };

  return (
    <Card className={`${style.border} overflow-hidden`}>
      {/* Section Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full ${style.headerBg} p-5 flex items-center justify-between hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          {style.icon}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {fdaTexts.length} {fdaTexts.length === 1 ? 'section' : 'sections'} • Click to {isExpanded ? 'collapse' : 'expand'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className={`h-5 w-5 ${style.iconColor}`} />
        ) : (
          <ChevronDown className={`h-5 w-5 ${style.iconColor}`} />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className={`${style.contentBg} p-5 border-t border-gray-200 dark:border-gray-700`}>
          {/* Attribution */}
          <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              📋 The following text is reproduced <strong>VERBATIM</strong> from the FDA drug label database:
            </p>
          </div>

          {/* FDA Text - VERBATIM with improved formatting */}
          <div className="space-y-5">
            {fdaTexts.map((text, index) => (
              <div key={index} className="relative">
                {/* Section number badge if multiple sections */}
                {fdaTexts.length > 1 && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                      Section {index + 1} of {fdaTexts.length}
                    </span>
                  </div>
                )}

                {/* VERBATIM FDA TEXT with paragraph formatting */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-sm">
                    {formatFDAText(text)}
                  </div>
                </div>

                {/* Divider between sections */}
                {index < fdaTexts.length - 1 && (
                  <div className="mt-4 border-b border-gray-200 dark:border-gray-700" />
                )}
              </div>
            ))}
          </div>

          {/* Section-specific disclaimer */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic flex items-center gap-2">
              <Info className="h-3 w-3" />
              End of FDA {title} section. Always discuss this information with your healthcare provider before making any decisions.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
