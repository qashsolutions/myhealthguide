'use client';

import React, { useState } from 'react';
import { Pill, MessageCircle, Shield, CheckCircle, AlertTriangle, Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FEATURES_DESCRIPTION, HEALTH_STATUS, DISCLAIMERS } from '@/lib/constants';

/**
 * Landing page with authentication gate
 * Features eldercare-optimized design and clear CTAs
 */
export default function HomePage() {
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleFeatureClick = (feature: string) => {
    setSelectedFeature(feature);
    setShowAuthGate(true);
  };

  const features = [
    {
      id: 'medication',
      ...FEATURES_DESCRIPTION.MEDICATION_CHECK,
      icon: <Pill className="h-12 w-12" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      id: 'health-qa',
      ...FEATURES_DESCRIPTION.HEALTH_QA,
      icon: <MessageCircle className="h-12 w-12" />,
      color: 'text-health-safe',
      bgColor: 'bg-health-safe-bg',
    },
    {
      id: 'account',
      ...FEATURES_DESCRIPTION.MY_ACCOUNT,
      icon: <Shield className="h-12 w-12" />,
      color: 'text-elder-text-secondary',
      bgColor: 'bg-elder-background-alt',
    },
  ];

  const benefits = [
    {
      icon: <CheckCircle className="h-8 w-8 text-health-safe" />,
      title: 'AI-Powered Safety',
      description: 'Advanced AI checks for medication conflicts instantly',
    },
    {
      icon: <AlertTriangle className="h-8 w-8 text-health-warning" />,
      title: 'Clear Warnings',
      description: 'Simple traffic light system shows safety levels',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="py-12 elder-tablet:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-elder-3xl elder-tablet:text-5xl font-bold text-elder-text mb-6">
            Check Your Medications for Safety
          </h1>
          <p className="text-elder-lg text-elder-text-secondary mb-8 leading-elder">
            AI-powered medication conflict detection designed for seniors. 
            Get instant safety checks in clear, simple language.
          </p>
          <Button
            variant="primary"
            size="large"
            onClick={() => handleFeatureClick('medication')}
            className="shadow-elder-lg"
          >
            Check My Medications Now
          </Button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-8 border-t border-elder-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 elder-tablet:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="flex justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-elder-lg font-semibold mb-2">
                  {benefit.title}
                </h3>
                <p className="text-elder-base text-elder-text-secondary">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-elder-2xl font-bold text-center mb-12">
            How Can We Help You Today?
          </h2>
          <div className="grid grid-cols-1 elder-tablet:grid-cols-3 gap-8">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature.id)}
                className="card hover:shadow-elder-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500 focus-visible:ring-offset-2 text-left"
              >
                <div className={`${feature.bgColor} rounded-elder p-4 mb-4 inline-flex`}>
                  <div className={feature.color}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-elder-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-elder-base text-elder-text-secondary">
                  {feature.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 bg-elder-background-alt rounded-elder-lg">
        <div className="max-w-4xl mx-auto text-center px-6">
          <Shield className="h-16 w-16 text-primary-600 mx-auto mb-6" />
          <h2 className="text-elder-2xl font-bold mb-4">
            Your Health Information is Safe
          </h2>
          <p className="text-elder-lg text-elder-text-secondary">
            We use industry-standard security to protect your information. 
            No medication data is permanently stored.
          </p>
        </div>
      </section>

      {/* Auth Gate Modal */}
      <Modal
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Sign In to Continue"
        description="Create a free account to access our AI-powered health tools and keep your medication information secure."
        size="medium"
      >
        <div className="space-y-6">
          <div className="bg-primary-50 rounded-elder p-6">
            <h3 className="text-elder-lg font-semibold mb-3">
              Why create an account?
            </h3>
            <ul className="space-y-2 text-elder-base text-elder-text-secondary">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-health-safe flex-shrink-0 mt-1" />
                <span>Save your medications for future checks</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-health-safe flex-shrink-0 mt-1" />
                <span>Get personalized health insights</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <Button
              variant="primary"
              size="large"
              fullWidth
              onClick={() => {
                // Navigate to auth page for signup
                window.location.href = '/auth?mode=signup';
              }}
            >
              Create Free Account
            </Button>
            <Button
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => {
                // Navigate to auth page for login
                window.location.href = '/auth?mode=login';
              }}
            >
              I Already Have an Account
            </Button>
          </div>

          <p className="text-elder-sm text-elder-text-secondary text-center">
            By continuing, you agree to our Privacy Policy and Medical Disclaimer
          </p>
        </div>
      </Modal>
    </>
  );
}