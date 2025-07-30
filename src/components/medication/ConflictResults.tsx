'use client';

import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Pill,
  Info,
  AlertCircle
} from 'lucide-react';
import { MedicationCheckResult, Medication } from '@/types';
import { clsx } from 'clsx';

/**
 * Conflict results component with traffic light system
 * Displays medication check results in an accessible format
 */

interface ConflictResultsProps {
  result: MedicationCheckResult;
  medications: Medication[];
  importantReminder?: {
    title: string;
    message: string;
  };
}

export function ConflictResults({ result, medications, importantReminder }: ConflictResultsProps): JSX.Element {
  const [expandedConflicts, setExpandedConflicts] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  // REMOVED: Audio features as requested

  // UPDATED: Get traffic light color and icon with consistent labeling
  // Ensures "Warning" label only appears for actual warning/danger states
  const getTrafficLight = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'safe':
        return {
          color: 'health-safe',
          bgColor: 'health-safe-bg',
          icon: CheckCircle,
          label: 'Safe', // Clear "Safe" label for safe status
        };
      case 'warning':
        return {
          color: 'health-warning',
          bgColor: 'health-warning-bg',
          icon: AlertTriangle,
          label: 'Caution', // "Caution" for moderate warnings
        };
      case 'danger':
        return {
          color: 'health-danger',
          bgColor: 'health-danger-bg',
          icon: XCircle,
          label: 'Warning', // "Warning" only for high-risk situations
        };
      default:
        return {
          color: 'elder-text-secondary',
          bgColor: 'elder-background',
          icon: Info,
          label: 'Review Needed',
        };
    }
  };

  // Toggle conflict expansion
  const toggleConflict = (conflictId: string) => {
    setExpandedConflicts(prev => 
      prev.includes(conflictId) 
        ? prev.filter(id => id !== conflictId)
        : [...prev, conflictId]
    );
  };

  // REMOVED: Read aloud functionality as requested

  const overallLight = getTrafficLight(result.overallRisk);
  const OverallIcon = overallLight.icon;

  return (
    <div className="space-y-6">
      {/* Overall assessment with Important reminder */}
      <div className={clsx(
        'border-4 rounded-elder-lg p-6',
        overallLight.color === 'health-safe' ? 'border-green-700' :
        overallLight.color === 'health-warning' ? 'border-health-warning' :
        overallLight.color === 'health-danger' ? 'border-health-danger' :
        'border-elder-border'
      )}>
        {/* Important reminder at top of card */}
        {importantReminder && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-elder p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-elder-base text-gray-600 font-semibold mb-1">
                  {importantReminder.title}
                </p>
                <p className="text-elder-sm text-gray-500">
                  {importantReminder.message}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Overall assessment content */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-elder">
            <OverallIcon className={clsx(
              'h-8 w-8',
              overallLight.color === 'health-safe' ? 'text-green-700' :
              overallLight.color === 'health-warning' ? 'text-health-warning' :
              overallLight.color === 'health-danger' ? 'text-health-danger' :
              'text-elder-text-secondary'
            )} />
          </div>
          
          <div className="flex-1">
            
            {/* UPDATED: Use consistent elder-friendly font sizing */}
            <p className="text-elder-lg text-elder-text-secondary">
              {result.summary}
            </p>
          </div>
        </div>
        
        {/* Medications checked list - moved here */}
        {medications.length > 0 && (
          <div className="mt-6 pt-6 border-t-2 border-elder-border">
            <h3 className="text-elder-lg font-semibold mb-3 flex items-center gap-3">
              <Pill className="h-6 w-6 text-primary-600" />
              Medications Checked
            </h3>
            
            <ul className="space-y-2">
              {medications.map((med, index) => (
                <li key={med.id || index} className="flex items-center gap-3 text-elder-base">
                  <span className="text-primary-600">•</span>
                  <span className="font-medium">{med.name}</span>
                  {med.dosage && (
                    <span className="text-elder-text-secondary">({med.dosage})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Combined Additional Information section - moved inside main card */}
        {(result.generalAdvice || result.additionalInfo) && (
          <div className="mt-6 pt-6 border-t-2 border-elder-border">
            <h3 className="text-elder-lg elder-tablet:text-elder-xl font-semibold mb-3 flex items-center gap-3">
              <Info className="h-6 w-6 text-primary-600" />
              Additional Information
            </h3>
            
            <div className="space-y-4">
              {/* General advice section */}
              {result.generalAdvice && (
                <div className="text-elder-base elder-tablet:text-elder-lg text-elder-text-secondary">
                  {(() => {
                    // Clean any potential JSON string artifacts
                    let advice = result.generalAdvice;
                    
                    // Remove JSON formatting if present
                    if (advice.includes('{') || advice.includes('"overallRisk"')) {
                      // Extract just the advice portion if JSON is present
                      const match = advice.match(/"advice":\s*"([^"]+)"/);
                      if (match) {
                        advice = match[1];
                      } else {
                        // Fallback: take first sentence
                        advice = advice.split('.')[0] + '.';
                      }
                    }
                    
                    const words = advice.split(/\s+/).filter((w: string) => w.length > 0);
                    const isLongText = words.length > 25;
                    const isExpanded = expandedSections['generalAdvice'];
                    
                    if (!isLongText) {
                      return <p>{advice}</p>;
                    }
                    
                    // Find a better truncation point - end of sentence or after 25 words
                    let truncatedText = advice;
                    if (!isExpanded) {
                      const first25Words = words.slice(0, 25).join(' ');
                      
                      // Try to find the last complete sentence within the first 25 words
                      const sentences = first25Words.match(/[^.!?]+[.!?]/g);
                      if (sentences && sentences.length > 0) {
                        truncatedText = sentences.join('').trim();
                      } else {
                        // If no complete sentence, at least try to avoid cutting mid-word
                        truncatedText = first25Words;
                        // Add the rest of the current word if we cut it off
                        const remainingText = advice.substring(first25Words.length);
                        const nextWordMatch = remainingText.match(/^[^\s]+/);
                        if (nextWordMatch) {
                          truncatedText += nextWordMatch[0];
                        }
                      }
                      truncatedText += '...';
                    }
                    
                    return (
                      <>
                        <p>
                          {isExpanded ? advice : truncatedText}
                        </p>
                        <button
                          onClick={() => setExpandedSections(prev => ({
                            ...prev,
                            generalAdvice: !prev.generalAdvice
                          }))}
                          className="mt-2 text-primary-600 hover:text-primary-700 font-semibold text-elder-base focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded inline-flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>Show less <ChevronUp className="h-4 w-4" /></>
                          ) : (
                            <>Read more <ChevronDown className="h-4 w-4" /></>
                          )}
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Additional info - single sentence */}
              {result.additionalInfo && (
                <div className="text-elder-base elder-tablet:text-elder-lg text-elder-text-secondary">
                  <p>{result.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Interactions section - FIXED: Use interactions instead of conflicts */}
      {result.interactions && result.interactions.length > 0 && (
        <div className="space-y-4">
          {/* UPDATED: Larger font for section headers */}
          <h3 className="text-elder-lg elder-tablet:text-elder-xl font-semibold text-elder-text">
            Potential Interactions Found ({result.interactions.length})
          </h3>
          
          {result.interactions.map((interaction, index) => {
            // Map severity to traffic light (minor->safe, moderate->warning, major->danger)
            const severityToRisk = interaction.severity === 'minor' ? 'safe' : 
                                  interaction.severity === 'moderate' ? 'warning' : 'danger';
            const conflictLight = getTrafficLight(severityToRisk);
            const ConflictIcon = conflictLight.icon;
            const isExpanded = expandedConflicts.includes(`interaction-${index}`);
            
            return (
              <div
                key={index}
                className={clsx(
                  'border-2 rounded-elder-lg overflow-hidden transition-all',
                  `border-${conflictLight.color}`,
                  `bg-${conflictLight.bgColor}`
                )}
              >
                <button
                  onClick={() => toggleConflict(`interaction-${index}`)}
                  className="w-full p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ConflictIcon className={clsx('h-6 w-6', `text-${conflictLight.color}`)} />
                      <div>
                        {/* UPDATED: Larger font for medication interaction names */}
                        <p className="text-elder-base elder-tablet:text-elder-lg font-semibold text-elder-text">
                          {interaction.medication1} + {interaction.medication2}
                        </p>
                        <p className={clsx('text-elder-base', `text-${conflictLight.color}`)}>
                          {conflictLight.label} Risk
                        </p>
                      </div>
                    </div>
                    
                    {isExpanded ? (
                      <ChevronUp className="h-6 w-6 text-elder-text-secondary" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-elder-text-secondary" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 border-t-2 border-elder-border pt-4">
                    {/* UPDATED: Larger font for interaction description */}
                    <p className="text-elder-base elder-tablet:text-elder-lg text-elder-text mb-3">
                      {interaction.description}
                    </p>
                    
                    {interaction.recommendation && (
                      <div className="bg-white bg-opacity-50 rounded-elder p-3">
                        {/* UPDATED: Larger font for recommendation */}
                        <p className="text-elder-base font-semibold text-elder-text mb-1">
                          Recommendation:
                        </p>
                        <p className="text-elder-base text-elder-text-secondary">
                          {interaction.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}