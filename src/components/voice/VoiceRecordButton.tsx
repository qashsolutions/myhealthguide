'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      startRecording();
    }
  };

  const effectiveIsRecording = externalIsRecording ?? isRecording;

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      variant={variant}
      size={size}
      className={cn(
        'relative transition-all',
        effectiveIsRecording && 'bg-red-500 hover:bg-red-600 text-white',
        className
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
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
  );
}
