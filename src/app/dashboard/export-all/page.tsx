'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileArchive, AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { exportAllUserData, estimateExportSize } from '@/lib/firebase/completeDataExport';

export default function ExportAllDataPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [gracePeriodHours, setGracePeriodHours] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Calculate estimated size
    if (user.id) {
      estimateExportSize(user.id).then(size => {
        setEstimatedSize(size);
      });
    }

    // Calculate grace period hours remaining
    if (user.subscriptionStatus === 'expired' && user.gracePeriodEndDate) {
      const calculateHours = () => {
        const now = new Date();
        const endDate = new Date(user.gracePeriodEndDate!);
        const diffMs = endDate.getTime() - now.getTime();
        const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
        setGracePeriodHours(hours);
      };

      calculateHours();
      const interval = setInterval(calculateHours, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [user, router]);

  const handleExport = async () => {
    if (!user) return;

    setExporting(true);
    setError(null);

    try {
      await exportAllUserData(user.id);
      // Export successful - show confirmation
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again or contact support.');
    } finally {
      setExporting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="w-6 h-6 text-blue-600" />
            Export All Your Data
          </CardTitle>
          <CardDescription>
            Download a complete archive of all your health data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grace Period Warning */}
          {user.subscriptionStatus === 'expired' && gracePeriodHours !== null && (
            <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>{gracePeriodHours} hours remaining</strong> until your data is permanently deleted.
                Export now to keep a copy of your health records.
              </AlertDescription>
            </Alert>
          )}

          {/* What's Included */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What&apos;s Included in Your Export</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Health Records</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All elder profiles, medications, and supplements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Complete History</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All medication logs, diet entries, and activity records
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Group Data</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All groups you&apos;re part of and their settings
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">PDF Reports</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Individual health reports for each elder
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">PHI Audit Log</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Complete access history (HIPAA compliance)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Machine Readable</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      JSON format for importing to other systems
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Info */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-semibold mb-3">Export Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <span className="font-medium">ZIP Archive</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contents:</span>
                <span className="font-medium">JSON + PDF Reports</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Estimated Size:</span>
                <span className="font-medium">
                  {estimatedSize
                    ? `${(estimatedSize / 1024 / 1024).toFixed(2)} MB`
                    : 'Calculating...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Privacy:</span>
                <span className="font-medium text-green-600">Secure & Private</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Important:</strong> Your export contains Protected Health Information (PHI).
              Store it securely and delete when no longer needed.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleExport}
              disabled={exporting}
              size="lg"
              className="flex-1"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Preparing Export...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Complete Export
                </>
              )}
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              size="lg"
            >
              Cancel
            </Button>
          </div>

          {/* After Export Info */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-4 border-t">
            <p className="mb-2">After downloading your data, you can:</p>
            <ul className="space-y-1">
              <li>• Return to the dashboard and subscribe to keep using the app</li>
              <li>• Contact support if you need help: support@myguide.health</li>
              <li>• Your data will be automatically deleted after the grace period</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
