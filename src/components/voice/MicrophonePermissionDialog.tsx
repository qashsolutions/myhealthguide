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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mic, Shield, Info, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface MicrophonePermissionDialogProps {
  open: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export function MicrophonePermissionDialog({
  open,
  onAllow,
  onDeny
}: MicrophonePermissionDialogProps) {
  const [hasConsented, setHasConsented] = useState(false);

  const handleAllow = () => {
    if (!hasConsented) {
      return;
    }
    onAllow();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDeny()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-600" />
            Microphone Access Required
          </DialogTitle>
          <DialogDescription>
            Voice input requires access to your microphone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What we'll do */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  Voice Recording
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  We&apos;ll use your microphone to record your voice commands for logging medications, meals, and health data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  Processed Locally
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Your voice is processed directly in your browser using the Web Speech API. Audio is not recorded, stored, or transmitted to our servers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  Privacy Protected
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Only the text transcript (what you said) is saved to help you log health information. The audio itself is discarded immediately after transcription.
                </p>
              </div>
            </div>
          </div>

          {/* GDPR Notice */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="ml-2 text-sm text-blue-800 dark:text-blue-200">
              <strong>Your Rights:</strong> You can deny microphone access and use manual entry instead. You can revoke this permission anytime in your browser settings. For more information, see our{' '}
              <Link href="/privacy" className="underline font-medium">
                Privacy Policy
              </Link>.
            </AlertDescription>
          </Alert>

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <Checkbox
              id="consent"
              checked={hasConsented}
              onCheckedChange={(checked) => setHasConsented(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="consent"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I understand and consent to microphone access for voice input. I acknowledge that my voice will be processed locally in my browser and only text transcripts will be saved.
              </Label>
            </div>
          </div>

          {/* Warning if not consented */}
          {!hasConsented && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="ml-2 text-sm text-amber-800 dark:text-amber-200">
                Please read and accept the consent checkbox above to enable voice input.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDeny}>
            Deny - Use Manual Entry
          </Button>
          <Button
            onClick={handleAllow}
            disabled={!hasConsented}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Allow Microphone Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
