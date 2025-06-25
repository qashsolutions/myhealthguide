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
  Volume2
} from 'lucide-react';
import { MedicationCheckResult, Medication } from '@/types';
import { Button } from '../ui/Button';
import { useVoice } from '@/hooks/useVoice';
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
  const { speak, isSpeaking, stopSpeaking } = useVoice();

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

  // Read results aloud
  const handleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const summary = `Medication check results. Overall risk level: ${result.overallRisk}. ${result.summary}`;
      speak(summary);
    }
  };

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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-elder-xl font-bold text-elder-text">
                Overall Assessment: {overallLight.label}
              </h2>
              
              <Button
                variant="secondary"
                size="small"
                onClick={handleReadAloud}
                icon={<Volume2 className="h-5 w-5" />}
              >
                {isSpeaking ? 'Stop' : 'Read Aloud'}
              </Button>
            </div>
            
            {/* UPDATED: Use consistent elder-friendly font sizing */}
            <p className="text-elder-base text-elder-text-secondary">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Medication list with individual assessments */}
      {medications.length > 0 && (
        <div className="bg-white border-2 border-elder-border rounded-elder-lg p-6">
          <h3 className="text-elder-lg font-semibold mb-4 flex items-center gap-3">
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

      {/* Interactions section - FIXED: Use interactions instead of conflicts */}
      {result.interactions && result.interactions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-elder-lg font-semibold text-elder-text">
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
                        <p className="text-elder-base font-semibold text-elder-text">
                          {interaction.medication1} + {interaction.medication2}
                        </p>
                        <p className={clsx('text-elder-sm', `text-${conflictLight.color}`)}>
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
                    <p className="text-elder-base text-elder-text mb-3">
                      {interaction.description}
                    </p>
                    
                    {interaction.recommendation && (
                      <div className="bg-white bg-opacity-50 rounded-elder p-3">
                        <p className="text-elder-sm font-semibold text-elder-text mb-1">
                          Recommendation:
                        </p>
                        <p className="text-elder-sm text-elder-text-secondary">
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
          <p className="text-elder-lg font-semibold text-elder-text">
            No Interactions Detected
          </p>
          <p className="text-elder-base text-elder-text-secondary mt-2">
            Based on our analysis, we didn't find any major interactions between your medications.
          </p>
        </div>
      )}

      {/* UPDATED: General advice section with proper formatting */}
      {/* Displays a single concise sentence (max 10 words) */}
      {result.generalAdvice && (
        <div className="bg-elder-background-alt rounded-elder-lg p-6">
          <h3 className="text-elder-lg font-semibold mb-3 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-600" />
            General Advice
          </h3>
          {/* IMPORTANT: Clean the advice text to remove any JSON artifacts */}
          <p className="text-elder-base text-elder-text-secondary">
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
              
              // Ensure max 10 words for elder-friendly display
              const words = advice.split(' ').slice(0, 10);
              return words.join(' ') + (words.length >= 10 && !advice.endsWith('.') ? '.' : '');
            })()}
          </p>
        </div>
      )}

      {/* UPDATED: Additional information with proper bullet point formatting */}
      {/* Displays up to 3 bullet points, each max 8 words */}
      {result.additionalInfo && (
        <div className="bg-elder-background-alt rounded-elder-lg p-6">
          <h3 className="text-elder-lg font-semibold mb-3 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-600" />
            Additional Information
          </h3>
          {/* IMPORTANT: Format as bullet points for elder-friendly reading */}
          <div className="text-elder-base text-elder-text-secondary space-y-2">
            {(() => {
              // Split by newlines to get individual bullet points
              const bulletPoints = result.additionalInfo
                .split('\n')
                .filter(line => line.trim().length > 0)
                .slice(0, 3); // Max 3 bullet points
              
              return bulletPoints.map((point, index) => {
                // Clean the bullet point text
                let cleanPoint = point.replace(/^[•\-*]\s*/, ''); // Remove existing bullets
                
                // Ensure max 8 words per bullet
                const words = cleanPoint.split(' ').slice(0, 8);
                cleanPoint = words.join(' ');
                
                return (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-primary-600 mt-1">•</span>
                    <span>{cleanPoint}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}