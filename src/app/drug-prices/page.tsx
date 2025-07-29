'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';

/**
 * Drug price search page using Cost Plus Drugs API
 * No authentication required
 */
function DrugPricesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState('30');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load from URL params if coming from dashboard
  useEffect(() => {
    const search = searchParams.get('search');
    const qty = searchParams.get('quantity');
    if (search) {
      setSearchTerm(search);
      if (qty) setQuantity(qty);
      handleSearch(search, qty || '30');
    }
  }, [searchParams]);

  const handleSearch = async (term?: string, qty?: string) => {
    const searchValue = term || searchTerm;
    const quantityValue = qty || quantity;
    
    if (!searchValue.trim()) {
      setError('Please enter a medication name');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/prescription-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: searchValue.trim(),
          quantity: parseInt(quantityValue),
        }),
      });

      const data = await response.json();

      if (response.ok && data.results) {
        setResults(data.results);
        if (data.results.length === 0) {
          setError(`No results found for "${searchValue}". Try searching with:\n• Generic name (e.g., "metformin" instead of "Glucophage")\n• Different spelling or partial name\n• Including strength (e.g., "metformin 500mg")`);
        }
      } else {
        console.error('API Error:', data);
        setError(data.error || 'Unable to search prices. Please try again.');
      }
    } catch (error) {
      console.error('Price search error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <Button
        variant="secondary"
        size="small"
        icon={<ArrowLeft className="h-5 w-5" />}
        onClick={() => router.push(ROUTES.DASHBOARD)}
        className="mb-6"
      >
        Back to Dashboard
      </Button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-3">
          Drug Price Check
        </h1>
        <p className="text-elder-lg text-elder-text-secondary">
          Search prescription drug prices from Mark Cuban Cost Plus Drug Company.
        </p>
      </div>

      {/* Third-party notice */}
      <div className="mb-8 p-4 bg-primary-50 rounded-elder border-l-4 border-primary-500">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-elder-sm font-semibold text-primary-900 mb-1">
              Third-Party Service Notice
            </p>
            <p className="text-elder-sm text-primary-800">
              This pricing information is provided by Mark Cuban Cost Plus Drug Company. 
              We display this data for your convenience but have no control over the prices or availability.
            </p>
          </div>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-white rounded-elder-lg shadow-elder border border-elder-border p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="searchTerm" className="block text-elder-base font-semibold text-elder-text mb-2">
                Search for Medication Prices
              </label>
              <p className="text-elder-sm text-elder-text-secondary mb-3">
                Enter medication name (brand or generic)
              </p>
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Example: Lipitor or Atorvastatin"
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder 
                         focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                disabled={isSearching}
              />
            </div>

            <div>
              <label htmlFor="quantity" className="block text-elder-base font-semibold text-elder-text mb-2">
                Quantity (number of pills)
              </label>
              <select
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder 
                         focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                disabled={isSearching}
              >
                <option value="30">30 pills</option>
                <option value="60">60 pills</option>
                <option value="90">90 pills</option>
              </select>
            </div>

            {error && (
              <div className="p-4 bg-health-danger-bg border-2 border-health-danger rounded-elder">
                <p className="text-elder-base text-health-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="large"
              icon={<Search className="h-5 w-5" />}
              loading={isSearching}
              disabled={isSearching || !searchTerm.trim()}
              fullWidth
            >
              {isSearching ? 'Searching...' : 'Search Prices'}
            </Button>
          </div>
        </div>
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h2 className="text-elder-xl font-semibold mb-4">
            Search Results
          </h2>
          <div className="space-y-4">
            {results.map((medication, index) => (
              <div
                key={index}
                className="bg-white rounded-elder-lg shadow-sm border border-elder-border p-6"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-elder-lg font-semibold text-elder-text mb-2">
                      {medication.medication_name}
                    </h3>
                    <div className="space-y-1 text-elder-base text-elder-text-secondary">
                      <p><strong>Strength:</strong> {medication.strength}</p>
                      <p><strong>Form:</strong> {medication.form}</p>
                      {medication.manufacturer && (
                        <p><strong>Manufacturer:</strong> {medication.manufacturer}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-elder-2xl font-bold text-health-safe">
                      ${medication.price.toFixed(2)}
                    </div>
                    <p className="text-elder-sm text-elder-text-secondary">
                      for {quantity} {medication.form.toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Additional price breakdown */}
                {medication.price_per_unit && (
                  <div className="mt-4 pt-4 border-t border-elder-border">
                    <p className="text-elder-sm text-elder-text-secondary">
                      Price per {medication.form.toLowerCase()}: ${medication.price_per_unit.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-elder-background-alt rounded-elder">
            <p className="text-elder-sm text-elder-text-secondary">
              <strong>Note:</strong> Prices shown are from Mark Cuban Cost Plus Drug Company and may not reflect 
              prices at your local pharmacy. Always compare prices and check with your insurance provider.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DrugPricesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <p className="text-elder-base text-elder-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <DrugPricesContent />
    </Suspense>
  );
}