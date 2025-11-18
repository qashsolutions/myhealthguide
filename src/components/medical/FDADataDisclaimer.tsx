'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface FDADataDisclaimerProps {
  medicationName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function FDADataDisclaimer({
  medicationName,
  onAccept,
  onDecline
}: FDADataDisclaimerProps) {
  const [understood, setUnderstood] = useState(false);
  const [willConsult, setWillConsult] = useState(false);

  const canProceed = understood && willConsult;

  return (
    <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
              Before Viewing FDA Drug Information
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              Please read and acknowledge this disclaimer
            </p>
          </div>
        </div>

        {/* Disclaimer Content */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-red-800 dark:text-red-200">
              ⚠️ CRITICAL: This is NOT medical advice
            </p>

            <div className="space-y-2">
              <p>
                You are about to view FDA drug label information for{' '}
                <strong className="text-gray-900 dark:text-gray-100">{medicationName}</strong>.
              </p>

              <p className="font-medium">This information:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Is provided <strong>VERBATIM</strong> from the FDA drug label database</li>
                <li>Is for <strong>INFORMATIONAL PURPOSES ONLY</strong></li>
                <li>Is <strong>NOT personalized medical advice</strong> for this patient</li>
                <li>Does <strong>NOT replace consultation</strong> with a doctor or pharmacist</li>
                <li>May <strong>NOT apply</strong> to this patient's specific situation</li>
              </ul>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 mt-3">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  YOU MUST:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-yellow-800 dark:text-yellow-200">
                  <li>Discuss ALL medication questions with a doctor or pharmacist</li>
                  <li>
                    <strong>NEVER</strong> stop, start, or change medications based on this
                    information
                  </li>
                  <li>Report ALL symptoms and concerns to healthcare providers</li>
                  <li>Call 911 for medical emergencies</li>
                </ul>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs">
                <p className="font-semibold mb-1">Source Attribution:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Data source: U.S. Food and Drug Administration (FDA) openFDA Drug Label Database
                </p>
                <a
                  href="https://open.fda.gov/apis/drug/label/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  View FDA API Documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Acknowledgment Checkboxes */}
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked === true)}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I understand this is FDA drug label data and <strong>NOT medical advice</strong>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={willConsult}
              onCheckedChange={(checked) => setWillConsult(checked === true)}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I will <strong>consult a doctor or pharmacist</strong> before making any medication
              decisions
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onDecline} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onAccept} disabled={!canProceed} className="flex-1">
            I Understand - View FDA Data
          </Button>
        </div>
      </div>
    </Card>
  );
}
