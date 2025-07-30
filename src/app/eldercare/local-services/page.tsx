'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Search, Phone, Globe, Clock, Users } from 'lucide-react';

interface LocalService {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  website?: string;
  hours?: string;
  services: string[];
  distance?: string;
}

export default function LocalServicesPage(): JSX.Element {
  const [zipCode, setZipCode] = useState('');
  const [services, setServices] = useState<LocalService[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState('all');

  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: 'aging', label: 'Area Agency on Aging' },
    { value: 'senior-center', label: 'Senior Centers' },
    { value: 'meals', label: 'Meal Programs' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'caregiver', label: 'Caregiver Support' },
    { value: 'health', label: 'Health Services' },
  ];

  // Mock data for demonstration
  const mockServices: LocalService[] = [
    {
      id: '1',
      name: 'Central County Area Agency on Aging',
      type: 'aging',
      address: '123 Main Street, Anytown, ST 12345',
      phone: '(555) 123-4567',
      website: 'www.centralcountyaaa.org',
      hours: 'Mon-Fri 8:00 AM - 5:00 PM',
      services: ['Information & Referral', 'Care Coordination', 'Benefits Counseling', 'Caregiver Support'],
      distance: '2.5 miles'
    },
    {
      id: '2',
      name: 'Sunshine Senior Center',
      type: 'senior-center',
      address: '456 Oak Avenue, Anytown, ST 12345',
      phone: '(555) 234-5678',
      website: 'www.sunshineseniorcenter.org',
      hours: 'Mon-Fri 9:00 AM - 3:00 PM',
      services: ['Social Activities', 'Exercise Classes', 'Educational Programs', 'Lunch Program'],
      distance: '3.1 miles'
    },
    {
      id: '3',
      name: 'Meals on Wheels - Anytown',
      type: 'meals',
      address: '789 Elm Street, Anytown, ST 12345',
      phone: '(555) 345-6789',
      hours: 'Mon-Fri 7:00 AM - 2:00 PM',
      services: ['Home-Delivered Meals', 'Nutrition Education', 'Wellness Checks'],
      distance: '4.2 miles'
    }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipCode.trim() || zipCode.length !== 5) {
      alert('Please enter a valid 5-digit ZIP code');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call
    setTimeout(() => {
      // In production, this would call the Eldercare Locator API
      // For now, we'll use mock data
      const filteredServices = selectedServiceType === 'all'
        ? mockServices
        : mockServices.filter(service => service.type === selectedServiceType);
      
      setServices(filteredServices);
      setIsSearching(false);
    }, 1000);
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'aging': return <Users className="w-6 h-6" />;
      case 'senior-center': return <Users className="w-6 h-6" />;
      case 'meals': return <Clock className="w-6 h-6" />;
      case 'transportation': return <MapPin className="w-6 h-6" />;
      default: return <MapPin className="w-6 h-6" />;
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
          Find Local Eldercare Services
        </h1>
        <p className="text-base text-gray-500">
          Search for senior centers, meal programs, transportation, and support services near you
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <form onSubmit={handleSearch}>
          <div className="mb-4">
            <label htmlFor="zipCode" className="block text-lg font-medium text-gray-700 mb-2">
              Enter Your ZIP Code
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="12345"
                className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="ZIP code"
                maxLength={5}
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

          {/* Service Type Filter */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Service Type
            </label>
            <div className="flex flex-wrap gap-2">
              {serviceTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedServiceType(type.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedServiceType === type.value
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
          <p className="mt-4 text-lg text-gray-600">Searching for services near {zipCode}...</p>
        </div>
      ) : hasSearched && services.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600">No services found in your area</p>
          <p className="text-base text-gray-500 mt-2">Try a different ZIP code or service type</p>
        </div>
      ) : services.length > 0 ? (
        <div className="space-y-6">
          <p className="text-lg text-gray-700 font-medium">
            Found {services.length} services near {zipCode}
          </p>
          
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  <div className="text-blue-600 mr-4 mt-1">
                    {getServiceIcon(service.type)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-1">
                      {service.name}
                    </h3>
                    <p className="text-gray-600">{service.address}</p>
                    {service.distance && (
                      <p className="text-sm text-blue-600 mt-1">{service.distance} away</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Services Offered */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Services Offered:</h4>
                <div className="flex flex-wrap gap-2">
                  {service.services.map((svc, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <a
                  href={`tel:${service.phone}`}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {service.phone}
                </a>
                
                {service.website && (
                  <a
                    href={`https://${service.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    Visit Website
                  </a>
                )}
                
                {service.hours && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 mr-2" />
                    {service.hours}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Information Note */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          Service information provided by the Eldercare Locator, a public service of the U.S. Administration on Aging
        </p>
      </div>
    </div>
  );
}