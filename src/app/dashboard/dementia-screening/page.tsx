'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Loader2,
  AlertTriangle,
  Info,
  RefreshCw,
  Shield,
  MessageSquare,
  History,
  FileText,
} from 'lucide-react';
import { UnifiedAIConsentDialog } from '@/components/consent/UnifiedAIConsentDialog';
import { verifyAndLogAccess } from '@/lib/consent/unifiedConsentManagement';
import {
  runDementiaScreening,
  getDementiaScreenings,
  type DementiaScreeningReport,
  type BehavioralPattern
} from '@/lib/medical/dementiaScreening';
import { AssessmentWizard } from '@/components/dementia-assessment';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import type { DementiaAssessmentResult } from '@/types/dementiaAssessment';

export default function DementiaScreeningPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;
  const elderId = selectedElder?.id;
  const elderName = selectedElder?.name || 'Loved One';
  const elderAge = selectedElder?.approximateAge;

  // Unified consent state
  const [hasConsent, setHasConsent] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('assessment');

  // Behavioral screening state
  const [loading, setLoading] = useState(false);
  const [runningScreening, setRunningScreening] = useState(false);
  const [screenings, setScreenings] = useState<DementiaScreeningReport[]>([]);
  const [selectedScreening, setSelectedScreening] = useState<DementiaScreeningReport | null>(null);
  const [insufficientData, setInsufficientData] = useState(false);

  // Q&A Assessment state
  const [showWizard, setShowWizard] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<DementiaAssessmentResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DementiaAssessmentResult | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Check unified consent on mount
  useEffect(() => {
    if (!user?.id || !groupId) {
      setCheckingConsent(false);
      return;
    }

    checkConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, groupId]);

  async function checkConsent() {
    if (!user?.id || !groupId) return;

    setCheckingConsent(true);
    try {
      const { allowed } = await verifyAndLogAccess(
        user.id,
        groupId,
        'dementia_screening',
        elderId
      );

      setHasConsent(allowed);

      if (!allowed) {
        setShowConsentDialog(true);
      } else {
        loadScreenings();
        loadAssessmentResults();
      }
    } catch (error) {
      console.error('Error checking consent:', error);
    } finally {
      setCheckingConsent(false);
    }
  }

  const handleConsentComplete = async () => {
    setShowConsentDialog(false);
    setHasConsent(true);

    if (user?.id && groupId) {
      await verifyAndLogAccess(
        user.id,
        groupId,
        'dementia_screening',
        elderId
      );
    }

    loadScreenings();
    loadAssessmentResults();
  };

  async function loadScreenings() {
    if (!groupId || !elderId) return;

    setLoading(true);
    try {
      const reports = await getDementiaScreenings(groupId, elderId);
      setScreenings(reports);
      if (reports.length > 0) {
        setSelectedScreening(reports[0]);
      }
    } catch (error) {
      console.error('Error loading screenings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssessmentResults() {
    if (!groupId || !elderId) return;

    setLoadingResults(true);
    try {
      const response = await authenticatedFetch(
        `/api/dementia-assessment/results?groupId=${groupId}&elderId=${elderId}`
      );
      const data = await response.json();
      if (data.success && data.results) {
        setAssessmentResults(data.results);
        if (data.results.length > 0) {
          setSelectedResult(data.results[0]);
        }
      }
    } catch (error) {
      console.error('Error loading assessment results:', error);
    } finally {
      setLoadingResults(false);
    }
  }

  async function runNewScreening() {
    if (!groupId || !elderId) return;

    setRunningScreening(true);
    setInsufficientData(false);
    try {
      const report = await runDementiaScreening(groupId, elderId, elderName, 30);
      if (report) {
        await loadScreenings();
        setSelectedScreening(report);
      } else {
        setInsufficientData(true);
      }
    } catch (error) {
      console.error('Error running screening:', error);
      setInsufficientData(true);
    } finally {
      setRunningScreening(false);
    }
  }

  const handleAssessmentComplete = async (result: DementiaAssessmentResult) => {
    setShowWizard(false);
    await loadAssessmentResults();
    setSelectedResult(result);
    setActiveTab('history');
  };

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
      case 'urgent':
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
        <Alert className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>AI & Medical Consent Required:</strong> To use Cognitive Screening features,
            please review and accept the terms.
            <Button size="sm" className="mt-2 ml-2" onClick={() => setShowConsentDialog(true)}>
              Review Terms & Enable
            </Button>
          </AlertDescription>
        </Alert>

        {user && groupId && (
          <UnifiedAIConsentDialog
            open={showConsentDialog}
            userId={user.id}
            groupId={groupId}
            onConsent={handleConsentComplete}
            onDecline={() => window.location.href = '/dashboard'}
          />
        )}
      </div>
    );
  }

  // Show wizard if active
  if (showWizard && groupId && elderId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <AssessmentWizard
          groupId={groupId}
          elderId={elderId}
          elderName={elderName}
          elderAge={elderAge}
          knownConditions={selectedElder?.knownConditions}
          onComplete={handleAssessmentComplete}
          onCancel={() => setShowWizard(false)}
        />
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
            Cognitive Screening
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive cognitive assessment tools for {elderName}
          </p>
        </div>
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
              These screening tools help identify patterns that should be discussed with a healthcare
              professional. Only a qualified doctor can diagnose cognitive conditions.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assessment" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Q&A Assessment</span>
            <span className="sm:hidden">Q&A</span>
          </TabsTrigger>
          <TabsTrigger value="behavioral" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Behavioral Detection</span>
            <span className="sm:hidden">Behavioral</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Q&A Assessment Tab */}
        <TabsContent value="assessment" className="mt-6">
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full inline-block mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Caregiver Q&A Assessment
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Answer questions about {elderName}&apos;s cognitive function based on your observations.
                Our AI will ask follow-up questions for concerning areas.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium mb-2">What to expect:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>- 13 baseline questions across 6 cognitive domains</li>
                  <li>- AI-generated follow-up questions for concerning answers</li>
                  <li>- Approximately 10-15 minutes to complete</li>
                  <li>- Personalized summary and recommendations</li>
                </ul>
              </div>

              <Button
                size="lg"
                onClick={() => setShowWizard(true)}
                disabled={!groupId || !elderId}
              >
                Start Assessment
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Behavioral Detection Tab */}
        <TabsContent value="behavioral" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Behavioral Pattern Detection</h2>
              <p className="text-sm text-muted-foreground">
                Automatically analyzes care notes for cognitive change patterns
              </p>
            </div>
            <Button
              onClick={runNewScreening}
              disabled={runningScreening || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${runningScreening ? 'animate-spin' : ''}`} />
              Run Screening
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {insufficientData && (
            <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
              <Info className="h-5 w-5 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Not enough data for screening.</strong>
                <p className="mt-2 text-sm">
                  Add notes to medication/diet logs describing observations like &quot;seemed confused&quot;
                  or &quot;forgot eating breakfast&quot;. The system analyzes these notes for patterns.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!loading && screenings.length === 0 && !insufficientData && (
            <Card className="p-8 text-center">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full inline-block mb-4">
                <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Screenings Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This feature scans care notes for behavioral patterns.
              </p>
              <Button onClick={runNewScreening} disabled={runningScreening}>
                Run First Screening
              </Button>
            </Card>
          )}

          {!loading && selectedScreening && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Screening List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-sm font-semibold uppercase">Screening History</h3>
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
                          <p className="text-sm font-semibold">
                            {screening.screeningDate.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {screening.patternsDetected.length} pattern{screening.patternsDetected.length !== 1 ? 's' : ''}
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
                      <h3 className="text-lg font-semibold mb-2">
                        Screening - {selectedScreening.screeningDate.toLocaleDateString()}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Period: {selectedScreening.period.start.toLocaleDateString()} - {selectedScreening.period.end.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Risk Indicators */}
                <Card className="p-6">
                  <h4 className="font-semibold mb-3">Risk Indicators</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedScreening.riskIndicators).map(([key, value]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-2 p-2 rounded ${
                          value ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800/20'
                        }`}
                      >
                        {value ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <Info className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-xs ${value ? 'font-medium' : 'text-muted-foreground'}`}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Patterns */}
                {selectedScreening.patternsDetected.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Behavioral Patterns</h4>
                    {selectedScreening.patternsDetected.map((pattern, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{pattern.description}</p>
                            <p className="text-xs text-muted-foreground">
                              First detected: {pattern.firstDetected.toLocaleDateString()} - Frequency: {pattern.frequency}x
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(pattern.severity)}`}>
                            {pattern.severity}
                          </span>
                        </div>
                        {pattern.examples.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold">Examples:</p>
                            {pattern.examples.map((example, i) => (
                              <p key={i} className="text-xs text-muted-foreground pl-3 border-l-2">
                                {example}
                              </p>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}

                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Recommendation
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                    {selectedScreening.recommendationText}
                  </p>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6 space-y-6">
          <h2 className="text-lg font-semibold">Assessment History</h2>

          {loadingResults && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {!loadingResults && assessmentResults.length === 0 && (
            <Card className="p-8 text-center">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
                <History className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Assessments Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete a Q&A assessment to see results here.
              </p>
              <Button onClick={() => setActiveTab('assessment')}>
                Start First Assessment
              </Button>
            </Card>
          )}

          {!loadingResults && assessmentResults.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Results List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-sm font-semibold uppercase">Past Assessments</h3>
                <div className="space-y-2">
                  {assessmentResults.map((result) => (
                    <Card
                      key={result.id}
                      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                        selectedResult?.id === result.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : ''
                      }`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {new Date(result.assessmentDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.totalQuestionsAsked} questions - {result.durationMinutes} min
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            result.overallRiskLevel === 'urgent' || result.overallRiskLevel === 'concerning'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : result.overallRiskLevel === 'moderate'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                        >
                          {result.overallRiskLevel}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Selected Result Details */}
              {selectedResult && (
                <div className="lg:col-span-2 space-y-4">
                  <Card className={`border-l-4 ${getRiskLevelColor(selectedResult.overallRiskLevel)} p-6`}>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">
                          Assessment - {new Date(selectedResult.assessmentDate).toLocaleDateString()}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Duration: {selectedResult.durationMinutes} minutes -
                          {selectedResult.totalQuestionsAsked} questions ({selectedResult.adaptiveQuestionsAsked} follow-ups)
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Domain Scores */}
                  <Card className="p-6">
                    <h4 className="font-semibold mb-4">Domain Scores</h4>
                    <div className="space-y-3">
                      {selectedResult.domainScores.map((score) => (
                        <div key={score.domain} className="flex items-center gap-3">
                          <span className="w-40 text-sm">{score.domainLabel}</span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score.concernLevel === 'concerning'
                                  ? 'bg-red-500'
                                  : score.concernLevel === 'moderate'
                                  ? 'bg-yellow-500'
                                  : score.concernLevel === 'mild'
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${score.normalizedScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-16">
                            {score.normalizedScore}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* AI Summary */}
                  <Card className="p-6">
                    <h4 className="font-semibold mb-3">AI Summary</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedResult.aiSummary}
                    </p>
                  </Card>

                  {/* Recommendations */}
                  {selectedResult.recommendations.length > 0 && (
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4">Recommendations</h4>
                      <div className="space-y-3">
                        {selectedResult.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-l-4 ${
                              rec.priority === 'high'
                                ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                                : rec.priority === 'medium'
                                ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            }`}
                          >
                            <p className="font-medium text-sm">{rec.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Unified Consent Dialog */}
      {user && groupId && (
        <UnifiedAIConsentDialog
          open={showConsentDialog}
          userId={user.id}
          groupId={groupId}
          onConsent={handleConsentComplete}
          onDecline={() => window.location.href = '/dashboard'}
        />
      )}
    </div>
  );
}
