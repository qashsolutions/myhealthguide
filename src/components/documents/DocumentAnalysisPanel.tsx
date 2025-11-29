'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  FileSearch,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  FlaskConical,
  Pill,
  FileText,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import type { DocumentAnalysis, ExtractedData } from '@/lib/ai/documentAnalysis';

interface DocumentAnalysisPanelProps {
  documentId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  userId: string;
  groupId: string;
  elderId: string;
  existingAnalysis?: DocumentAnalysis | null;
  onAnalysisComplete?: (analysis: DocumentAnalysis) => void;
}

export function DocumentAnalysisPanel({
  documentId,
  fileName,
  fileType,
  filePath,
  fileSize,
  userId,
  groupId,
  elderId,
  existingAnalysis,
  onAnalysisComplete,
}: DocumentAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(existingAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showResults, setShowResults] = useState(!!existingAnalysis);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    observations: true,
    labValues: true,
    medications: true,
  });

  const canAnalyze = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(fileType);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          filePath,
          fileName,
          fileType,
          fileSize,
          userId,
          groupId,
          elderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConsent) {
          setShowConsentDialog(true);
          return;
        }
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
      setShowResults(true);
      onAnalysisComplete?.(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'lab_result':
        return <FlaskConical className="w-5 h-5 text-purple-600" />;
      case 'prescription':
        return <Pill className="w-5 h-5 text-blue-600" />;
      case 'discharge_summary':
      case 'medical_record':
        return <FileText className="w-5 h-5 text-green-600" />;
      default:
        return <FileSearch className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLabValueBadge = (flag?: string) => {
    if (!flag || flag === 'normal') return null;
    const colors = {
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
      <Badge className={colors[flag as keyof typeof colors] || ''}>
        {flag.toUpperCase()}
      </Badge>
    );
  };

  if (!canAnalyze) {
    return (
      <Alert className="bg-gray-50 dark:bg-gray-800">
        <Info className="w-4 h-4" />
        <AlertDescription>
          Document analysis is available for PDF and image files (JPEG, PNG, WebP, TIFF).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Informational Only:</strong> AI analysis provides observations based on document text.
          Always verify with the original document and consult your healthcare provider for interpretation.
        </AlertDescription>
      </Alert>

      {/* Analysis Button */}
      {!analysis && (
        <Button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Document...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze with AI
            </>
          )}
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysis && showResults && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {analysis.extractedData?.documentType && getDocumentTypeIcon(analysis.extractedData.documentType)}
                Document Analysis
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(analysis.status)}
                <Badge variant="outline" className="text-xs">
                  {analysis.confidenceScore ? `${Math.round(analysis.confidenceScore * 100)}% confidence` : 'Analyzed'}
                </Badge>
              </div>
            </div>
            {analysis.extractedData?.documentType && (
              <CardDescription>
                Identified as: {analysis.extractedData.documentType.replace(/_/g, ' ')}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Document Metadata */}
            {(analysis.extractedData?.dateOnDocument || analysis.extractedData?.providerName) && (
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {analysis.extractedData.dateOnDocument && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{analysis.extractedData.dateOnDocument}</span>
                  </div>
                )}
                {analysis.extractedData.providerName && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <span>{analysis.extractedData.providerName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Observations */}
            {analysis.observations && analysis.observations.length > 0 && (
              <div className="border rounded-lg dark:border-gray-700">
                <button
                  onClick={() => toggleSection('observations')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="font-medium flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-purple-600" />
                    Key Observations ({analysis.observations.length})
                  </span>
                  {expandedSections.observations ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.observations && (
                  <div className="px-3 pb-3 space-y-2">
                    {analysis.observations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{obs}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lab Values */}
            {analysis.extractedData?.labValues && analysis.extractedData.labValues.length > 0 && (
              <div className="border rounded-lg dark:border-gray-700">
                <button
                  onClick={() => toggleSection('labValues')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="font-medium flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    Lab Values ({analysis.extractedData.labValues.length})
                  </span>
                  {expandedSections.labValues ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.labValues && (
                  <div className="px-3 pb-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-gray-700">
                            <th className="text-left py-2 px-2">Test</th>
                            <th className="text-left py-2 px-2">Value</th>
                            <th className="text-left py-2 px-2">Reference</th>
                            <th className="text-left py-2 px-2">Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.extractedData.labValues.map((lab, idx) => (
                            <tr key={idx} className="border-b dark:border-gray-700 last:border-0">
                              <td className="py-2 px-2 font-medium">{lab.testName}</td>
                              <td className="py-2 px-2">
                                {lab.value} {lab.unit}
                              </td>
                              <td className="py-2 px-2 text-gray-500">{lab.referenceRange || '-'}</td>
                              <td className="py-2 px-2">{getLabValueBadge(lab.flag)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medications */}
            {analysis.extractedData?.medications && analysis.extractedData.medications.length > 0 && (
              <div className="border rounded-lg dark:border-gray-700">
                <button
                  onClick={() => toggleSection('medications')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-600" />
                    Medications ({analysis.extractedData.medications.length})
                  </span>
                  {expandedSections.medications ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.medications && (
                  <div className="px-3 pb-3 space-y-2">
                    {analysis.extractedData.medications.map((med, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-800 p-3 rounded"
                      >
                        <div className="font-medium">{med.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                          {med.dosage && <div>Dosage: {med.dosage}</div>}
                          {med.frequency && <div>Frequency: {med.frequency}</div>}
                          {med.quantity && <div>Quantity: {med.quantity}</div>}
                          {med.refills && <div>Refills: {med.refills}</div>}
                          {med.prescribedBy && <div>Prescribed by: {med.prescribedBy}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Diagnoses */}
            {analysis.extractedData?.diagnoses && analysis.extractedData.diagnoses.length > 0 && (
              <div className="border rounded-lg dark:border-gray-700 p-3">
                <div className="font-medium mb-2">Diagnoses</div>
                <div className="flex flex-wrap gap-2">
                  {analysis.extractedData.diagnoses.map((diagnosis, idx) => (
                    <Badge key={idx} variant="outline">
                      {diagnosis}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Instructions */}
            {analysis.extractedData?.followUpInstructions && analysis.extractedData.followUpInstructions.length > 0 && (
              <div className="border rounded-lg dark:border-gray-700 p-3">
                <div className="font-medium mb-2">Follow-up Instructions</div>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  {analysis.extractedData.followUpInstructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Processing Info */}
            <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t dark:border-gray-700">
              Analyzed on {analysis.completedAt ? new Date(analysis.completedAt).toLocaleString() : 'N/A'}
              {analysis.processingTimeMs && ` • ${(analysis.processingTimeMs / 1000).toFixed(1)}s`}
              {' • Model: '}{analysis.analysisModel}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show/Hide Results Toggle */}
      {analysis && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResults(!showResults)}
          className="w-full"
        >
          {showResults ? 'Hide Analysis Results' : 'Show Analysis Results'}
        </Button>
      )}

      {/* Consent Required Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Consent Required</DialogTitle>
            <DialogDescription>
              To analyze documents with AI, you need to accept the AI features terms and conditions.
              Please go to Settings → AI Features to enable this functionality.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.location.href = '/dashboard/settings?tab=ai'}>
              Go to Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
