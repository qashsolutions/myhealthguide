'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataDeletionService, DeletionResult } from '@/lib/firebase/dataDeletion';
import { Trash2, AlertTriangle, Loader, CheckCircle } from 'lucide-react';

interface DataDeletionPanelProps {
  userId: string;
  isAdmin: boolean;
  userEmail: string;
}

export function DataDeletionPanel({ userId, isAdmin, userEmail }: DataDeletionPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null);
  const [error, setError] = useState('');

  const CONFIRM_TEXT = 'DELETE MY DATA';

  const handleDelete = async () => {
    if (!isAdmin) {
      setError('Only group admins can delete data');
      return;
    }

    if (confirmText !== CONFIRM_TEXT) {
      setError(`Please type "${CONFIRM_TEXT}" to confirm`);
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const result = await DataDeletionService.deleteAllUserData(userId);
      setDeletionResult(result);

      if (result.success) {
        // Redirect to logout/home after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (err) {
      console.error('Deletion error:', err);
      setError('Failed to delete data. Please contact support.');
    } finally {
      setDeleting(false);
    }
  };

  if (deletionResult?.success) {
    return (
      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Data Deleted Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <AlertDescription className="text-green-800 dark:text-green-200">
              Your data has been permanently deleted. You will be redirected shortly...
            </AlertDescription>
          </Alert>

          {/* Deletion Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">Groups Deleted</p>
              <p className="text-lg font-bold">{deletionResult.deletedCounts.groups}</p>
            </div>
            <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">Elders Deleted</p>
              <p className="text-lg font-bold">{deletionResult.deletedCounts.elders}</p>
            </div>
            <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">Medications Deleted</p>
              <p className="text-lg font-bold">{deletionResult.deletedCounts.medications}</p>
            </div>
            <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">Logs Deleted</p>
              <p className="text-lg font-bold">
                {deletionResult.deletedCounts.medicationLogs +
                  deletionResult.deletedCounts.supplementLogs +
                  deletionResult.deletedCounts.dietEntries}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-5 h-5" />
          Delete All Data
        </CardTitle>
        <CardDescription>
          Permanently delete all your data (GDPR Right to be Forgotten)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Alert */}
        <Alert className="bg-red-50 dark:bg-red-900/20 border-red-500">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
            <p className="font-bold mb-2">⚠️ WARNING: This action is IRREVERSIBLE!</p>
            <p className="text-sm mb-2">This will permanently delete:</p>
            <ul className="text-sm space-y-1">
              <li>✗ Your account and profile</li>
              <li>✗ All groups where you are admin</li>
              <li>✗ All elder profiles</li>
              <li>✗ All medications and schedules</li>
              <li>✗ All logs and history</li>
              <li>✗ All uploaded files</li>
              <li>✗ Everything associated with your account</li>
            </ul>
            <p className="text-sm mt-2 font-bold">
              This data CANNOT be recovered after deletion!
            </p>
          </AlertDescription>
        </Alert>

        {/* Error */}
        {error && (
          <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!showConfirm ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Before deleting:</strong>
              </p>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>Export your data first (see above)</li>
                <li>Transfer group ownership if needed</li>
                <li>Inform other group members</li>
                <li>Cancel your subscription</li>
              </ol>
            </div>

            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!isAdmin}
              variant="destructive"
              className="w-full"
            >
              I Want to Delete My Data
            </Button>

            {!isAdmin && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Only group admins can delete data
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmDelete">
                Type <strong>{CONFIRM_TEXT}</strong> to confirm:
              </Label>
              <Input
                id="confirmDelete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder={CONFIRM_TEXT}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Your email: {userEmail}</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verify this is your account before proceeding
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDelete}
                disabled={deleting || confirmText !== CONFIRM_TEXT}
                variant="destructive"
                className="flex-1"
              >
                {deleting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>

              <Button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText('');
                  setError('');
                }}
                variant="outline"
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* GDPR Notice */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Right to be Forgotten:</strong> Under GDPR, you have the right to request deletion of your personal data. This action will permanently remove all your data from our systems within 30 days. Some data may be retained for legal compliance purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
