'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MiniSearch from 'minisearch';
import { Search, Mic, MicOff, X, Loader2, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRole } from '@/lib/utils/getUserRole';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { MicrophonePermissionDialog } from '@/components/voice/MicrophonePermissionDialog';
import { checkVoiceInputSupport } from '@/lib/voice/browserSupport';
import { helpArticles, HelpArticle } from '@/lib/help/articles';
import type { VoiceSearchResult } from '@/lib/ai/voiceSearch';

/**
 * UnifiedSearch Component
 *
 * A responsive search component that combines text and voice input
 * - Header icon on desktop that expands inline
 * - Full-screen overlay on mobile
 * - GDPR-compliant voice input with consent
 * - Role-based content filtering
 * - Keyboard shortcut: Cmd/Ctrl+K
 */
export function UnifiedSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState<{ isSupported: boolean; browserName: string; recommendation?: string; hasKnownIssues?: boolean } | null>(null);
  const [pendingVoiceStart, setPendingVoiceStart] = useState(false);
  const [searchMode, setSearchMode] = useState<'local' | 'ai'>('local'); // Toggle between local MiniSearch and AI search
  const [aiResult, setAiResult] = useState<VoiceSearchResult | null>(null);

  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get user's effective role
  const userRole = useMemo(() => getUserRole(user), [user]);

  // GDPR-compliant microphone permission management
  const {
    permissionStatus,
    consentStatus,
    showConsentDialog,
    requestPermission,
    handleConsent,
    handleDeny
  } = useMicrophonePermission();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileOverlay(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = checkVoiceInputSupport();
      setBrowserSupport(support);
    }
  }, []);

  // Initialize MiniSearch for local feature search
  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<HelpArticle>({
      fields: ['title', 'description', 'tags', 'value', 'path'],
      storeFields: ['id', 'title', 'description', 'value', 'path', 'route', 'roles', 'category', 'featured', 'icon'],
      searchOptions: {
        boost: { title: 2, tags: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });

    ms.addAll(helpArticles);
    return ms;
  }, []);

  // Local search results
  const localResults = useMemo(() => {
    if (!query.trim() || searchMode !== 'local') return [];

    const results = miniSearch.search(query);
    const articles = results.map((result) => {
      const article = helpArticles.find((a) => a.id === result.id);
      return article!;
    }).filter(Boolean);

    // Auto-filter by user role
    if (userRole) {
      return articles.filter((article) => article.roles.includes(userRole));
    }

    return articles;
  }, [query, miniSearch, userRole, searchMode]);

  // AI search handler
  const handleAiSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchMode('ai');

    try {
      const response = await fetch('/api/voice-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          userId: user?.id || 'public',
          context: {
            currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
            userPermissions: user ? {
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
            } : undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const searchResult = await response.json();
      setAiResult(searchResult);
    } catch (err) {
      console.error('AI search error:', err);
      setError('Failed to process AI search. Showing local results instead.');
      setSearchMode('local');
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
        setQuery(transcriptText);

        // If final result, trigger AI search
        if (event.results[current].isFinal) {
          handleAiSearch(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);

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
            setError('Network error occurred. Please check your internet connection.');
            break;
          case 'aborted':
            break;
          case 'service-not-allowed':
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
  }, [handleAiSearch]);

  // Start voice recognition
  const startListening = useCallback(() => {
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
      setPendingVoiceStart(true);
      requestPermission();
      return;
    }

    setError(null);
    setAiResult(null);
    setQuery('');
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

  // Handle text input changes
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSearchMode('local'); // Default to local search for typing
    setAiResult(null);
  };

  // Handle Enter key for AI search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      handleAiSearch(query);
    }
  };

  // Handle feature selection
  const handleSelectFeature = (route: string) => {
    router.push(route);
    handleClose();
  };

  // Open search
  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Close search
  const handleClose = () => {
    stopListening();
    setIsOpen(false);
    setQuery('');
    setAiResult(null);
    setError(null);
    setSearchMode('local');
  };

  // Keyboard shortcut (Cmd/Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close (desktop only)
  useEffect(() => {
    if (!isMobileOverlay) {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node) &&
          searchButtonRef.current &&
          !searchButtonRef.current.contains(e.target as Node)
        ) {
          handleClose();
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }
  }, [isOpen, isMobileOverlay]);

  const voiceNotSupported = browserSupport && !browserSupport.isSupported;
  const topResults = localResults.slice(0, 5);

  // Mobile Full-Screen Overlay
  if (isMobileOverlay && isOpen) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold">Search</h2>
            </div>

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Type or speak your question..."
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 pr-10 h-12 text-base"
                  autoFocus
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setQuery('');
                      setAiResult(null);
                      setSearchMode('local');
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Voice Button */}
              {!voiceNotSupported && (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  variant={isListening ? 'destructive' : 'outline'}
                  size="lg"
                  className="w-full mt-3 h-12"
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
                <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 text-center">
                  Listening... Speak now
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3">
                <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="ml-2 text-sm text-red-800 dark:text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Browser Warning */}
            {voiceNotSupported && (
              <div className="px-4 py-3">
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="ml-2 text-sm text-amber-800 dark:text-amber-200">
                    {browserSupport?.recommendation || 'Voice input is not supported in your browser. Please use text search.'}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Searching...
                  </span>
                </div>
              ) : aiResult ? (
                // AI Results
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {aiResult.answer}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      AI Response • Confidence: {aiResult.confidence}
                    </p>
                  </div>

                  {aiResult.suggestedActions && aiResult.suggestedActions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Quick Actions:
                      </p>
                      {aiResult.suggestedActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            if (action.url) {
                              router.push(action.url);
                              handleClose();
                            }
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : query.trim() && topResults.length > 0 ? (
                // Local Results
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Found {localResults.length} feature{localResults.length !== 1 ? 's' : ''}
                  </p>
                  {topResults.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleSelectFeature(article.route)}
                      className="w-full p-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {article.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Sparkles className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-700 dark:text-green-300">
                          {article.value}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                // No Results
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No results found for "{query}"
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => handleAiSearch(query)}
                  >
                    Try AI Search
                  </Button>
                </div>
              ) : (
                // Empty State
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="font-medium mb-4">Try searching for:</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setQuery('medications')}
                      className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      "medications"
                    </button>
                    <button
                      onClick={() => setQuery('how to add elder')}
                      className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      "how to add elder"
                    </button>
                    <button
                      onClick={() => setQuery('pricing')}
                      className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      "pricing"
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GDPR Consent Dialog */}
        <MicrophonePermissionDialog
          open={showConsentDialog}
          onAllow={handleConsent}
          onDeny={handleDeny}
        />
      </>
    );
  }

  // Desktop Inline Expansion
  return (
    <>
      {/* Search Button */}
      <Button
        ref={searchButtonRef}
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className={cn(
          "relative h-9 w-9",
          isOpen && "invisible" // Hide when expanded
        )}
        title="Search (⌘K)"
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Expanded Search Box */}
      {isOpen && (
        <div
          ref={containerRef}
          className="absolute top-2 left-0 right-0 mx-auto w-full max-w-2xl z-50"
        >
          <Card className="shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search features or ask a question... (⌘K)"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="border-0 focus:ring-0 px-0 h-8"
                  autoFocus
                />
                {!voiceNotSupported && (
                  <Button
                    variant={isListening ? "destructive" : "ghost"}
                    size="icon"
                    onClick={isListening ? stopListening : startListening}
                    className="h-8 w-8"
                    disabled={permissionStatus === 'checking'}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isListening && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 ml-7">
                  Listening... Speak now
                </p>
              )}

              {/* Error */}
              {error && (
                <Alert className="mt-3 py-2">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs ml-1">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading */}
              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Searching...
                  </span>
                </div>
              )}

              {/* Results Dropdown */}
              {!isSearching && (query.trim() || aiResult) && (
                <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 max-h-96 overflow-y-auto">
                  {aiResult ? (
                    // AI Results
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {aiResult.answer}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          AI Response
                        </p>
                      </div>
                      {aiResult.suggestedActions && (
                        <div className="flex flex-wrap gap-2">
                          {aiResult.suggestedActions.map((action, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (action.url) {
                                  router.push(action.url);
                                  handleClose();
                                }
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : topResults.length > 0 ? (
                    // Local Results
                    <div className="space-y-1">
                      {topResults.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleSelectFeature(article.route)}
                          className="w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {article.title}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {article.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                      {localResults.length > 5 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-2 pt-2">
                          Showing {topResults.length} of {localResults.length} results
                        </p>
                      )}
                    </div>
                  ) : (
                    // No Results
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No results found
                      </p>
                      {query.trim() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleAiSearch(query)}
                        >
                          Try AI Search
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* GDPR Consent Dialog */}
      <MicrophonePermissionDialog
        open={showConsentDialog}
        onAllow={handleConsent}
        onDeny={handleDeny}
      />
    </>
  );
}