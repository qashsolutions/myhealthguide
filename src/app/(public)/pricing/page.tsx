'use client';

import { useState } from 'react';
import { Check, Heart, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState('Single Agency'); // Default to most popular
  const plans = [
    {
      name: 'Family',
      subtitle: 'Perfect for small families',
      price: 8.99,
      icon: Heart,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      features: [
        '1 admin + 1 member',
        'Up to 2 elders',
        '25 MB storage',
        'Voice-powered logging',
        'Medication & diet tracking',
        'AI health insights',
      ],
    },
    {
      name: 'Single Agency',
      subtitle: 'For families & caregivers',
      price: 14.99,
      icon: Users,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      popular: true,
      features: [
        '1 admin + up to 3 members',
        'Up to 4 elders',
        '50 MB storage',
        'All Basic features',
        'Real-time collaboration',
        'Weekly health reports',
      ],
    },
    {
      name: 'Multi Agency',
      subtitle: 'For professional caregivers',
      price: 144,
      icon: Shield,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      features: [
        'Up to 10 groups',
        '4 members per group (40 users)',
        'Up to 30 elders',
        '200 MB storage',
        'Agency dashboard & analytics',
        'Compliance tracking',
      ],
    },
  ];

  return (
    <div className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Choose the plan that's right for you. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.name;
            return (
              <Card
                key={plan.name}
                onClick={() => setSelectedPlan(plan.name)}
                className={`relative p-8 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-blue-500 shadow-lg'
                    : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`inline-flex p-3 rounded-full ${plan.bgColor} mb-4`}>
                  <Icon className={`h-6 w-6 ${plan.iconColor}`} />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {plan.subtitle}
                </p>

                {/* Price */}
                <div className="mt-6 mb-8">
                  <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  className={`w-full ${
                    isSelected
                      ? '!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle button click - navigate to signup or checkout
                    window.location.href = '/signup';
                  }}
                >
                  Get Started
                </Button>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Need help choosing? <a href="/contact" className="text-blue-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
