'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import type { DementiaAssessmentResult, DomainScore, OverallRiskLevel } from '@/types/dementiaAssessment';
import { DOMAIN_LABELS } from '@/types/dementiaAssessment';

interface ResultsSummaryProps {
  result: DementiaAssessmentResult;
  elderName: string;
  onClose?: () => void;
}

export function ResultsSummary({ result, elderName, onClose }: ResultsSummaryProps) {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<string[]>([]);

  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const getRiskColor = (level: OverallRiskLevel): string => {
    switch (level) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      case 'concerning':
        return 'text-orange-600 dark:text-orange-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
    }
  };

  const getRiskBgColor = (level: OverallRiskLevel): string => {
    switch (level) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'concerning':
        return 'bg-orange-100 dark:bg-orange-900/30';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30';
    }
  };

  const getRiskLabel = (level: OverallRiskLevel): string => {
    switch (level) {
      case 'urgent':
        return 'Urgent - Professional Assessment Strongly Recommended';
      case 'concerning':
        return 'Concerning - Professional Evaluation Recommended';
      case 'moderate':
        return 'Moderate - Consider Discussing with Healthcare Provider';
      case 'low':
        return 'Low - Continue Regular Monitoring';
    }
  };

  const getDomainConcernColor = (concernLevel: string): string => {
    switch (concernLevel) {
      case 'concerning':
        return 'text-red-600 dark:text-red-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'mild':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Critical Disclaimer */}
      <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong>This is NOT a medical diagnosis.</strong> Only a qualified healthcare
          professional can diagnose cognitive conditions. Use this report to discuss
          concerns with a doctor.
        </AlertDescription>
      </Alert>

      {/* Overall Risk Card */}
      <Card className={`p-6 ${getRiskBgColor(result.overallRiskLevel)}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Brain className={`w-6 h-6 ${getRiskColor(result.overallRiskLevel)}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">Assessment Complete</h2>
            <p className={`font-medium ${getRiskColor(result.overallRiskLevel)}`}>
              {getRiskLabel(result.overallRiskLevel)}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(result.assessmentDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {result.durationMinutes} minutes
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {result.totalQuestionsAsked} questions
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Comparison with Previous */}
      {result.changeFromPrevious && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            {result.changeFromPrevious.overallTrend === 'improved' && (
              <TrendingUp className="w-5 h-5 text-green-600" />
            )}
            {result.changeFromPrevious.overallTrend === 'declined' && (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            {result.changeFromPrevious.overallTrend === 'stable' && (
              <Minus className="w-5 h-5 text-gray-600" />
            )}
            <div>
              <p className="font-medium">Compared to Previous Assessment</p>
              <p className="text-sm text-muted-foreground">
                {result.changeFromPrevious.summary}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Domain Scores */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Domain Scores</h3>
        <div className="space-y-4">
          {result.domainScores.map((score) => (
            <div key={score.domain} className="border-b pb-4 last:border-0 last:pb-0">
              <button
                onClick={() => toggleDomain(score.domain)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{score.domainLabel}</span>
                  <span className={`text-sm ${getDomainConcernColor(score.concernLevel)}`}>
                    ({score.concernLevel})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {score.normalizedScore}%
                  </span>
                  {expandedDomains.includes(score.domain) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              <Progress
                value={score.normalizedScore}
                className="h-2 mt-2"
              />

              {expandedDomains.includes(score.domain) && (
                <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-muted-foreground mb-2">
                    {score.questionsAsked} questions asked, {score.concerningAnswers} concerning responses
                  </p>
                  {score.keyFindings.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {score.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 mt-1 flex-shrink-0 text-yellow-500" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* AI Summary */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Assessment Summary
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {showFullSummary ? (
            <p className="whitespace-pre-wrap">{result.aiSummary}</p>
          ) : (
            <p>
              {result.aiSummary.slice(0, 300)}
              {result.aiSummary.length > 300 && '...'}
            </p>
          )}
        </div>
        {result.aiSummary.length > 300 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullSummary(!showFullSummary)}
            className="mt-2"
          >
            {showFullSummary ? 'Show Less' : 'Read More'}
          </Button>
        )}
      </Card>

      {/* Key Observations */}
      {(result.areasOfConcern.length > 0 || result.strengthsNoted.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Areas of Concern */}
          {result.areasOfConcern.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Areas of Concern
              </h4>
              <ul className="space-y-2 text-sm">
                {result.areasOfConcern.map((concern, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Strengths */}
          {result.strengthsNoted.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium mb-3 text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Strengths Noted
              </h4>
              <ul className="space-y-2 text-sm">
                {result.strengthsNoted.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Recommendations</h3>
          <div className="space-y-4">
            {result.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'high'
                    ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                    : rec.priority === 'medium'
                    ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <h4 className="font-medium">{rec.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                {rec.actionItems && rec.actionItems.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {rec.actionItems.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 mt-1 flex-shrink-0 text-gray-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
        <Button
          onClick={() => {
            // Print functionality
            window.print();
          }}
          className="flex-1"
        >
          Print Report
        </Button>
      </div>

      {/* Final Reminder */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          Remember to bring this report to {elderName}&apos;s next healthcare appointment
          for professional review and guidance.
        </AlertDescription>
      </Alert>
    </div>
  );
}
