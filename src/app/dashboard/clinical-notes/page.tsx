'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Loader2, FileText, Download, Printer, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { generateClinicalNotePDF, ClinicalNotePDFData } from '@/lib/utils/pdfExport';
import { format } from 'date-fns';

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
      const response = await fetch('/api/medgemma/clinical-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userRole: 'admin',
          groupId: selectedElder.groupId,
          elderId: selectedElder.id,
          elderName: selectedElder.name,
          elderAge: new Date().getFullYear() - new Date(selectedElder.dateOfBirth).getFullYear(),
          elderDateOfBirth: format(new Date(selectedElder.dateOfBirth), 'MMM dd, yyyy'),
          medicalConditions: [],
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
      recommendations: clinicalNote.recommendations,
      questionsForDoctor: clinicalNote.questionsForDoctor,
    };

    generateClinicalNotePDF(pdfData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Clinical Notes Generator
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-powered clinical summaries for healthcare provider consultations
          </p>
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100">Powered by MedGemma 27B</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              This feature uses Google's medical AI to generate comprehensive clinical summaries from your health data.
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Generated Clinical Note</h2>
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

          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Patient Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Name:</span> {clinicalNote.patientInfo.name}</div>
                <div><span className="font-medium">Age:</span> {clinicalNote.patientInfo.age} years</div>
                {clinicalNote.patientInfo.dateOfBirth && (
                  <div><span className="font-medium">Date of Birth:</span> {clinicalNote.patientInfo.dateOfBirth}</div>
                )}
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Clinical Summary</h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{clinicalNote.summary}</p>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Medication Adherence</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Compliance</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{clinicalNote.complianceAnalysis.overallRate}%</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Doses Taken</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{clinicalNote.complianceAnalysis.takenDoses}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Doses Missed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{clinicalNote.complianceAnalysis.missedDoses}</p>
                </div>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Medications</h3>
              <div className="space-y-2">
                {clinicalNote.medicationList.map((med: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{med.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{med.dosage} - {med.frequency}</p>
                    </div>
                    {med.compliance && (
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{med.compliance}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {clinicalNote.recommendations.length > 0 && (
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Clinical Recommendations</h3>
                <ul className="space-y-2">
                  {clinicalNote.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {clinicalNote.questionsForDoctor.length > 0 && (
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Questions for Healthcare Provider</h3>
                <ul className="space-y-2">
                  {clinicalNote.questionsForDoctor.map((question: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{index + 1}.</span>
                      <span className="text-gray-700 dark:text-gray-300">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                MEDICAL DISCLAIMER: This report is AI-generated to assist clinical discussions. It does NOT constitute
                medical advice, diagnosis, or treatment recommendations. All medical decisions should be made by
                licensed healthcare providers.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
