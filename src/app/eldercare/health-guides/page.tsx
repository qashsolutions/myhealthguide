'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Search, ExternalLink } from 'lucide-react';
import { 
  fetchHealthArticles, 
  searchHealthContent,
  type HealthArticle 
} from '@/lib/eldercare/healthcare-gov-api';

export default function HealthGuidesPage(): JSX.Element {
  const [articles, setArticles] = useState<HealthArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Topics' },
    { value: 'medicare', label: 'Medicare' },
    { value: 'preventive-care', label: 'Preventive Care' },
    { value: 'prescription-drugs', label: 'Medications' },
    { value: 'caregiving', label: 'Caregiving' },
  ];

  useEffect(() => {
    loadArticles();
  }, [selectedCategory]);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const fetchedArticles = selectedCategory === 'all' 
        ? await fetchHealthArticles()
        : await fetchHealthArticles(selectedCategory);
      setArticles(fetchedArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadArticles();
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchHealthContent(searchQuery, 'articles');
      setArticles(results.articles || []);
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/eldercare"
          className="inline-flex items-center text-lg text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Resources
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Health Guides from Healthcare.gov
        </h1>
        <p className="text-base text-gray-500">
          Educational articles about Medicare, preventive care, and managing your health
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search health topics..."
              className="w-full px-4 py-3 pl-12 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search health guides"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <button
              type="submit"
              className="absolute right-2 top-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading health guides...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600">No articles found</p>
          <p className="text-base text-gray-500 mt-2">Try a different search term or category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article, index) => (
            <article
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {article.title}
              </h2>
              
              {article.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {article.categories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              
              <p className="text-gray-600 mb-4 text-base leading-relaxed">
                {article.excerpt}
              </p>
              
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                Read full article
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </article>
          ))}
        </div>
      )}

      {/* Note about source */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          Content provided by Healthcare.gov - Official U.S. Government health insurance marketplace
        </p>
      </div>
    </div>
  );
}