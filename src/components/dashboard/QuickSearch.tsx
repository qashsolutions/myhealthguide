'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MiniSearch from 'minisearch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, Sparkles, X } from 'lucide-react';
import { helpArticles, HelpArticle } from '@/lib/help/articles';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRole } from '@/lib/utils/getUserRole';
import { cn } from '@/lib/utils';

/**
 * QuickSearch Component
 *
 * Dashboard search widget for fast feature discovery
 * - Always filtered to user's role (no manual filter)
 * - Text-only search (no voice)
 * - Instant navigation to features
 * - Keyboard shortcuts: Cmd/Ctrl+K to focus
 */
export function QuickSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user's effective role
  const userRole = useMemo(() => getUserRole(user), [user]);

  // Initialize MiniSearch
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

  // Search and filter results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const results = miniSearch.search(query);
    const articles = results.map((result) => {
      const article = helpArticles.find((a) => a.id === result.id);
      return article!;
    }).filter(Boolean);

    // Auto-filter by user role (no manual override)
    if (userRole) {
      return articles.filter((article) => article.roles.includes(userRole));
    }

    return articles;
  }, [query, miniSearch, userRole]);

  // Limit to top 5 results
  const topResults = searchResults.slice(0, 5);

  // Handle feature selection
  const handleSelectFeature = (route: string) => {
    router.push(route);
    setQuery('');
    setIsOpen(false);
  };

  // Handle keyboard shortcuts (Cmd/Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search features... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-9 text-sm bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
        >
          {topResults.length > 0 ? (
            <div className="py-2">
              {topResults.map((article) => (
                <button
                  key={article.id}
                  onClick={() => handleSelectFeature(article.route)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Sparkles className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-700 dark:text-green-300">
                          {article.value}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                        {article.path}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}

              {searchResults.length > 5 && (
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700">
                  Showing top 5 of {searchResults.length} results
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No features found for "{query}"
              </p>
              {userRole && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Searching in features available to {userRole.replace('_', ' ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
