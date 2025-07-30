'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Star, Search, MapPin, Phone, Award } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  type: 'hospital' | 'nursing-home' | 'home-health';
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  rating: number;
  qualityScore: number;
  distance?: string;
  specialties?: string[];
  ownership: string;
  bedCount?: number;
}

export default function ProviderSearchPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerType, setProviderType] = useState<string>('all');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const providerTypes = [
    { value: 'all', label: 'All Providers' },
    { value: 'hospital', label: 'Hospitals' },
    { value: 'nursing-home', label: 'Nursing Homes' },
    { value: 'home-health', label: 'Home Health Agencies' },
  ];

  // Mock data for demonstration
  const mockProviders: Provider[] = [
    {
      id: '1',
      name: 'St. Mary\'s Medical Center',
      type: 'hospital',
      address: '100 Hospital Drive',
      city: 'Anytown',
      state: 'ST',
      zip: '12345',
      phone: '(555) 111-2222',
      rating: 4.5,
      qualityScore: 87,
      distance: '5.2 miles',
      specialties: ['Emergency Services', 'Cardiac Care', 'Orthopedics'],
      ownership: 'Non-profit',
      bedCount: 350
    },
    {
      id: '2',
      name: 'Sunset View Nursing Home',
      type: 'nursing-home',
      address: '200 Elder Care Lane',
      city: 'Anytown',
      state: 'ST',
      zip: '12345',
      phone: '(555) 333-4444',
      rating: 4.0,
      qualityScore: 82,
      distance: '3.8 miles',
      ownership: 'For-profit',
      bedCount: 120
    },
    {
      id: '3',
      name: 'Comfort Care Home Health',
      type: 'home-health',
      address: '300 Wellness Way',
      city: 'Anytown',
      state: 'ST',
      zip: '12345',
      phone: '(555) 555-6666',
      rating: 4.8,
      qualityScore: 91,
      distance: '2.1 miles',
      specialties: ['Physical Therapy', 'Skilled Nursing', 'Wound Care'],
      ownership: 'Non-profit'
    }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      alert('Please enter a location (ZIP code or city)');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call to CMS Provider Data
    setTimeout(() => {
      const filteredProviders = providerType === 'all'
        ? mockProviders
        : mockProviders.filter(p => p.type === providerType);
      
      setProviders(filteredProviders);
      setIsSearching(false);
    }, 1000);
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'hospital': return '🏥';
      case 'nursing-home': return '🏡';
      case 'home-health': return '🏠';
      default: return '🏥';
    }
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-700 bg-green-100' };
    if (score >= 80) return { text: 'Good', color: 'text-blue-700 bg-blue-100' };
    if (score >= 70) return { text: 'Average', color: 'text-yellow-700 bg-yellow-100' };
    return { text: 'Below Average', color: 'text-red-700 bg-red-100' };
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
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
          Find Quality Healthcare Providers
        </h1>
        <p className="text-base text-gray-500">
          Search Medicare-certified hospitals, nursing homes, and home health agencies with quality ratings
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <form onSubmit={handleSearch}>
          <div className="mb-4">
            <label htmlFor="location" className="block text-lg font-medium text-gray-700 mb-2">
              Location (ZIP code or city)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter ZIP code or city name"
                className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search location"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Search className="w-5 h-5 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Provider Type Filter */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Provider Type
            </label>
            <div className="flex flex-wrap gap-2">
              {providerTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setProviderType(type.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    providerType === type.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">Searching for providers near {searchQuery}...</p>
        </div>
      ) : hasSearched && providers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600">No providers found</p>
          <p className="text-base text-gray-500 mt-2">Try a different location or provider type</p>
        </div>
      ) : providers.length > 0 ? (
        <div className="space-y-6">
          <p className="text-lg text-gray-700 font-medium">
            Found {providers.length} providers near {searchQuery}
          </p>
          
          {providers.map((provider) => {
            const qualityLabel = getQualityLabel(provider.qualityScore);
            
            return (
              <div
                key={provider.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-3xl mr-3">{getProviderIcon(provider.type)}</span>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900">
                          {provider.name}
                        </h3>
                        <p className="text-gray-600">
                          {provider.address}, {provider.city}, {provider.state} {provider.zip}
                        </p>
                        {provider.distance && (
                          <p className="text-sm text-blue-600 mt-1">
                            <MapPin className="inline w-4 h-4 mr-1" />
                            {provider.distance} away
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ratings and Quality */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Patient Rating</p>
                    <div className="flex items-center">
                      {renderStars(provider.rating)}
                      <span className="ml-2 text-lg font-medium">{provider.rating}/5</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Quality Score</p>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-gray-900 mr-3">
                        {provider.qualityScore}%
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${qualityLabel.color}`}>
                        {qualityLabel.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Ownership</p>
                    <p className="font-medium">{provider.ownership}</p>
                  </div>
                  {provider.bedCount && (
                    <div>
                      <p className="text-sm text-gray-600">Beds</p>
                      <p className="font-medium">{provider.bedCount}</p>
                    </div>
                  )}
                  <div>
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      {provider.phone}
                    </a>
                  </div>
                </div>

                {/* Specialties */}
                {provider.specialties && provider.specialties.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Specialties & Services</p>
                    <div className="flex flex-wrap gap-2">
                      {provider.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Information Note */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          Quality ratings and provider information from Medicare.gov Compare datasets
        </p>
      </div>
    </div>
  );
}