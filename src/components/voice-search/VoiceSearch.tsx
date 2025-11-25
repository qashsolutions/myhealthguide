'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, X, Search, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { VoiceSearchResult } from '@/lib/ai/voiceSearch';

/**
 * VoiceSearch Component
 *
 * Floating voice search button with modal interface
 * Accessible from anywhere in the webapp
 *
 * Features:
 * - Voice input via Web Speech API
 * - Real-time transcription
 * - Semantic search with Gemini 3 Pro
 * - Quick action buttons
 * - Keyboard shortcut (Cmd/Ctrl + K)
 */

export function VoiceSearch() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<VoiceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        // If final result, trigger search
        if (event.results[current].isFinal) {
          handleSearch(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError('Could not recognize speech. Please try again.');
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Keyboard shortcut: Cmd/Ctrl + K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition not supported in your browser.');
      return;
    }

    setError(null);
    setResult(null);
    setTranscript('');
    setIsListening(true);

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setError('Failed to start voice recognition. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim() || !user) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/voice-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userId: user?.id || 'public',
          context: {
            currentPage: window.location.pathname,
            userPermissions: user ? {
              // Subscription info
              subscriptionStatus: user.subscriptionStatus,
              subscriptionTier: user.subscriptionTier,
              emailVerified: user.emailVerified,
              phoneVerified: user.phoneVerified,

              // Group permissions with roles
              groups: user.groups?.map(g => ({
                groupId: g.groupId,
                role: g.role,
              })) || [],

              // Agency permissions with roles and assigned elders
              agencies: user.agencies?.map(a => ({
                agencyId: a.agencyId,
                role: a.role,
                assignedElderIds: a.assignedElderIds,
              })) || [],
            } : undefined, // No permissions for public users
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Voice search request failed');
      }

      const searchResult = await response.json();
      setResult(searchResult);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to process search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTextSearch = () => {
    if (transcript.trim()) {
      handleSearch(transcript);
    }
  };

  const handleClose = () => {
    stopListening();
    setIsOpen(false);
    setTranscript('');
    setResult(null);
    setError(null);
  };

  // Show for everyone (public + authenticated)
  // But filter results based on authentication status

  return (
    <>
      {/* Floating Voice Search Button - Responsive */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-110"
        aria-label="Open voice search"
        title="Voice Search (Cmd/Ctrl + K)"
      >
        <Search className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Voice Search Modal - Responsive */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardContent className="pt-4 sm:pt-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Voice Search
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Voice Input Section - Responsive */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    variant={isListening ? 'destructive' : 'default'}
                    size="lg"
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    <Mic className={`h-5 w-5 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                    {isListening ? 'Stop Listening' : 'Start Voice'}
                  </Button>

                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
                      placeholder="Speak or type your question..."
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm sm:text-base"
                    />

                    <Button
                      onClick={handleTextSearch}
                      disabled={!transcript.trim() || isSearching}
                      size="lg"
                      className="flex-shrink-0"
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {isListening && (
                  <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Listening... Speak now
                  </p>
                )}
              </div>

              {/* Loading State */}
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Searching...
                  </span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Search Results */}
              {result && !isSearching && (
                <div className="space-y-4">
                  {/* Answer */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white font-medium">
                          {result.answer}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Confidence: {result.confidence}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sources */}
                  {result.sources && result.sources.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Sources:
                      </h3>
                      <div className="space-y-2">
                        {result.sources.map((source, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                              {source.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {source.content}
                            </p>
                            {source.url && (
                              <a
                                href={source.url}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                              >
                                View more →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {result.suggestedActions && result.suggestedActions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Quick Actions:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.suggestedActions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (action.url) {
                                window.location.href = action.url;
                              }
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Help Text */}
              {!result && !isSearching && !error && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">
                    Try asking questions like:
                  </p>
                  <ul className="mt-3 space-y-1 text-xs">
                    <li>&quot;How much does the family plan cost?&quot;</li>
                    <li>&quot;What features are included?&quot;</li>
                    <li>&quot;How do I add a medication?&quot;</li>
                    {user && <li>&quot;Show me my medications&quot;</li>}
                  </ul>
                  {!user && (
                    <p className="mt-4 text-xs text-blue-600 dark:text-blue-400">
                      <a href="/signup" className="hover:underline">Sign up</a> to search your personal health data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
