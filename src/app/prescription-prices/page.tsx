'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Info, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface MedicationResult {
  brand_name: string;
  medication_name: string;
  strength: string;
  form: string;
  unit_price: string;
  requested_quote?: string;
  requested_quote_units?: string;
  url: string;
  ndc: string;
}

/**
 * Prescription drug price checker page
 * Integrates with Mark Cuban Cost Plus Drugs API
 */
export default function PrescriptionPricesPage(): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState(30);
  const [results, setResults] = useState<MedicationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setError('Please enter a medication name');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch('/api/prescription-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchTerm: searchTerm.trim(), quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to search medications');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to search medications. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: string): string => {
    // Remove $ if present and format
    const numPrice = parseFloat(price.replace('$', ''));
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
        {/* Page Title & Disclaimer */}
        <div className="mb-8">
          <h1 className="text-elder-2xl font-bold text-elder-text mb-4">
            Drug Price Check
          </h1>
          
          {/* Disclaimer Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-elder p-6 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" aria-hidden="true" />
              <div className="text-elder-base text-elder-text-secondary">
                <p className="font-semibold mb-2">Third-Party Service Notice</p>
                <p>
                  This pricing information is provided by{' '}
                  <strong>Mark Cuban Cost Plus Drug Company</strong>. We display 
                  this data for your convenience but have no control over the 
                  prices or availability. This is a free service.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-elder shadow-card p-6 mb-8">
          <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
            Search for Medication Prices
          </h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label 
                htmlFor="medication" 
                className="block text-elder-base font-medium text-elder-text mb-2"
              >
                Enter medication name (brand or generic)
              </label>
              <input 
                type="text" 
                id="medication"
                name="medication"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Example: Lipitor or Atorvastatin"
                className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:ring-4 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label 
                htmlFor="quantity" 
                className="block text-elder-base font-medium text-elder-text mb-2"
              >
                Quantity (number of pills)
              </label>
              <select
                id="quantity"
                name="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full sm:w-auto px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:ring-4 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              >
                <option value={30}>30 pills</option>
                <option value={60}>60 pills</option>
                <option value={90}>90 pills</option>
              </select>
            </div>
            
            {error && (
              <p className="text-red-600 text-elder-base" role="alert">
                {error}
              </p>
            )}
            
            <Button
              type="submit"
              variant="primary"
              size="large"
              icon={<Search className="h-5 w-5" />}
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search Prices'}
            </Button>
          </form>
        </div>

        {/* Results Section */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="text-elder-lg text-elder-text-secondary">
              Searching for medication prices...
            </div>
          </div>
        )}

        {!isLoading && hasSearched && (
          <div className="space-y-4">
            <h2 className="text-elder-lg font-semibold text-elder-text mb-4">
              {results.length > 0 ? 'Search Results' : 'No Results Found'}
            </h2>
            
            {results.length === 0 ? (
              <p className="text-elder-base text-elder-text-secondary">
                No medications found matching "{searchTerm}". Try searching with a different name.
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((medication, index) => (
                  <div 
                    key={`${medication.ndc}-${index}`}
                    className="bg-white rounded-elder shadow-card p-6 border-2 border-elder-border"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-elder-lg font-bold text-elder-text">
                          {medication.medication_name} 
                          {medication.brand_name && medication.brand_name !== medication.medication_name && (
                            <span className="font-normal"> (Generic for {medication.brand_name})</span>
                          )}
                        </h3>
                        <p className="text-elder-base text-elder-text-secondary mt-1">
                          {medication.strength} {medication.form}
                        </p>
                        
                        <div className="mt-4 space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-elder-base font-semibold text-elder-text">
                              Price per pill:
                            </span>
                            <span className="text-elder-lg font-bold text-elder-text">
                              {formatPrice(medication.unit_price)}
                            </span>
                          </div>
                          {medication.requested_quote && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-elder-base font-semibold text-elder-text">
                                Total for {medication.requested_quote_units || quantity} pills:
                              </span>
                              <span className="text-elder-xl font-bold text-green-600">
                                {formatPrice(medication.requested_quote)}
                              </span>
                            </div>
                          )}
                          <p className="text-elder-base text-elder-text-secondary">
                            Form: {medication.form}
                          </p>
                        </div>
                      </div>
                      
                      <div className="sm:text-right">
                        <a 
                          href={medication.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={clsx(
                            'inline-flex items-center gap-2 px-6 py-3',
                            'text-elder-base font-medium text-primary-600',
                            'border-2 border-primary-600 rounded-elder',
                            'hover:bg-primary-50 focus:outline-none',
                            'focus-visible:ring-4 focus-visible:ring-primary-500'
                          )}
                        >
                          View Details
                          <ExternalLink className="h-5 w-5" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Additional Information */}
        <div className="mt-12 bg-gray-100 rounded-elder p-6">
          <h3 className="text-elder-base font-semibold text-elder-text mb-3">
            Important Information
          </h3>
          <ul className="space-y-2 text-elder-base text-elder-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-1">•</span>
              <span>Prices shown are estimates and may vary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-1">•</span>
              <span>Always consult your healthcare provider before changing medications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-1">•</span>
              <span>Generic medications contain the same active ingredients as brand names</span>
            </li>
          </ul>
        </div>
    </div>
  );
}