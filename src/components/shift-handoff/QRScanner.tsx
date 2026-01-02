'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  CameraOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  isProcessing?: boolean;
}

export function QRScanner({
  onScanSuccess,
  onScanError,
  onClose,
  isProcessing = false,
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-scanner-container';

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setError(null);

    try {
      // Create scanner instance
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      const scanner = scannerRef.current;

      // Check if already scanning
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        return;
      }

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();

      if (cameras.length === 0) {
        setError('No camera found. Please ensure camera access is allowed.');
        setHasPermission(false);
        return;
      }

      setHasPermission(true);

      // Prefer back camera for mobile devices
      const backCamera = cameras.find(
        (camera) =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear')
      );
      const cameraId = backCamera?.id || cameras[0].id;

      // Start scanning
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // QR code scanned successfully
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore "QR code parse error" - this happens when camera sees something that's not a QR code
          if (!errorMessage.includes('parse')) {
            console.log('QR scan info:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setScannerReady(true);
    } catch (err: any) {
      console.error('Failed to start scanner:', err);

      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access to scan QR codes.');
        setHasPermission(false);
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
        setHasPermission(false);
      } else {
        setError(err.message || 'Failed to start camera. Please try again.');
      }

      onScanError?.(err.message || 'Scanner error');
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        await scannerRef.current.stop();
      }
      setIsScanning(false);
      setScannerReady(false);
    } catch (err) {
      console.error('Failed to stop scanner:', err);
    }
  };

  const restartScanning = async () => {
    await stopScanning();
    setTimeout(() => {
      startScanning();
    }, 500);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Scanner Container */}
        <div className="relative">
          {/* Scanner View */}
          <div
            id={containerId}
            className={`w-full ${isScanning ? 'min-h-[300px]' : 'h-0'}`}
            style={{ background: '#000' }}
          />

          {/* Initial State - Start Camera */}
          {!isScanning && !error && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Scan QR Code
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Point your camera at the elder&apos;s QR code to clock in
              </p>
              <Button onClick={startScanning} disabled={isProcessing}>
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex gap-2 mt-4 justify-center">
                <Button variant="outline" onClick={() => setError(null)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                {onClose && (
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
              <p className="text-white text-sm">Verifying location...</p>
            </div>
          )}

          {/* Scanner Controls */}
          {isScanning && !isProcessing && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={restartScanning}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={stopScanning}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <CameraOff className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Scanning Instructions */}
        {isScanning && !isProcessing && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-center">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Position the QR code within the frame
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============= Location Override Dialog =============

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OverrideReason, OVERRIDE_REASON_LABELS } from '@/types/timesheet';

interface LocationOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: OverrideReason) => void;
  distanceMeters: number;
  elderName: string;
}

export function LocationOverrideDialog({
  open,
  onClose,
  onConfirm,
  distanceMeters,
  elderName,
}: LocationOverrideDialogProps) {
  const [selectedReason, setSelectedReason] = useState<OverrideReason | ''>('');

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      setSelectedReason('');
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Location Verification Required
          </DialogTitle>
          <DialogDescription>
            Your current location is <strong>{formatDistance(distanceMeters)}</strong> away from{' '}
            <strong>{elderName}</strong>&apos;s registered address.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Select reason for location override:
          </label>
          <Select
            value={selectedReason}
            onValueChange={(value) => setSelectedReason(value as OverrideReason)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OVERRIDE_REASON_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            This will be recorded in your timesheet and may be reviewed by your supervisor.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedReason}>
            Continue with Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= GPS Status Component =============

interface GPSStatusProps {
  status: 'idle' | 'capturing' | 'verified' | 'override' | 'error';
  distanceMeters?: number;
  accuracy?: number;
  errorMessage?: string;
  overrideReason?: string;
}

export function GPSStatus({
  status,
  distanceMeters,
  accuracy,
  errorMessage,
  overrideReason,
}: GPSStatusProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return {
          icon: <div className="w-3 h-3 rounded-full bg-gray-300" />,
          text: 'Waiting for QR scan...',
          color: 'text-gray-500',
        };
      case 'capturing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
          text: 'Capturing location...',
          color: 'text-blue-600',
        };
      case 'verified':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: `Location verified (${distanceMeters}m)`,
          color: 'text-green-600',
        };
      case 'override':
        return {
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
          text: `Override: ${overrideReason} (${distanceMeters}m)`,
          color: 'text-amber-600',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: errorMessage || 'Location error',
          color: 'text-red-600',
        };
      default:
        return {
          icon: null,
          text: '',
          color: '',
        };
    }
  };

  const { icon, text, color } = getStatusDisplay();

  return (
    <div className={`flex items-center gap-2 text-sm ${color}`}>
      {icon}
      <span>{text}</span>
      {accuracy && status === 'verified' && (
        <span className="text-xs text-gray-400">(±{Math.round(accuracy)}m accuracy)</span>
      )}
    </div>
  );
}
