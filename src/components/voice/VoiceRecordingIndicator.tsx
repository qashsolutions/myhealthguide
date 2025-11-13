'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  duration?: number;
}

export function VoiceRecordingIndicator({ isRecording, duration = 0 }: VoiceRecordingIndicatorProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isRecording) {
      setSeconds(0);
      const interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setSeconds(0);
    }
  }, [isRecording]);

  if (!isRecording) return null;

  return (
    <Card className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white border-red-600 shadow-lg animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="relative">
          <Mic className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-sm">Recording in progress...</p>
          <p className="text-xs opacity-90">
            {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`}
          </p>
        </div>
      </div>

      {/* Audio wave animation */}
      <div className="flex items-center justify-center gap-1 px-6 pb-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 bg-white rounded-full animate-pulse',
              i % 2 === 0 ? 'h-3' : 'h-5'
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    </Card>
  );
}
