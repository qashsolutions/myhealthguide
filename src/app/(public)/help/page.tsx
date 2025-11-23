'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MiniSearch from 'minisearch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Mic,
  MicOff,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  ArrowRight,
  X,
} from 'lucide-react';
import { helpArticles, HelpArticle, HelpCategory } from '@/lib/help/articles';
import { UserRole } from '@/types';

// Icon mapping for dynamic icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mic,
  Sparkles,
  Shield,
  Users,
  TrendingUp,
  // Add more as needed
};

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);

  // Initialize MiniSearch
  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<HelpArticle>({
      fields: ['title', 'description', 'tags', 'value', 'path'], // Fields to index
      storeFields: ['id', 'title', 'description', 'value', 'path', 'route', 'roles', 'category', 'featured', 'icon'], // Fields to return
      searchOptions: {
        boost: { title: 2, tags: 1.5 }, // Boost title and tags in search
        fuzzy: 0.2, // Allow fuzzy matching
        prefix: true, // Allow prefix matching
      },
    });

    ms.addAll(helpArticles);
    return ms;
  }, []);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show featured articles when no search query
      setSearchResults(helpArticles.filter((article) => article.featured));
      return;
    }

    const results = miniSearch.search(searchQuery);
    const articles = results.map((result) => {
      const article = helpArticles.find((a) => a.id === result.id);
      return article!;
    });

    setSearchResults(articles);
  }, [searchQuery, miniSearch]);

  // Filter by category and role
  const filteredResults = useMemo(() => {
    let results = searchResults;

    if (selectedCategory !== 'all') {
      results = results.filter((article) => article.category === selectedCategory);
    }

    if (selectedRole !== 'all') {
      results = results.filter((article) => article.roles.includes(selectedRole));
    }

    return results;
  }, [searchResults, selectedCategory, selectedRole]);

  // Voice search
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Category labels
  const categories: { value: HelpCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'voice', label: 'Voice' },
    { value: 'ai', label: 'AI Features' },
    { value: 'tracking', label: 'Tracking' },
    { value: 'safety', label: 'Safety' },
    { value: 'notifications', label: 'Notifications' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'agency', label: 'Agency' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'security', label: 'Security' },
    { value: 'data', label: 'Data' },
  ];

  const roles: { value: UserRole | 'all'; label: string }[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'caregiver', label: 'Caregiver' },
    { value: 'caregiver_admin', label: 'Caregiver Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">
            Help Center
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Search for features, learn how to use them, and find what you need
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for a feature... (e.g., 'medication', 'clinical notes', 'drug interactions')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-24 py-6 text-lg border-2 border-gray-300 dark:border-gray-700 focus:border-blue-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="h-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant={isListening ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleVoiceSearch}
                  className={`h-10 ${isListening ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span className="ml-2">{isListening ? 'Listening...' : 'Voice'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mt-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === cat.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="text-center mb-6 text-gray-600 dark:text-gray-400">
            Found <strong>{filteredResults.length}</strong> result
            {filteredResults.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
          </div>
        )}

        {/* No Results */}
        {searchQuery && filteredResults.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try different keywords or browse all features
            </p>
            <Button onClick={() => setSearchQuery('')} variant="outline">
              Clear Search
            </Button>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((article) => (
            <Card
              key={article.id}
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => router.push(article.route)}
            >
              <CardContent className="pt-6">
                {/* Icon & Category Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                    {article.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {article.description}
                </p>

                {/* Value Proposition */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {article.value}
                  </span>
                </div>

                {/* Navigation Path */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Access:</p>
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {article.path}
                  </p>
                </div>

                {/* Roles */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Available to:</p>
                  <div className="flex flex-wrap gap-1">
                    {article.roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 capitalize"
                      >
                        {role.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button
                  variant="ghost"
                  className="w-full justify-between group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                >
                  <span>Try it now</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Popular Topics Hint */}
        {!searchQuery && (
          <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-500">
            <p>💡 Tip: Try searching for "medication", "clinical notes", "AI", or "agency"</p>
          </div>
        )}
      </div>
    </div>
  );
}
