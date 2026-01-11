'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Search, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { MicrophonePermissionDialog } from '@/components/voice/MicrophonePermissionDialog';
import { checkVoiceInputSupport } from '@/lib/voice/browserSupport';
import type { VoiceSearchResult } from '@/lib/ai/voiceSearch';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

/**
 * VoiceSearch Component
 *
 * Floating voice search button with modal interface
 * Accessible from anywhere in the webapp
 *
 * Features:
 * - Voice input via Web Speech API with GDPR consent
 * - Real-time transcription
 * - Semantic search
 * - Quick action buttons
 * - Keyboard shortcut (Cmd/Ctrl + K)
 * - Mobile-first responsive design
 * - Browser compatibility detection (Chrome, Safari, Edge)
 */

export function VoiceSearch() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<VoiceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState<{ isSupported: boolean; browserName: string; recommendation?: string } | null>(null);
  const [pendingVoiceStart, setPendingVoiceStart] = useState(false);

  const recognitionRef = useRef<any>(null);

  // GDPR-compliant microphone permission management
  const {
    permissionStatus,
    consentStatus,
    showConsentDialog,
    requestPermission,
    handleConsent,
    handleDeny
  } = useMicrophonePermission();

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = checkVoiceInputSupport();
      setBrowserSupport(support);
    }
  }, []);

  // Search handler - moved up to avoid dependency issues
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // Use authenticatedFetch for logged-in users, regular fetch for public
      const fetchFn = user ? authenticatedFetch : fetch;
      const response = await fetchFn('/api/voice-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          context: user ? {
            currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
            userPermissions: {
              subscriptionStatus: user.subscriptionStatus,
              subscriptionTier: user.subscriptionTier,
              emailVerified: user.emailVerified,
              phoneVerified: user.phoneVerified,
              groups: user.groups?.map(g => ({
                groupId: g.groupId,
                role: g.role,
              })) || [],
              agencies: user.agencies?.map(a => ({
                agencyId: a.agencyId,
                role: a.role,
                assignedElderIds: a.assignedElderIds,
              })) || [],
            },
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const searchResult = await response.json();
      setResult(searchResult);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to process search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

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
        setIsListening(false);

        // Provide specific error messages
        switch (event.error) {
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
            break;
          case 'no-speech':
            setError('No speech detected. Please speak clearly and try again.');
            break;
          case 'audio-capture':
            setError('No microphone found. Please check your microphone connection.');
            break;
          case 'network':
            // The Web Speech API requires connection to Google's servers (for Chrome)
            // This error can occur due to: firewall, VPN, corporate network, or temporary outage
            setError('Voice recognition service is temporarily unavailable. This can happen due to network restrictions or service issues. Please use text search instead, or try again later.');
            break;
          case 'aborted':
            // User cancelled - don't show error
            break;
          case 'service-not-allowed':
            // Edge browser specific error
            setError('Voice input is not available. Please try Chrome or Safari, or use text search.');
            break;
          default:
            setError(`Voice recognition error: ${event.error}. Please try typing instead.`);
        }
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
  }, [handleSearch]);

  const startListening = useCallback(() => {
    // Check browser support first
    if (!browserSupport?.isSupported) {
      setError(browserSupport?.recommendation || 'Voice input is not supported in your browser. Please try Chrome, Safari, or Edge.');
      return;
    }

    if (!recognitionRef.current) {
      setError('Voice recognition not available. Please try typing instead.');
      return;
    }

    // Check GDPR consent and permission
    if (permissionStatus !== 'granted') {
      if (consentStatus === 'denied' || permissionStatus === 'denied') {
        setError('Microphone access denied. Please use text search or change your browser settings.');
        return;
      }
      // Set pending flag and request permission (will show GDPR consent dialog)
      setPendingVoiceStart(true);
      requestPermission();
      return;
    }

    setError(null);
    setResult(null);
    setTranscript('');
    setIsListening(true);

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      if (err.message?.includes('already started')) {
        setError('Recording already in progress. Please wait.');
      } else {
        setError('Failed to start voice recognition. Please try again.');
      }
      setIsListening(false);
    }
  }, [browserSupport, permissionStatus, consentStatus, requestPermission]);

  // Auto-start listening when permission is granted after consent
  useEffect(() => {
    if (pendingVoiceStart && permissionStatus === 'granted' && consentStatus === 'consented') {
      setPendingVoiceStart(false);
      // Small delay to ensure dialog has closed
      const timer = setTimeout(() => {
        if (!isListening && !isSearching) {
          startListening();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingVoiceStart, permissionStatus, consentStatus, isListening, isSearching, startListening]);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
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

  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Voice is not supported - show warning
  const voiceNotSupported = browserSupport && !browserSupport.isSupported;

  return (
    <>
      {/* Floating Voice Search Button - Mobile optimized */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-14 sm:w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105 active:scale-95"
        aria-label="Open voice search"
        title="Voice Search (Cmd/Ctrl + K)"
      >
        <Search className="h-6 w-6" />
      </Button>

      {/* Voice Search Modal - Mobile-first responsive */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-2xl sm:m-4">
            <CardContent className="pt-4 pb-6 sm:pt-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Search
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Ask a question or search for features
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close"
                  className="h-10 w-10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Browser Support Warning */}
              {voiceNotSupported && (
                <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="ml-2 text-sm text-amber-800 dark:text-amber-200">
                    {browserSupport.recommendation || 'Voice input is not supported in your browser. Please use text search.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Voice Input Section - Mobile optimized */}
              <div className="mb-4 sm:mb-6">
                {/* Text input with search button */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
                    placeholder="Type your question..."
                    className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-base"
                    autoFocus
                  />
                  <Button
                    onClick={handleTextSearch}
                    disabled={!transcript.trim() || isSearching}
                    size="lg"
                    className="h-12 w-12 rounded-xl flex-shrink-0"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>

                {/* Voice button - prominent on mobile */}
                {!voiceNotSupported && (
                  <Button
                    onClick={handleVoiceButtonClick}
                    variant={isListening ? 'destructive' : 'outline'}
                    size="lg"
                    className="w-full h-12 rounded-xl"
                    disabled={permissionStatus === 'checking'}
                  >
                    {permissionStatus === 'checking' ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Checking permissions...
                      </>
                    ) : isListening ? (
                      <>
                        <MicOff className="h-5 w-5 mr-2" />
                        Stop Listening
                        <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse" />
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5 mr-2" />
                        Tap to speak
                      </>
                    )}
                  </Button>
                )}

                {isListening && (
                  <p className="mt-3 text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
                <Alert className="mb-4 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="ml-2 text-sm text-red-800 dark:text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Search Results */}
              {result && !isSearching && (
                <div className="space-y-4">
                  {/* Answer */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
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
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
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
                            className="rounded-full"
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
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <p className="text-sm font-medium mb-3">
                    Try asking questions like:
                  </p>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => setTranscript('How much does the family plan cost?')}
                      className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      &quot;How much does the family plan cost?&quot;
                    </button>
                    <button
                      onClick={() => setTranscript('What features are included?')}
                      className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      &quot;What features are included?&quot;
                    </button>
                    <button
                      onClick={() => setTranscript('How do I add a medication?')}
                      className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      &quot;How do I add a medication?&quot;
                    </button>
                    {user && (
                      <button
                        onClick={() => setTranscript('Show me my medications')}
                        className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        &quot;Show me my medications&quot;
                      </button>
                    )}
                  </div>
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

      {/* GDPR-compliant microphone permission dialog */}
      <MicrophonePermissionDialog
        open={showConsentDialog}
        onAllow={handleConsent}
        onDeny={handleDeny}
      />
    </>
  );
}
