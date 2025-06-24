'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  createSpeechRecognition,
  speak,
  getPreferredVoice,
  parseVoiceCommand,
  correctMedicationName,
} from '@/lib/utils/voice';

/**
 * Custom hook for voice functionality
 * Handles both speech recognition and synthesis
 */

interface UseVoiceOptions {
  onResult?: (text: string) => void;
  onCommand?: (command: string, parameters: Record<string, any>) => void;
  continuous?: boolean;
  autoStop?: boolean;
}

interface UseVoiceReturn {
  isListening: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, options?: { onEnd?: () => void }) => void;
  stopSpeaking: () => void;
  clearTranscript: () => void;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Check browser support
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported() && isSpeechSynthesisSupported());
    
    // Load preferred voice
    if (isSpeechSynthesisSupported()) {
      getPreferredVoice().then(voice => {
        preferredVoiceRef.current = voice;
      });
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const recognition = createSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    // Handle results
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          final += text + ' ';
        } else {
          interim += text;
        }
      }

      if (final) {
        const correctedText = correctMedicationName(final.trim());
        setTranscript(prev => prev + ' ' + correctedText);
        setInterimTranscript('');
        
        // Handle callbacks
        if (options.onResult) {
          options.onResult(correctedText);
        }
        
        if (options.onCommand) {
          const { command, parameters } = parseVoiceCommand(correctedText);
          if (command) {
            options.onCommand(command, parameters);
          }
        }
        
        // Auto stop if configured
        if (options.autoStop !== false) {
          setIsListening(false);
          recognition.stop();
        }
      } else {
        setInterimTranscript(interim);
      }
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      
      let errorMessage = 'Speech recognition error';
      
      // Add more detailed error logging
      if (process.env.NODE_ENV === 'development') {
        console.error('Speech Recognition Error Details:', {
          error: event.error,
          message: event.message,
          type: event.type
        });
      }
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your settings.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
      }
      
      setError(errorMessage);
      setIsListening(false);
    };

    // Handle end
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, options]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      // Set listening state first for immediate visual feedback
      setIsListening(true);
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      setIsListening(false); // Reset state
      
      // Provide more specific error messages
      if (err.message?.includes('not-allowed')) {
        setError('Microphone access denied. Please check your browser settings.');
      } else if (err.message?.includes('no-speech')) {
        setError('No speech detected. Please try speaking louder.');
      } else {
        setError('Voice input not available. Please try typing instead.');
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    recognitionRef.current.stop();
    setIsListening(false);
  }, [isListening]);

  // Speak text
  const speakText = useCallback((text: string, speakOptions?: { onEnd?: () => void }) => {
    if (!isSpeechSynthesisSupported()) {
      setError('Speech synthesis not supported');
      return;
    }

    setIsSpeaking(true);
    
    speak(text, {
      voice: preferredVoiceRef.current || undefined,
      onEnd: () => {
        setIsSpeaking(false);
        speakOptions?.onEnd?.();
      },
    });
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    isSpeaking,
    transcript: transcript.trim(),
    interimTranscript,
    error,
    startListening,
    stopListening,
    speak: speakText,
    stopSpeaking,
    clearTranscript,
  };
}