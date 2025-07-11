'use client';

import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Pill,
  Info
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
}

export function ConflictResults({ result, medications }: ConflictResultsProps): JSX.Element {
  const [expandedConflicts, setExpandedConflicts] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  // REMOVED: Audio features as requested

  // UPDATED: Get traffic light color and icon with consistent labeling
  // Ensures "Warning" label only appears for actual warning/danger states
  const getTrafficLight = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'safe':
      case 'low':
        return {
          color: 'health-safe',
          bgColor: 'health-safe-bg',
          icon: CheckCircle,
          label: 'Safe', // Clear "Safe" label for safe status
        };
      case 'warning':
      case 'moderate':
        return {
          color: 'health-warning',
          bgColor: 'health-warning-bg',
          icon: AlertTriangle,
          label: 'Caution', // "Caution" for moderate warnings
        };
      case 'danger':
      case 'high':
      case 'major':
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
      {/* Overall assessment */}
      <div className={clsx(
        'border-2 rounded-elder-lg p-6',
        `bg-${overallLight.bgColor} border-${overallLight.color}`
      )}>
        <div className="flex items-start gap-4">
          <div className={clsx(
            'p-3 rounded-elder',
            `bg-${overallLight.color} bg-opacity-20`
          )}>
            <OverallIcon className={clsx('h-8 w-8', `text-${overallLight.color}`)} />
          </div>
          
          <div className="flex-1">
            {/* UPDATED: Increased font size for better elder accessibility */}
            <h2 className="text-elder-xl elder-tablet:text-elder-2xl font-bold text-elder-text mb-2">
              Overall Assessment: {overallLight.label}
            </h2>
            
            {/* UPDATED: Use consistent elder-friendly font sizing */}
            <p className="text-elder-lg text-elder-text-secondary">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Medication list with individual assessments */}
      {medications.length > 0 && (
        <div className="bg-white border-2 border-elder-border rounded-elder-lg p-6">
          {/* UPDATED: Larger font for section headers */}
          <h3 className="text-elder-lg elder-tablet:text-elder-xl font-semibold mb-4 flex items-center gap-3">
            <Pill className="h-6 w-6 text-primary-600" />
            Medications Checked
          </h3>
          
          <ul className="space-y-2">
            {medications.map((med, index) => (
              /* UPDATED: Larger text for medication list */
              <li key={med.id || index} className="flex items-center gap-3 text-elder-base elder-tablet:text-elder-lg">
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

      {/* Interactions section - FIXED: Use interactions instead of conflicts */}
      {result.interactions && result.interactions.length > 0 && (
        <div className="space-y-4">
          {/* UPDATED: Larger font for section headers */}
          <h3 className="text-elder-lg elder-tablet:text-elder-xl font-semibold text-elder-text">
            Potential Interactions Found ({result.interactions.length})
          </h3>
          
          {result.interactions.map((interaction, index) => {
            const conflictLight = getTrafficLight(interaction.severity);
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

      {/* UPDATED: Show "No Interactions" only when status is safe */}
      {/* This prevents contradictory messages */}
      {(!result.interactions || result.interactions.length === 0) && result.overallRisk === 'safe' && (
        <div className="bg-health-safe-bg border-2 border-health-safe rounded-elder-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-health-safe mx-auto mb-3" />
          {/* UPDATED: Larger font for headers */}
          <p className="text-elder-lg elder-tablet:text-elder-xl font-semibold text-elder-text">
            No Interactions Detected
          </p>
          {/* UPDATED: Larger font for better readability */}
          <p className="text-elder-base elder-tablet:text-elder-lg text-elder-text-secondary mt-2">
            Based on our analysis, we didn't find any major interactions between your medications.
          </p>
        </div>
      )}

      {/* UPDATED: General advice section with proper formatting */}
      {/* Displays a single concise sentence (max 20 words) */}
      {result.generalAdvice && (
        <div className="bg-elder-background-alt rounded-elder-lg p-6">
          {/* UPDATED: Larger font for section headers */}
          <h3 className="text-elder-lg elder-tablet:text-elder-xl font-semibold mb-3 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-600" />
            General Advice
          </h3>
          {/* IMPORTANT: Clean the advice text to remove any JSON artifacts */}
          {/* UPDATED: Larger font for better readability */}
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
        </div>
      )}

      {/* UPDATED: Additional information with proper bullet point formatting */}
      {/* Displays up to 3 bullet points, each max 20 words */}
      {result.additionalInfo && (
        <div className="bg-elder-background-alt rounded-elder-lg p-6">
          {/* UPDATED: Larger font for section headers */}
          <h3 className="text-elder-lg elder-tablet:text-elder-xl font-semibold mb-3 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-600" />
            Additional Information
          </h3>
          {/* IMPORTANT: Format as bullet points for elder-friendly reading */}
          {/* UPDATED: Larger font for better readability */}
          <div className="text-elder-base elder-tablet:text-elder-lg text-elder-text-secondary space-y-3">
            {(() => {
              // Split by newlines to get individual bullet points
              const bulletPoints = result.additionalInfo
                .split('\n')
                .filter(line => line.trim().length > 0);
              
              const isExpanded = expandedSections['additionalInfo'];
              
              return bulletPoints.map((point, index) => {
                // Only show first 3 bullets if not expanded
                if (!isExpanded && index >= 3) return null;
                
                // Clean the bullet point text
                let cleanPoint = point.replace(/^[•\-*]\s*/, ''); // Remove existing bullets
                const words = cleanPoint.split(/\s+/).filter((w: string) => w.length > 0);
                const isLongBullet = words.length > 20;
                
                // Check if this specific bullet is expanded
                const bulletExpanded = expandedSections[`bullet-${index}`];
                
                if (!isLongBullet) {
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-primary-600 mt-1">•</span>
                      <span>{cleanPoint}</span>
                    </div>
                  );
                }
                
                return (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-primary-600 mt-1">•</span>
                    <div className="flex-1">
                      <span>
                        {bulletExpanded 
                          ? cleanPoint 
                          : words.slice(0, 20).join(' ') + '...'}
                      </span>
                      <button
                        onClick={() => setExpandedSections(prev => ({
                          ...prev,
                          [`bullet-${index}`]: !prev[`bullet-${index}`]
                        }))}
                        className="ml-2 text-primary-600 hover:text-primary-700 font-semibold text-elder-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                      >
                        {bulletExpanded ? 'Show less' : 'Read more'}
                      </button>
                    </div>
                  </div>
                );
              }).filter(Boolean);
            })()}
            {(() => {
              const totalBullets = result.additionalInfo.split('\n').filter(line => line.trim().length > 0).length;
              const isExpanded = expandedSections['additionalInfo'];
              
              if (totalBullets > 3) {
                return (
                  <button
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      additionalInfo: !prev.additionalInfo
                    }))}
                    className="mt-3 text-primary-600 hover:text-primary-700 font-semibold text-elder-base focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    {isExpanded ? 'Show less' : `Show ${totalBullets - 3} more`}
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}