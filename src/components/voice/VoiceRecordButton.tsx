'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MicrophonePermissionDialog } from './MicrophonePermissionDialog';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';

interface VoiceRecordButtonProps {
  onRecordingComplete: (transcript: string) => void;
  onError?: (error: Error) => void;
  isRecording?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

export function VoiceRecordButton({
  onRecordingComplete,
  onError,
  isRecording: externalIsRecording,
  disabled = false,
  className,
  size = 'default',
  variant = 'default'
}: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Microphone permission management
  const {
    permissionStatus,
    consentStatus,
    showConsentDialog,
    requestPermission,
    handleConsent,
    handleDeny
  } = useMicrophonePermission();

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsProcessing(false);
          setIsRecording(false);
          onRecordingComplete(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsProcessing(false);
          setIsRecording(false);

          const errorMessage = event.error === 'not-allowed'
            ? 'Microphone access denied. Please allow microphone access in your browser settings.'
            : `Speech recognition error: ${event.error}`;

          if (onError) {
            onError(new Error(errorMessage));
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          setIsProcessing(false);
        };

        setRecognition(recognition);
      }
    }
  }, [onRecordingComplete, onError]);

  const startRecording = () => {
    if (!recognition) {
      if (onError) {
        onError(new Error('Speech recognition not supported in this browser. Try Chrome or Edge.'));
      }
      return;
    }

    try {
      setIsRecording(true);
      recognition.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsProcessing(true);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Check if we have permission first
      if (permissionStatus === 'granted') {
        startRecording();
      } else if (consentStatus === 'denied' || permissionStatus === 'denied') {
        if (onError) {
          onError(new Error('Microphone access denied. Please use manual entry or change browser settings.'));
        }
      } else {
        // Request permission (will show consent dialog if needed)
        requestPermission();
      }
    }
  };

  // Auto-start recording when permission is granted
  useEffect(() => {
    if (permissionStatus === 'granted' && consentStatus === 'consented') {
      // Small delay to ensure dialog has closed
      const timer = setTimeout(() => {
        if (!isRecording && !isProcessing) {
          startRecording();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [permissionStatus, consentStatus]);

  const effectiveIsRecording = externalIsRecording ?? isRecording;
  const isCheckingPermission = permissionStatus === 'checking';

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing || isCheckingPermission}
        variant={variant}
        size={size}
        className={cn(
          'relative transition-all',
          effectiveIsRecording && 'bg-red-500 hover:bg-red-600 text-white',
          className
        )}
      >
        {isProcessing || isCheckingPermission ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isCheckingPermission ? 'Checking...' : 'Processing...'}
          </>
        ) : effectiveIsRecording ? (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Stop Recording
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Voice Input
          </>
        )}
      </Button>

      {/* GDPR-compliant permission dialog */}
      <MicrophonePermissionDialog
        open={showConsentDialog}
        onAllow={handleConsent}
        onDeny={handleDeny}
      />
    </>
  );
}
