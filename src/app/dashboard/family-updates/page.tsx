'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, Heart, Edit, Send, Eye, RefreshCw, CheckCircle } from 'lucide-react';
import { generateWeeklyFamilyUpdate, type FamilyUpdateReport } from '@/lib/medical/familyUpdateReports';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

export default function FamilyUpdatesPage() {
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;
  const elderId = selectedElder?.id;
  const elderName = selectedElder?.name || 'Loved One';

  // Check if user is a family member (read-only access - can view but not generate/edit/send)
  const userAgencyRole = user?.agencies?.[0]?.role;
  const isReadOnly = userAgencyRole === 'family_member';

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<FamilyUpdateReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FamilyUpdateReport | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedNarrative, setEditedNarrative] = useState('');

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, elderId]);

  async function loadReports() {
    if (!groupId || !elderId) return;

    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/family-updates?groupId=${groupId}&elderId=${elderId}`
      );
      const data = await response.json();

      if (data.success) {
        const loadedReports = data.reports.map((r: any) => ({
          ...r,
          weekEnding: r.weekEnding ? new Date(r.weekEnding) : null,
          dateRange: {
            start: r.dateRange?.start ? new Date(r.dateRange.start) : null,
            end: r.dateRange?.end ? new Date(r.dateRange.end) : null
          },
          generatedAt: r.generatedAt ? new Date(r.generatedAt) : null,
          sentAt: r.sentAt ? new Date(r.sentAt) : null
        })) as FamilyUpdateReport[];

        setReports(loadedReports);
        if (loadedReports.length > 0 && !selectedReport) {
          setSelectedReport(loadedReports[0]);
          setEditedNarrative(loadedReports[0].narrativeText);
        }
      } else {
        console.error('Error loading reports:', data.error);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateNewReport() {
    if (!groupId || !elderId) return;

    setGenerating(true);
    try {
      const newReport = await generateWeeklyFamilyUpdate(groupId, elderId, elderName);
      await loadReports();
      setSelectedReport(newReport);
      setEditedNarrative(newReport.narrativeText);
      setEditMode(true); // Auto-enter edit mode for new reports
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  }

  async function saveEdits() {
    if (!selectedReport) return;

    try {
      const response = await authenticatedFetch('/api/family-updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          narrativeText: editedNarrative
        })
      });
      const data = await response.json();

      if (data.success) {
        // Update local state
        setSelectedReport({
          ...selectedReport,
          narrativeText: editedNarrative
        });

        setEditMode(false);
        await loadReports();
      } else {
        console.error('Error saving edits:', data.error);
      }
    } catch (error) {
      console.error('Error saving edits:', error);
    }
  }

  async function sendReport() {
    if (!selectedReport) return;

    try {
      const response = await authenticatedFetch('/api/family-updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: 'sent',
          sentTo: [user?.id || '']
        })
      });
      const data = await response.json();

      if (data.success) {
        // Update local state
        setSelectedReport({
          ...selectedReport,
          status: 'sent',
          sentAt: new Date(),
          sentTo: [user?.id || '']
        });

        await loadReports();
      } else {
        console.error('Error sending report:', data.error);
      }
    } catch (error) {
      console.error('Error sending report:', error);
    }
  }

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'positive':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'concerning':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'neutral':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Mail className="h-8 w-8 text-purple-600" />
            Family Update Reports
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Weekly narrative updates for family members
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={generateNewReport} disabled={generating || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Generate New Report
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 p-4">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-purple-900 dark:text-purple-100">
              Warm, Personal Updates
            </p>
            <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
              {isReadOnly
                ? 'View weekly care updates about your loved one. These reports provide a warm, conversational summary of their care.'
                : 'These reports use a warm, conversational tone (not clinical) to keep families informed. You can preview, edit, and customize each report before sending.'}
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

      {/* No Reports */}
      {!loading && reports.length === 0 && (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full inline-block mb-4">
              <Mail className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Reports Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {isReadOnly
                ? 'No family updates have been shared with you yet. Check back later for updates from caregivers.'
                : 'Generate your first weekly family update. The system will analyze the past 7 days of medication and care data to create a warm, personalized summary.'}
            </p>
            {!isReadOnly && (
              <Button onClick={generateNewReport} disabled={generating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                Generate First Report
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Reports */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
              Reports ({reports.length})
            </h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedReport?.id === report.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedReport(report);
                    setEditedNarrative(report.narrativeText);
                    setEditMode(false);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Week of {report.weekEnding.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {report.dateRange.start.toLocaleDateString()} -{' '}
                        {report.dateRange.end.toLocaleDateString()}
                      </p>
                    </div>
                    {report.status === 'sent' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Edit className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getToneColor(report.summary.overallTone)}`}>
                      {report.summary.overallTone}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {report.status === 'sent' ? 'Sent' : 'Draft'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Report Detail */}
          {selectedReport && (
            <div className="lg:col-span-2 space-y-4">
              {/* Header Card */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedReport.summary.headline}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Week ending {selectedReport.weekEnding.toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded ${getToneColor(selectedReport.summary.overallTone)}`}>
                    {selectedReport.summary.overallTone.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Medication Compliance</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedReport.summary.medicationCompliance.percentage}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedReport.summary.medicationCompliance.taken} /{' '}
                      {selectedReport.summary.medicationCompliance.total} doses
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Meals Logged</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {selectedReport.summary.dietSummary.mealsLogged}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedReport.summary.dietSummary.averagePerDay} avg/day
                    </p>
                  </div>
                </div>
              </Card>

              {/* Highlights */}
              {selectedReport.summary.highlights.length > 0 && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Highlights
                  </h4>
                  <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    {selectedReport.summary.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Concerns */}
              {selectedReport.summary.concerns.length > 0 && (
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Things to Watch
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                    {selectedReport.summary.concerns.map((concern, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Narrative Email */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    Email Message
                  </h4>
                  {!isReadOnly && !editMode && selectedReport.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full min-h-[400px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                      value={editedNarrative}
                      onChange={(e) => setEditedNarrative(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEdits}>
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setEditedNarrative(selectedReport.narrativeText);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-sans">
                      {selectedReport.narrativeText}
                    </pre>
                  </div>
                )}
              </Card>

              {/* Actions */}
              {!isReadOnly && selectedReport.status === 'draft' && !editMode && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        Ready to send?
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        Review the message above and send to family members
                      </p>
                    </div>
                    <Button onClick={sendReport}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Report
                    </Button>
                  </div>
                </Card>
              )}

              {selectedReport.status === 'sent' && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        Report Sent
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Sent on {selectedReport.sentAt?.toLocaleDateString()} to{' '}
                        {selectedReport.sentTo.length} recipient{selectedReport.sentTo.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
