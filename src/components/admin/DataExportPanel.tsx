'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataExportService, UserDataExport } from '@/lib/firebase/dataExport';
import { Download, FileJson, FileText, Loader, CheckCircle, Info } from 'lucide-react';

interface DataExportPanelProps {
  userId: string;
  isAdmin: boolean;
  isEmbedded?: boolean; // If true, renders without Card wrapper
}

export function DataExportPanel({ userId, isAdmin, isEmbedded = false }: DataExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<UserDataExport | null>(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!isAdmin) {
      setError('Only group admins can export data');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const data = await DataExportService.exportAllUserData(userId);

      // Check if there's any meaningful data to export
      const hasData = data.groups.length > 0 ||
                      data.elders.length > 0 ||
                      data.medications.length > 0 ||
                      data.medicationLogs.length > 0 ||
                      data.dietEntries.length > 0;

      if (!hasData && data.user) {
        // User exists but has no data yet
        setExportData(data);
        setError('');
      } else {
        setExportData(data);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      // Check for permission errors (user has no groups/data yet)
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        setError('No data to export yet. Start by creating a group and adding elders to track their care.');
      } else {
        setError('Failed to export data. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadJSON = () => {
    if (exportData) {
      DataExportService.downloadAsJSON(exportData);
    }
  };

  const handleDownloadCSV = () => {
    if (exportData) {
      DataExportService.downloadAsCSV(exportData);
    }
  };

  const summary = exportData ? DataExportService.getExportSummary(exportData) : [];

  const content = (
    <div className="space-y-4">
      {/* Info Alert */}
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="ml-2 text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">What data is exported:</p>
            <ul className="text-sm space-y-1">
              <li>• Your profile and account information</li>
              <li>• All groups where you are admin</li>
              <li>• Loved one profiles, medications, supplements</li>
              <li>• All logs (medication, supplement, diet entries)</li>
              <li>• Activity logs and notification history</li>
              <li>• Invites created and accepted</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Error/Info Message */}
        {error && (
          <Alert className={error.includes('No data to export')
            ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          }>
            <Info className={`h-4 w-4 ${error.includes('No data to export') ? 'text-amber-600' : 'text-red-600'}`} />
            <AlertDescription className={error.includes('No data to export')
              ? "ml-2 text-amber-800 dark:text-amber-200"
              : "ml-2 text-red-800 dark:text-red-200"
            }>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Export Button */}
        {!exportData && (
          <div>
            <Button
              onClick={handleExport}
              disabled={exporting || !isAdmin}
              className="w-full"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Preparing Export...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </>
              )}
            </Button>
            {!isAdmin && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Only group admins can export data
              </p>
            )}
          </div>
        )}

        {/* Export Summary */}
        {exportData && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
                Export ready! Your data has been prepared for download.
              </AlertDescription>
            </Alert>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-2">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {item.count}
                  </p>
                </div>
              ))}
            </div>

            {/* Download Options */}
            <div className="space-y-2">
              <Button
                onClick={handleDownloadJSON}
                variant="outline"
                className="w-full"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Download as JSON (Complete Data)
              </Button>

              <Button
                onClick={handleDownloadCSV}
                variant="outline"
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download as CSV Files (Spreadsheet Format)
              </Button>

              <Button
                onClick={() => setExportData(null)}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            {/* Format Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>JSON:</strong> Single file with all data, readable by any program</p>
              <p><strong>CSV:</strong> Multiple files (one per category), open in Excel/Sheets</p>
            </div>
          </div>
        )}

        {/* GDPR Notice */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Data Portability Rights:</strong> Under GDPR, you have the right to receive your personal data in a structured, commonly used format. This export includes all data associated with groups where you are the administrator.
          </p>
        </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Export Your Data
        </CardTitle>
        <CardDescription>
          Download all your data in JSON or CSV format (GDPR compliant)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
