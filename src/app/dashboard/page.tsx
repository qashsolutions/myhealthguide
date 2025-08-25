'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Beaker, HelpCircle, DollarSign } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

/**
 * Public dashboard page with glassmorphic feature cards
 * No authentication required
 */
export default function DashboardPage() {
  const router = useRouter();

  const features = [
    {
      id: 'medication-check',
      title: 'Check Medications',
      description: 'Verify drug interactions and get detailed information about your medications.',
      icon: Beaker,
      route: ROUTES.MEDICATION_CHECK,
      color: 'text-primary-600',
    },
    {
      id: 'health-qa',
      title: 'Health Questions',
      description: 'Get answers to your health questions from trusted medical sources and experts.',
      icon: HelpCircle,
      route: ROUTES.HEALTH_QA,
      color: 'text-primary-600',
    },
    {
      id: 'drug-prices',
      title: 'Drug Price Check',
      description: 'Compare prescription drug prices across different pharmacies to find the best deals.',
      icon: DollarSign,
      route: ROUTES.DRUG_PRICES,
      color: 'text-primary-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 elder-desktop:grid-cols-2 gap-8">
        {/* Left side - Drug Price Check form */}
        <div className="order-2 elder-desktop:order-1">
          <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
            <h1 className="text-elder-2xl font-bold text-elder-text mb-6">
              Drug Price Check
            </h1>

            {/* Third-party service notice */}
            <div className="mb-6 p-4 bg-primary-50 rounded-elder border-l-4 border-primary-500">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-elder-sm font-semibold text-primary-900 mb-1">
                    Third-Party Service Notice
                  </p>
                  <p className="text-elder-sm text-primary-800">
                    This pricing information is provided by <strong>Mark Cuban Cost Plus Drug Company</strong>. 
                    We display this data for your convenience but have no control over the prices or availability. 
                    This is a free service.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const searchTerm = formData.get('searchTerm');
              const quantity = formData.get('quantity');
              router.push(`${ROUTES.DRUG_PRICES}?search=${searchTerm}&quantity=${quantity}`);
            }}>
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
                    name="searchTerm"
                    placeholder="Example: Lipitor or Atorvastatin"
                    required
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="quantity" className="block text-elder-base font-semibold text-elder-text mb-2">
                    Quantity (number of pills)
                  </label>
                  <select
                    id="quantity"
                    name="quantity"
                    defaultValue="30"
                    className="w-full px-4 py-3 text-elder-base border-2 border-elder-border rounded-elder focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="30">30 pills</option>
                    <option value="60">60 pills</option>
                    <option value="90">90 pills</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors focus:outline-none focus:ring-4 focus:ring-primary-500/30"
                >
                  Search Prices
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right side - Feature cards */}
        <div className="order-1 elder-desktop:order-2 space-y-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => router.push(feature.route)}
                className="w-full p-6 glassmorphic rounded-elder-lg transition-all hover:scale-[1.02] hover:shadow-lg text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/80 rounded-elder flex items-center justify-center">
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-elder-lg font-semibold text-elder-text mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-elder-base text-elder-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}