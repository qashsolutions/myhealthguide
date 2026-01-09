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
import { Camera, Shield, Info, Lock, AlertCircle, QrCode, HandMetal, CheckCircle2, MousePointer2 } from 'lucide-react';
import Link from 'next/link';

interface CameraPermissionDialogProps {
  open: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export function CameraPermissionDialog({
  open,
  onAllow,
  onDeny
}: CameraPermissionDialogProps) {
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
            <Camera className="w-5 h-5 text-blue-600" />
            Camera Access Required
          </DialogTitle>
          <DialogDescription>
            QR code scanning requires access to your camera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What we'll do */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  QR Code Scanning
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  We&apos;ll use your camera to scan QR codes for clock-in/out verification at your loved one&apos;s location.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  No Recording or Storage
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Camera access is only used for real-time QR code detection. No photos or videos are captured, recorded, or stored.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  Location Verification
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Along with QR scanning, we verify your location to ensure accurate timesheet records. Only verification status is saved, not your exact coordinates.
                </p>
              </div>
            </div>
          </div>

          {/* GDPR Notice */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="ml-2 text-sm text-blue-800 dark:text-blue-200">
              <strong>Your Rights:</strong> You can deny camera access and use manual clock-in instead. You can revoke this permission anytime in your browser settings. For more information, see our{' '}
              <Link href="/privacy" className="underline font-medium">
                Privacy Policy
              </Link>.
            </AlertDescription>
          </Alert>

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <Checkbox
              id="camera-consent"
              checked={hasConsented}
              onCheckedChange={(checked) => setHasConsented(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="camera-consent"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I understand and consent to camera access for QR code scanning. I acknowledge that no photos or videos will be stored, and only verification status is recorded.
              </Label>
            </div>
          </div>

          {/* Warning if not consented */}
          {!hasConsented && (
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="ml-2 text-sm text-amber-800 dark:text-amber-200">
                Please read and accept the consent checkbox above to enable QR scanning.
              </AlertDescription>
            </Alert>
          )}

          {/* Step-by-step browser guidance for 65+ users */}
          {hasConsented && (
            <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                <HandMetal className="w-5 h-5" />
                What Happens Next (3 Easy Steps)
              </h4>
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Click the green &quot;Allow Camera Access&quot; button below
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      <MousePointer2 className="w-3 h-3 inline mr-1" />
                      It&apos;s the button on the right side
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Your browser will show a popup at the TOP of your screen
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      Look for a small box near the address bar asking about camera
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Click &quot;Allow&quot; in the browser popup
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      Then your camera will turn on automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Tip for mobile */}
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                <p className="text-xs text-green-800 dark:text-green-200">
                  <strong>On your phone?</strong> The popup may appear at the bottom of your screen instead.
                </p>
              </div>
            </div>
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
            <Camera className="w-4 h-4" />
            Allow Camera Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
