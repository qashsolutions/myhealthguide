import React from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, MapPin, BookOpen, Building2 } from 'lucide-react';

interface ResourceCard {
  id: string;
  icon: React.ReactNode;
  headline: string;
  summary: string;
  description: string;
  moreLink: string;
  moreText: string;
  bgColor: string;
  iconColor: string;
}

const resourceCards: ResourceCard[] = [
  {
    id: 'medicare-data',
    icon: <Heart className="w-8 h-8" />,
    headline: 'Your Medicare Data',
    summary: 'Access prescriptions, claims, and coverage information instantly',
    description: 'Connect to Medicare Blue Button to view your Part D medications, recent claims, and coverage details. Share data with caregivers and doctors for better coordinated care.',
    moreLink: '/eldercare/medicare-connect',
    moreText: 'Connect Medicare Account',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    id: 'local-help',
    icon: <MapPin className="w-8 h-8" />,
    headline: 'Nearby Services',
    summary: 'Locate eldercare resources and support in your area',
    description: 'Search for local Area Agencies on Aging, senior centers, meal programs, transportation services, and caregiver support groups. Filter by zip code and service type.',
    moreLink: '/eldercare/local-services',
    moreText: 'Search Services',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600'
  },
  {
    id: 'health-guides',
    icon: <BookOpen className="w-8 h-8" />,
    headline: 'Health Guides',
    summary: 'Educational articles about Medicare and preventive care',
    description: 'Browse helpful guides on Medicare enrollment, preventive services, managing chronic conditions, and understanding your benefits. Updated content from Healthcare.gov.',
    moreLink: '/eldercare/health-guides',
    moreText: 'Browse Articles',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600'
  },
  {
    id: 'care-providers',
    icon: <Building2 className="w-8 h-8" />,
    headline: 'Quality Providers',
    summary: 'Compare hospitals, nursing homes, and home health',
    description: 'Research Medicare-certified providers with quality ratings, patient reviews, and safety scores. Find hospitals, nursing homes, and home health agencies near you.',
    moreLink: '/eldercare/provider-search',
    moreText: 'Compare Providers',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600'
  }
];

export function EldercareResourceCards(): JSX.Element {
  return (
    <div className="w-full px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resourceCards.map((card) => (
            <div
              key={card.id}
              className={`${card.bgColor} rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-200`}
            >
              {/* Icon */}
              <div className={`${card.iconColor} mb-4`}>
                {card.icon}
              </div>
              
              {/* Headline */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {card.headline}
              </h3>
              
              {/* Summary */}
              <p className="text-lg text-gray-700 mb-3 font-medium">
                {card.summary}
              </p>
              
              {/* Description */}
              <p className="text-base text-gray-600 mb-4 leading-relaxed">
                {card.description}
              </p>
              
              {/* More Link */}
              {card.id === 'medicare-data' ? (
                <Link
                  href={card.moreLink}
                  className="inline-flex items-center text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200 group"
                  aria-label={`${card.moreText} - ${card.headline}`}
                >
                  {card.moreText}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              ) : (
                <div className="inline-flex items-center text-lg font-semibold text-gray-400 cursor-not-allowed">
                  <span>{card.moreText}</span>
                  <span className="ml-2 text-sm font-normal">(Coming Soon)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}