'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileDown, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { MedicationService } from '@/lib/firebase/medications';
import { DietService } from '@/lib/firebase/diet';
import { generateHealthReportPDF } from '@/lib/utils/pdfExport';
import { subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderId: string;
  elderName: string;
  groupId: string;
}

export function ExportDataDialog({
  open,
  onOpenChange,
  elderId,
  elderName,
  groupId
}: ExportDataDialogProps) {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>('30');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateRangeOptions = [
    { value: '7', label: 'Last 7 days' },
    { value: '14', label: 'Last 14 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '180', label: 'Last 6 months' },
    { value: '365', label: 'Last 12 months' }
  ];

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('You must be signed in to export data');
      }

      const userId = user.id;
      const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

      if (!userRole) {
        throw new Error('Unable to determine user role');
      }

      const days = parseInt(dateRange);
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // Fetch medication logs
      const allMedicationLogs = await MedicationService.getLogsByDateRange(
        groupId,
        startDate,
        endDate,
        userId,
        userRole
      );

      // Filter for this elder
      const medicationLogs = allMedicationLogs.filter(log => log.elderId === elderId);

      // Fetch diet entries
      const allDietEntries = await DietService.getEntriesByDateRange(
        groupId,
        startDate,
        endDate,
        userId,
        userRole
      );

      // Filter for this elder
      const dietEntries = allDietEntries.filter(entry => entry.elderId === elderId);

      // Get unique medications
      const uniqueMedicationIds = [...new Set(medicationLogs.map(log => log.medicationId))];
      const medications = await Promise.all(
        uniqueMedicationIds.map(async (medId) => {
          const med = await MedicationService.getMedication(medId, userId, userRole);
          return med ? {
            id: med.id!,
            name: med.name,
            dosage: med.dosage
          } : null;
        })
      );

      const validMedications = medications.filter(m => m !== null) as Array<{
        id: string;
        name: string;
        dosage: string;
      }>;

      // Check if we have any data
      if (medicationLogs.length === 0 && dietEntries.length === 0) {
        setError(`No data found for the selected date range (last ${days} days). Try selecting a longer time period.`);
        setExporting(false);
        return;
      }

      // Generate PDF
      await generateHealthReportPDF({
        elderName,
        startDate,
        endDate,
        medicationLogs,
        dietEntries,
        medications: validMedications
      });

      // Success - close dialog
      onOpenChange(false);

    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to generate PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-600" />
            Export Health Data
          </DialogTitle>
          <DialogDescription>
            Generate a PDF report for {elderName}'s health data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <Label htmlFor="date-range" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select Date Range
            </Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Report will include medication logs, diet entries, and compliance metrics
            </p>
          </div>

          {/* Report Preview */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-semibold mb-2">Report Will Include:</h4>
            <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <li>• Medication compliance summary</li>
              <li>• Individual medication breakdown</li>
              <li>• Missed doses log</li>
              <li>• Diet entries and meal tracking</li>
              <li>• Visual compliance metrics</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
              This report provides data analysis only and does not include medical recommendations.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Download PDF Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
