'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processVoiceNavigation } from '@/lib/voice/voiceNavigation';

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface VoiceInputAreaProps {
  placeholder?: string;
}

export function VoiceInputArea({ placeholder = 'Say or type what happened...' }: VoiceInputAreaProps) {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>('idle');
  const [inputText, setInputText] = useState('');
  const [transcription, setTranscription] = useState('');
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const handleCommand = useCallback((text: string) => {
    if (!text.trim()) return;

    setState('processing');
    setTranscription(text);

    const result = processVoiceNavigation(text, true);

    if (result.type === 'navigation' && result.route) {
      router.push(result.route);
    } else {
      // Unrecognized: send to AI chat
      router.push(`/dashboard/ask-ai?q=${encodeURIComponent(text)}`);
    }

    // Reset after navigation
    setTimeout(() => {
      setState('idle');
      setInputText('');
      setTranscription('');
    }, 500);
  }, [router]);

  const startListening = useCallback(() => {
    // Check for Speech Recognition API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setState('listening');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleCommand(transcript);
      };

      recognition.onerror = () => {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      };

      recognition.onend = () => {
        if (state === 'listening') {
          setState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [handleCommand, state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setState('idle');
  }, []);

  const handleMicClick = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'idle' || state === 'error') {
      startListening();
    }
  }, [state, startListening, stopListening]);

  const handleTextSubmit = useCallback(() => {
    if (inputText.trim()) {
      handleCommand(inputText.trim());
    }
  }, [inputText, handleCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextSubmit();
    }
  }, [handleTextSubmit]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 h-12 px-3 rounded-full border transition-colors',
        state === 'listening' && 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20',
        state === 'error' && 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20',
        state !== 'listening' && state !== 'error' && 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
      )}
    >
      {/* Mic button */}
      <button
        onClick={handleMicClick}
        disabled={state === 'processing'}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          state === 'idle' && 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          state === 'listening' && 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 animate-pulse',
          state === 'error' && 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
          state === 'processing' && 'text-gray-400 dark:text-gray-500'
        )}
        aria-label={state === 'listening' ? 'Stop listening' : 'Start voice input'}
      >
        {state === 'processing' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Input / Status text */}
      <div className="flex-1 min-w-0">
        {state === 'listening' ? (
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium" aria-live="polite">
            Listening...
          </span>
        ) : state === 'processing' ? (
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate block" aria-live="polite">
            &ldquo;{transcription}&rdquo;
          </span>
        ) : state === 'error' ? (
          <span className="text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t hear. Tap to try again
          </span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            aria-label="Type an observation or command"
          />
        )}
      </div>

      {/* Send button (only when text is entered) */}
      {inputText.trim() && state === 'idle' && (
        <button
          onClick={handleTextSubmit}
          className="flex items-center justify-center w-8 h-8 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Submit command"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
