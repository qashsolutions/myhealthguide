'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  Heart,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth, withAuth } from '@/hooks/useAuth';
import { HealthQuestion, HealthAnswer } from '@/types';
import { ROUTES, DISCLAIMERS } from '@/lib/constants';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  speak,
  getPreferredVoice
} from '@/lib/utils/voice';

/**
 * Health Q&A page with voice input/output
 * AI-powered health questions for elderly users
 */
function HealthQAPage() {
  const router = useRouter();
  const { user, getAuthToken } = useAuth();
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAnswers, setRecentAnswers] = useState<HealthAnswer[]>([]);
  const [showVoiceHint, setShowVoiceHint] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check for voice support
  const voiceSupported = isSpeechRecognitionSupported();

  // Load recent answers from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('healthQAHistory');
      if (stored) {
        try {
          setRecentAnswers(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load history:', e);
        }
      }
    }
  }, []);

  // Save answers to session storage
  const saveToHistory = (answer: HealthAnswer) => {
    const updated = [answer, ...recentAnswers].slice(0, 5); // Keep last 5
    setRecentAnswers(updated);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('healthQAHistory', JSON.stringify(updated));
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (voiceSupported && !recognitionRef.current) {
      const recognition = createSpeechRecognition();
      if (recognition) {
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuestion(prev => prev + ' ' + transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setError('Could not understand. Please try again or type your question.');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [voiceSupported]);

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setShowVoiceHint(false);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Read answer aloud
  const speakAnswer = async (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const voice = await getPreferredVoice();
    
    speak(text, {
      voice: voice || undefined,
      onEnd: () => setIsSpeaking(false),
    });
  };

  // Submit question
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Please enter a question');
      return;
    }

    if (trimmedQuestion.length < 5) {
      setError('Please enter a more detailed question');
      return;
    }

    setError(null);
    setIsAsking(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/health-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          context: `User is ${user?.name || 'an elderly person'}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      // Save to history
      saveToHistory(data.data);
      
      // Clear question
      setQuestion('');
      
      // Auto-speak answer if voice was used for question
      if (!showVoiceHint && voiceSupported) {
        setTimeout(() => speakAnswer(data.data.answer), 500);
      }
    } catch (err) {
      console.error('Health Q&A error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsAsking(false);
    }
  };

  // Common health topics for quick access
  const commonTopics = [
    "Side effects of blood pressure medication",
    "Safe pain relief for arthritis",
    "Foods to avoid with diabetes",
    "How to improve sleep quality",
    "Managing medication schedules",
  ];

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <button
        onClick={() => router.push(ROUTES.DASHBOARD)}
        className="inline-flex items-center gap-2 text-elder-base text-primary-600 hover:text-primary-700 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Dashboard
      </button>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary-100 rounded-full">
            <MessageCircle className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text">
              Health Questions
            </h1>
            <p className="text-elder-lg text-elder-text-secondary">
              Ask any health question and get clear, simple answers
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-elder p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
          <p className="text-elder-base text-primary-800">
            {DISCLAIMERS.AI_LIMITATIONS}
          </p>
        </div>
      </div>

      {/* Question Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-white rounded-elder-lg shadow-sm p-6">
          <label htmlFor="question" className="block text-elder-lg font-medium text-elder-text mb-4">
            What's your health question?
          </label>
          
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here or use the microphone..."
              className="w-full px-4 py-3 pr-14 border-2 border-elder-border rounded-elder text-elder-base leading-elder resize-none focus:outline-none focus:ring-4 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              disabled={isAsking || isListening}
            />
            
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${
                  isListening 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </button>
            )}
          </div>

          {/* Voice hint */}
          {voiceSupported && showVoiceHint && (
            <p className="mt-2 text-elder-sm text-elder-text-secondary">
              💡 Tip: Click the microphone to ask your question by voice
            </p>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder">
              <p className="text-elder-base text-health-danger">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <div className="mt-6">
            <Button
              type="submit"
              variant="primary"
              size="large"
              loading={isAsking}
              disabled={!question.trim() || isListening}
              icon={<Send className="h-5 w-5" />}
              className="w-full elder-tablet:w-auto"
            >
              Get Answer
            </Button>
          </div>
        </div>
      </form>

      {/* Common Topics */}
      {recentAnswers.length === 0 && (
        <div className="mb-8">
          <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
            Common Health Topics
          </h2>
          <div className="grid gap-3">
            {commonTopics.map((topic, index) => (
              <button
                key={index}
                onClick={() => setQuestion(topic)}
                className="text-left p-4 bg-white hover:bg-gray-50 rounded-elder border-2 border-elder-border hover:border-primary-300 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500"
              >
                <p className="text-elder-base text-elder-text">{topic}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Answers */}
      {recentAnswers.length > 0 && (
        <div>
          <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
            Recent Questions
          </h2>
          <div className="space-y-4">
            {recentAnswers.map((answer) => (
              <div
                key={answer.id}
                className="bg-white rounded-elder-lg shadow-sm p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-elder-base font-semibold text-elder-text mb-2">
                      {answer.question}
                    </h3>
                    <p className="text-elder-sm text-elder-text-secondary">
                      Asked {new Date(answer.answeredAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => speakAnswer(answer.answer)}
                    className="p-2 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500"
                    aria-label={isSpeaking ? 'Stop reading' : 'Read answer aloud'}
                  >
                    <Volume2 className={`h-6 w-6 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-elder-base text-elder-text leading-elder">
                    {answer.answer}
                  </p>
                </div>
                
                {answer.confidence && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${answer.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-elder-sm text-elder-text-secondary">
                      {Math.round(answer.confidence * 100)}% confident
                    </span>
                  </div>
                )}
                
                <p className="mt-4 text-elder-sm text-elder-text-secondary italic">
                  {answer.disclaimer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 p-6 bg-elder-background-alt rounded-elder-lg">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-6 w-6 text-health-danger" />
          <h2 className="text-elder-lg font-semibold">
            Getting the Most from Health Q&A
          </h2>
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Be specific about your symptoms or concerns
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Include relevant details like age or existing conditions
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              Always verify AI answers with your healthcare provider
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary-600">•</span>
            <p className="text-elder-base text-elder-text-secondary">
              For emergencies, call 911 immediately
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default withAuth(HealthQAPage, { requireDisclaimer: true });