'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Printer, Sparkles, AlertCircle, MessageSquare, HelpCircle, AlertTriangle } from 'lucide-react';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { generateClinicalNotePDF, ClinicalNotePDFData } from '@/lib/utils/pdfExport';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { format } from 'date-fns';

// Types for the API response
interface DiscussionPoint {
  topic: string;
  observation: string;
  discussionPrompt: string;
}

interface ProviderQuestion {
  context: string;
  question: string;
}

// Sparse data threshold - show warning if less than this many logs
const SPARSE_DATA_THRESHOLD = 7;

export default function ClinicalNotesPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();

  const [timeframe, setTimeframe] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicalNote, setClinicalNote] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!user || !selectedElder) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/medgemma/clinical-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedElder.groupId,
          elderId: selectedElder.id,
          elderName: selectedElder.name,
          elderAge: selectedElder.dateOfBirth
            ? new Date().getFullYear() - new Date(selectedElder.dateOfBirth).getFullYear()
            : selectedElder.approximateAge || 0,
          elderDateOfBirth: selectedElder.dateOfBirth
            ? format(new Date(selectedElder.dateOfBirth), 'MMM dd, yyyy')
            : undefined,
          // Pass known conditions from elder profile for AI context
          medicalConditions: selectedElder.knownConditions || [],
          allergies: [],
          timeframeDays: timeframe,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setClinicalNote(result.data);
      } else {
        setError(result.error || 'Failed to generate clinical note');
      }
    } catch (err) {
      setError('Failed to generate clinical note. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!clinicalNote) return;

    const pdfData: ClinicalNotePDFData = {
      patientInfo: clinicalNote.patientInfo,
      reportInfo: {
        generatedDate: format(new Date(), 'MMM dd, yyyy'),
        timeframeDays: clinicalNote.timeframeDays,
        generatedBy: user?.firstName + ' ' + user?.lastName || 'User',
      },
      clinicalSummary: clinicalNote.summary,
      medicationList: clinicalNote.medicationList,
      complianceAnalysis: clinicalNote.complianceAnalysis,
      // Convert new format to PDF format
      discussionPoints: clinicalNote.discussionPoints || [],
      questionsForProvider: clinicalNote.questionsForProvider || [],
    };

    generateClinicalNotePDF(pdfData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <TrialExpirationGate featureName="clinical notes generation">
      <EmailVerificationGate featureName="clinical notes generation">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Clinical Notes Generator
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Smart clinical summaries for healthcare provider consultations
            </p>
          </div>
        </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">Intelligent Summary Generator</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              This feature generates comprehensive clinical summaries from your health data.
              Perfect for doctor visits and medical consultations.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Elder
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {selectedElder?.name || 'No elder selected'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeframe
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeframe(days as 30 | 60 | 90)}
                  className={
                    'p-3 rounded-lg border-2 transition-all font-medium ' +
                    (timeframe === days
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600')
                  }
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={loading || !selectedElder}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Clinical Note...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Clinical Note
              </>
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {clinicalNote && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              SOAP Clinical Note
            </h2>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Sparse Data Warning Banner */}
          {clinicalNote.complianceAnalysis.totalDoses < SPARSE_DATA_THRESHOLD && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">Limited Data Available</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    This report is based on {clinicalNote.complianceAnalysis.totalDoses} logged dose{clinicalNote.complianceAnalysis.totalDoses !== 1 ? 's' : ''}.
                    For more comprehensive insights, continue logging medications for at least 7 days.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 space-y-6 print:shadow-none">
            {/* Header */}
            <div className="border-b dark:border-gray-700 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {clinicalNote.patientInfo.name}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                    <p>Age: {clinicalNote.patientInfo.age} years {clinicalNote.patientInfo.dateOfBirth && `| DOB: ${clinicalNote.patientInfo.dateOfBirth}`}</p>
                    {clinicalNote.patientInfo.medicalConditions?.length > 0 && (
                      <p>Conditions: {clinicalNote.patientInfo.medicalConditions.join(', ')}</p>
                    )}
                    {clinicalNote.patientInfo.allergies?.length > 0 && (
                      <p className="text-red-600 dark:text-red-400">Allergies: {clinicalNote.patientInfo.allergies.join(', ')}</p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <p>Report Period: {clinicalNote.timeframeDays} days</p>
                  <p>Generated: {format(new Date(), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* S - Subjective */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">S</span>
                Subjective
              </h3>
              <div className="ml-9 text-gray-700 dark:text-gray-300">
                <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-2">
                  Caregiver-reported observations and patient information
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p>Patient is a {clinicalNote.patientInfo.age}-year-old {clinicalNote.patientInfo.medicalConditions?.length > 0 ? `with history of ${clinicalNote.patientInfo.medicalConditions.join(', ')}` : 'individual'} currently on {clinicalNote.medicationList.length} medication{clinicalNote.medicationList.length !== 1 ? 's' : ''}.</p>
                  {clinicalNote.patientInfo.allergies?.length > 0 && (
                    <p className="mt-2 text-red-600 dark:text-red-400">
                      <span className="font-semibold">Known allergies:</span> {clinicalNote.patientInfo.allergies.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* O - Objective */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">O</span>
                Objective
              </h3>
              <div className="ml-9">
                <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-3">
                  Measurable data from medication tracking
                </p>

                {/* Compliance Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Adherence Rate</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{clinicalNote.complianceAnalysis.overallRate}%</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Doses Taken</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{clinicalNote.complianceAnalysis.takenDoses}/{clinicalNote.complianceAnalysis.totalDoses}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Doses Missed</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{clinicalNote.complianceAnalysis.missedDoses}</p>
                  </div>
                </div>

                {/* Medication List */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="text-left p-2 font-semibold">Medication</th>
                        <th className="text-left p-2 font-semibold">Dosage</th>
                        <th className="text-left p-2 font-semibold">Frequency</th>
                        <th className="text-right p-2 font-semibold">Adherence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinicalNote.medicationList.map((med: any, index: number) => (
                        <tr key={index} className="border-t dark:border-gray-700">
                          <td className="p-2 font-medium">{med.name}</td>
                          <td className="p-2">{med.dosage}</td>
                          <td className="p-2">{med.frequency}</td>
                          <td className="p-2 text-right">
                            <span className={`font-semibold ${
                              parseFloat(med.compliance) >= 80 ? 'text-green-600' :
                              parseFloat(med.compliance) >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {med.compliance}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* A - Assessment */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="bg-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">A</span>
                Assessment
              </h3>
              <div className="ml-9">
                <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-3">
                  AI-generated observational analysis (not medical advice)
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{clinicalNote.summary}</p>
                </div>

                {/* Discussion Points */}
                {clinicalNote.discussionPoints && clinicalNote.discussionPoints.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Discussion Points</h4>
                    </div>
                    <div className="space-y-2">
                      {clinicalNote.discussionPoints.map((point: DiscussionPoint, index: number) => (
                        <div key={index} className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-3">
                          <p className="font-medium text-purple-900 dark:text-purple-100">{point.topic}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{point.observation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* P - Plan */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="bg-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">P</span>
                Plan
              </h3>
              <div className="ml-9">
                <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-3">
                  Questions and topics to discuss with healthcare provider
                </p>

                {clinicalNote.questionsForProvider && clinicalNote.questionsForProvider.length > 0 ? (
                  <div className="space-y-2">
                    {clinicalNote.questionsForProvider.map((q: ProviderQuestion, index: number) => (
                      <div key={index} className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="font-medium">Context:</span> {q.context}
                        </p>
                        <p className="font-medium text-orange-900 dark:text-orange-100">
                          <HelpCircle className="h-4 w-4 inline mr-1" />
                          {q.question}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-gray-600 dark:text-gray-400">
                    <p>Continue current medication regimen. Discuss any concerns with healthcare provider at next appointment.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="border-t dark:border-gray-700 pt-4 mt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                <strong>MEDICAL DISCLAIMER:</strong> This SOAP note is auto-generated from caregiver-logged data to assist clinical discussions.
                It does NOT constitute medical advice, diagnosis, or treatment recommendations.
                The "Assessment" section contains AI-generated observations based on data patterns only.
                All medical decisions should be made by licensed healthcare providers.
              </p>
            </div>
          </Card>
        </div>
      )}
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
