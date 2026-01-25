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
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onInterimResult?: (interim: string) => void;
  isRecording?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

export function VoiceRecordButton({
  onRecordingComplete,
  onError,
  onRecordingStart,
  onRecordingStop,
  onInterimResult,
  isRecording: externalIsRecording,
  disabled = false,
  className,
  size = 'default',
  variant = 'default'
}: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [pendingStart, setPendingStart] = useState(false);

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
        recognition.interimResults = true; // Enable interim results for real-time feedback
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const result = event.results[0];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            // Final result - processing complete
            setIsProcessing(false);
            setIsRecording(false);
            onRecordingStop?.();
            onRecordingComplete(transcript);
          } else {
            // Interim result - show real-time feedback
            onInterimResult?.(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsProcessing(false);
          setIsRecording(false);
          onRecordingStop?.();

          let errorMessage: string;

          switch (event.error) {
            case 'not-allowed':
              errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
              break;
            case 'aborted':
              errorMessage = 'Voice input was stopped. Please try again.';
              break;
            case 'no-speech':
              errorMessage = 'No speech detected. Please speak clearly and try again.';
              break;
            case 'audio-capture':
              errorMessage = 'No microphone found. Please check your microphone connection.';
              break;
            case 'network':
              errorMessage = 'Network error. Please check your internet connection.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
          }

          if (onError) {
            onError(new Error(errorMessage));
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          setIsProcessing(false);
          onRecordingStop?.();
        };

        setRecognition(recognition);
      }
    }
  }, [onRecordingComplete, onError, onInterimResult, onRecordingStop]);

  const startRecording = () => {
    if (!recognition) {
      if (onError) {
        onError(new Error('Speech recognition not supported in this browser. Try Chrome or Edge.'));
      }
      return;
    }

    // Prevent starting if already listening
    if (isRecording || isProcessing) {
      console.warn('Already listening');
      return;
    }

    try {
      setIsRecording(true);
      onRecordingStart?.(); // Notify parent that we started listening
      recognition.start();
    } catch (error: any) {
      console.error('Error starting voice input:', error);
      setIsRecording(false);
      onRecordingStop?.();

      // Handle specific error cases
      if (error.message?.includes('already started')) {
        if (onError) {
          onError(new Error('Already listening. Please wait.'));
        }
      } else {
        if (onError) {
          onError(error as Error);
        }
      }
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsProcessing(true);
    }
  };

  const handleClick = async () => {
    console.log('[VoiceRecordButton] Click - permissionStatus:', permissionStatus, 'consentStatus:', consentStatus, 'isRecording:', isRecording);

    if (isRecording) {
      stopRecording();
    } else {
      if (consentStatus === 'denied' || permissionStatus === 'denied') {
        console.log('[VoiceRecordButton] Permission or consent denied');
        if (onError) {
          onError(new Error('Microphone access was denied. To enable voice input:\n\n1. Click the lock/info icon in your browser address bar\n2. Find "Microphone" and change it to "Allow"\n3. Refresh the page and try again\n\nOr simply type your question instead.'));
        }
      } else if (consentStatus === 'consented' && permissionStatus === 'granted') {
        console.log('[VoiceRecordButton] Consent and permission granted, starting recording');
        startRecording();
      } else {
        // Need consent and/or browser permission - show consent dialog first
        console.log('[VoiceRecordButton] Requesting consent/permission, setting pendingStart');
        setPendingStart(true);
        requestPermission();
      }
    }
  };

  // Auto-start recording when both consent and permission are granted after user requested it
  useEffect(() => {
    console.log('[VoiceRecordButton] Permission/consent changed - permissionStatus:', permissionStatus, 'consentStatus:', consentStatus, 'pendingStart:', pendingStart);

    if (pendingStart && permissionStatus === 'granted' && consentStatus === 'consented') {
      console.log('[VoiceRecordButton] Auto-starting recording after consent and permission granted');
      // Small delay to ensure dialog has closed
      const timer = setTimeout(() => {
        if (!isRecording && !isProcessing) {
          startRecording();
          setPendingStart(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionStatus, consentStatus, pendingStart]);

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
            <Mic className="w-4 h-4 mr-2 animate-pulse" />
            Listening...
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
