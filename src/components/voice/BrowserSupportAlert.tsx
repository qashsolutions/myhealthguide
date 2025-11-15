'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Chrome } from 'lucide-react';
import { checkVoiceInputSupport } from '@/lib/voice/browserSupport';
import Link from 'next/link';

interface BrowserSupportAlertProps {
  manualEntryUrl: string;
}

export function BrowserSupportAlert({ manualEntryUrl }: BrowserSupportAlertProps) {
  const [supportInfo, setSupportInfo] = useState<{
    isSupported: boolean;
    browserName: string;
    recommendation?: string;
  } | null>(null);

  useEffect(() => {
    const info = checkVoiceInputSupport();
    setSupportInfo(info);
  }, []);

  // Don't show anything if supported or still checking
  if (!supportInfo || supportInfo.isSupported) {
    return null;
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
        Voice Input Not Supported
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-amber-800 dark:text-amber-200">
          {supportInfo.recommendation || 'Your browser does not support voice input.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={manualEntryUrl}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Use Manual Entry
            </Button>
          </Link>

          {supportInfo.browserName === 'Firefox' && (
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <Chrome className="w-4 h-4" />
              <span>Try Chrome, Safari, or Edge for voice features</span>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
