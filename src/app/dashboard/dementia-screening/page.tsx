'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, AlertTriangle, Info, RefreshCw, Shield } from 'lucide-react';
import { MedicalDisclaimerConsent } from '@/components/medical/MedicalDisclaimerConsent';
import { verifyAndLogMedicalAccess } from '@/lib/medical/consentManagement';
import {
  runDementiaScreening,
  getDementiaScreenings,
  type DementiaScreeningReport,
  type BehavioralPattern
} from '@/lib/medical/dementiaScreening';

export default function DementiaScreeningPage() {
  const { user } = useAuth();
  const groupId = user?.groups?.[0]?.groupId;
  const elderId = user?.groups?.[0]?.elderId;
  const elderName = user?.groups?.[0]?.elderName || 'Elder';

  const [hasConsent, setHasConsent] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const [loading, setLoading] = useState(false);
  const [runningScreening, setRunningScreening] = useState(false);
  const [screenings, setScreenings] = useState<DementiaScreeningReport[]>([]);
  const [selectedScreening, setSelectedScreening] = useState<DementiaScreeningReport | null>(null);

  // Check consent on mount
  useEffect(() => {
    checkConsent();
  }, [user?.id, groupId]);

  async function checkConsent() {
    if (!user?.id || !groupId) return;

    setCheckingConsent(true);
    const { allowed } = await verifyAndLogMedicalAccess(
      user.id,
      groupId,
      'dementia_screening'
    );

    setHasConsent(allowed);
    setCheckingConsent(false);

    if (!allowed) {
      setShowConsentDialog(true);
    } else {
      loadScreenings();
    }
  }

  async function loadScreenings() {
    if (!groupId || !elderId) return;

    setLoading(true);
    try {
      const reports = await getDementiaScreenings(groupId, elderId);
      setScreenings(reports);
      if (reports.length > 0) {
        setSelectedScreening(reports[0]); // Show most recent
      }
    } catch (error) {
      console.error('Error loading screenings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runNewScreening() {
    if (!groupId || !elderId) return;

    setRunningScreening(true);
    try {
      const report = await runDementiaScreening(groupId, elderId, elderName, 30);
      if (report) {
        await loadScreenings(); // Refresh list
        setSelectedScreening(report);
      }
    } catch (error) {
      console.error('Error running screening:', error);
    } finally {
      setRunningScreening(false);
    }
  }

  const getSeverityColor = (severity: BehavioralPattern['severity']) => {
    switch (severity) {
      case 'concerning':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'mild':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'concerning':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'moderate':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    }
  };

  if (checkingConsent) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="p-6">
        {showConsentDialog && (
          <MedicalDisclaimerConsent
            featureType="dementia_screening"
            groupId={groupId!}
            onConsentGiven={() => {
              setHasConsent(true);
              setShowConsentDialog(false);
              loadScreenings();
            }}
            onConsentDenied={() => {
              window.location.href = '/dashboard';
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            Behavioral Pattern Monitoring
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Detect behavioral changes that may warrant professional assessment
          </p>
        </div>
        <Button
          onClick={runNewScreening}
          disabled={runningScreening || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${runningScreening ? 'animate-spin' : ''}`} />
          Run New Screening
        </Button>
      </div>

      {/* Critical Disclaimer */}
      <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900 dark:text-red-100">
              This is NOT a Medical Diagnosis
            </p>
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
              This screening tool detects behavioral patterns from care notes. It does NOT diagnose
              dementia or any cognitive condition. Only a qualified healthcare professional can
              provide diagnosis and treatment. Use this information to identify changes that should
              be discussed with a doctor.
            </p>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* No Screenings */}
      {!loading && screenings.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full inline-block mb-4">
              <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Screenings Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Run your first behavioral screening to start monitoring patterns. The system needs at
              least 30 days of care notes to detect meaningful patterns.
            </p>
            <Button onClick={runNewScreening} disabled={runningScreening}>
              <RefreshCw className={`h-4 w-4 mr-2 ${runningScreening ? 'animate-spin' : ''}`} />
              Run First Screening
            </Button>
          </div>
        </Card>
      )}

      {/* Screening Results */}
      {!loading && selectedScreening && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Screening List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
              Screening History
            </h2>
            <div className="space-y-2">
              {screenings.map((screening) => (
                <Card
                  key={screening.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedScreening?.id === screening.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : ''
                  }`}
                  onClick={() => setSelectedScreening(screening)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {screening.screeningDate.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {screening.patternsDetected.length} pattern{screening.patternsDetected.length !== 1 ? 's' : ''} detected
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        screening.overallRiskLevel === 'concerning'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : screening.overallRiskLevel === 'moderate'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      {screening.overallRiskLevel}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Report */}
          <div className="lg:col-span-2 space-y-4">
            <Card className={`border-l-4 ${getRiskLevelColor(selectedScreening.overallRiskLevel)} p-6`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Screening Report - {selectedScreening.screeningDate.toLocaleDateString()}
                  </h3>

                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <p>
                      <strong>Period:</strong>{' '}
                      {selectedScreening.period.start.toLocaleDateString()} -{' '}
                      {selectedScreening.period.end.toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Risk Level:</strong>{' '}
                      <span
                        className={`font-semibold uppercase ${
                          selectedScreening.overallRiskLevel === 'concerning'
                            ? 'text-red-600 dark:text-red-400'
                            : selectedScreening.overallRiskLevel === 'moderate'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {selectedScreening.overallRiskLevel}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Risk Indicators Summary */}
            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Risk Indicators Detected
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedScreening.riskIndicators).map(([key, value]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 p-2 rounded ${
                      value ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800/20'
                    }`}
                  >
                    {value ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <Info className="h-4 w-4 text-gray-400" />
                    )}
                    <span
                      className={`text-xs ${
                        value
                          ? 'text-yellow-900 dark:text-yellow-100 font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Behavioral Patterns Detected */}
            {selectedScreening.patternsDetected.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Behavioral Patterns Detected
                </h4>
                {selectedScreening.patternsDetected.map((pattern, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {pattern.description}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          First detected: {pattern.firstDetected.toLocaleDateString()} • Frequency:{' '}
                          {pattern.frequency} times
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(pattern.severity)}`}>
                        {pattern.severity}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Examples from care notes:
                      </p>
                      {pattern.examples.map((example, exIdx) => (
                        <div
                          key={exIdx}
                          className="text-xs text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-gray-300 dark:border-gray-600"
                        >
                          {example}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Recommendation */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Professional Recommendation
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                {selectedScreening.recommendationText}
              </div>
            </Card>

            {/* Action Reminder */}
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 p-4">
              <p className="text-xs text-purple-800 dark:text-purple-200">
                💡 <strong>Next Steps:</strong> If you have concerns about these patterns, schedule
                an appointment with {elderName}'s healthcare provider. Bring this report or share
                specific examples from the care notes. Early detection and intervention can make a
                significant difference.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
