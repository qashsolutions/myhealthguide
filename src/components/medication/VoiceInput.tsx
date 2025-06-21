'use client';

import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { clsx } from 'clsx';

/**
 * Voice input component for speech recognition
 * Accessible microphone button with visual feedback
 */

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VoiceInput({ 
  onResult, 
  placeholder = 'Click to speak',
  disabled = false 
}: VoiceInputProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoice({
    onResult: (text) => {
      onResult(text);
      clearTranscript();
    },
    autoStop: true,
  });

  // Show error in console
  useEffect(() => {
    if (error) {
      console.error('Voice input error:', error);
    }
  }, [error]);

  // Handle click
  const handleClick = () => {
    if (disabled || !isSupported) return;
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return <></>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        disabled={disabled}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        className={clsx(
          'relative p-3 rounded-elder transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          isListening ? [
            'bg-health-danger text-white',
            'hover:bg-red-600',
            'animate-pulse'
          ] : [
            'bg-elder-background hover:bg-elder-background-alt',
            'text-elder-text hover:text-primary-600'
          ]
        )}
      >
        {isListening ? (
          <>
            <MicOff className="h-6 w-6" />
            {/* Recording indicator */}
            <span className="absolute top-0 right-0 h-3 w-3 bg-white rounded-full animate-pulse" />
          </>
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isListening && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-elder-text text-white text-elder-sm rounded-elder whitespace-nowrap shadow-elder">
          {placeholder}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-elder-text" />
        </div>
      )}

      {/* Listening feedback */}
      {isListening && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-elder-text text-white rounded-elder shadow-elder flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-elder-sm">Listening...</span>
        </div>
      )}

      {/* Error feedback */}
      {error && !isListening && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-health-danger text-white text-elder-sm rounded-elder shadow-elder max-w-xs">
          {error}
        </div>
      )}

      {/* Live transcript (for debugging, hidden in production) */}
      {transcript && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-primary-600 text-white text-elder-sm rounded-elder shadow-elder max-w-xs">
          {transcript}
        </div>
      )}
    </div>
  );
}