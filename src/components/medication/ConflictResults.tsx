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

  // Get traffic light color and icon
  const getTrafficLight = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'safe':
      case 'low':
        return {
          color: 'health-safe',
          bgColor: 'health-safe-bg',
          icon: CheckCircle,
          label: 'Safe',
        };
      case 'warning':
      case 'moderate':
        return {
          color: 'health-warning',
          bgColor: 'health-warning-bg',
          icon: AlertTriangle,
          label: 'Caution',
        };
      case 'danger':
      case 'high':
        return {
          color: 'health-danger',
          bgColor: 'health-danger-bg',
          icon: XCircle,
          label: 'Warning',
        };
      default:
        return {
          color: 'elder-text-secondary',
          bgColor: 'elder-background',
          icon: Info,
          label: 'Unknown',
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

      {/* No interactions message - FIXED: Use interactions instead of conflicts */}
      {(!result.interactions || result.interactions.length === 0) && (
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

      {/* General advice section - Display Claude's advice */}
      {result.generalAdvice && (
        <div className="bg-elder-background-alt rounded-elder-lg p-6">
          <h3 className="text-elder-lg font-semibold mb-3 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-600" />
            General Advice
          </h3>
          <p className="text-elder-base text-elder-text-secondary whitespace-pre-wrap">
            {result.generalAdvice}
          </p>
        </div>
      )}

      {/* Additional information */}
      {result.additionalInfo && (
        <div className="bg-elder-background-alt rounded-elder-lg p-6">
          <h3 className="text-elder-lg font-semibold mb-3 flex items-center gap-3">
            <Info className="h-6 w-6 text-primary-600" />
            Additional Information
          </h3>
          <p className="text-elder-base text-elder-text-secondary whitespace-pre-wrap">
            {result.additionalInfo}
          </p>
        </div>
      )}
    </div>
  );
}