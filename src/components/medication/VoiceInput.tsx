'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Mic } from 'lucide-react';
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
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
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
    autoStop: false, // Keep listening until manually stopped or timeout
  });

  // Show error in console
  useEffect(() => {
    if (error) {
      console.error('Voice input error:', error);
    }
  }, [error]);

  // Handle listening state changes
  useEffect(() => {
    if (isListening) {
      // Start 45-second timer
      setTimeRemaining(45);
      
      // Update countdown every second
      countdownRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            stopListening();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Auto-stop after 45 seconds
      timerRef.current = setTimeout(() => {
        stopListening();
      }, 45000);
    } else {
      // Clear timers when stopped
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setTimeRemaining(null);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isListening, stopListening]);

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

  // Check if Safari on Mac
  const isSafariMac = typeof window !== 'undefined' && 
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && 
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Don't render if not supported or Safari on Mac
  if (!isSupported || isSafariMac) {
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
          'relative p-2.5 rounded-full transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          isListening ? [
            'bg-primary-600 text-white ring-4 ring-primary-200',
            'hover:bg-primary-700'
          ] : [
            'bg-elder-background hover:bg-elder-background-alt',
            'text-elder-text hover:text-primary-600'
          ]
        )}
      >
        <Mic className="h-5 w-5" />
        
        {/* Active listening indicators */}
        {isListening && (
          <>
            {/* Pulsing ring effect */}
            <span className="absolute inset-0 rounded-full bg-primary-600 animate-ping opacity-30" />
            {/* Recording dot - larger and more visible */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
          </>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isListening && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-elder-text text-white text-elder-sm rounded-elder whitespace-nowrap shadow-elder">
          {placeholder}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-elder-text" />
        </div>
      )}

      {/* Listening feedback with timer */}
      {isListening && (
        <div className="absolute top-full right-0 mt-3 px-4 py-3 bg-primary-600 text-white rounded-elder shadow-lg min-w-[140px] z-50">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="h-2 w-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-elder-sm font-medium">Listening</span>
          </div>
          {timeRemaining !== null && (
            <div className="text-xs mt-1 text-primary-100">
              {timeRemaining}s remaining
            </div>
          )}
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