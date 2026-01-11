'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  Shield,
  Bell,
  Calendar,
  Users,
  Pill,
  ChefHat,
  Activity,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export default function FamilyPage() {
  const features = [
    {
      icon: Pill,
      title: 'Medication Tracking',
      description: 'Never miss a dose with smart reminders and schedule management',
    },
    {
      icon: ChefHat,
      title: 'Nutrition Monitoring',
      description: 'Track meals, dietary restrictions, and nutritional needs',
    },
    {
      icon: Activity,
      title: 'Health Insights',
      description: 'AI-powered analysis of health patterns and trends',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Get alerts for medications, appointments, and important updates',
    },
    {
      icon: Shield,
      title: 'Safety Alerts',
      description: 'Drug interaction warnings and health risk monitoring',
    },
    {
      icon: Users,
      title: 'Family Collaboration',
      description: 'Keep everyone in the loop with shared access and updates',
    },
  ];

  const plans = [
    {
      name: 'Personal Plan',
      price: '$8.99',
      period: '/month',
      description: 'Perfect for individual caregivers',
      features: [
        '1 loved one profile',
        'Medication tracking',
        'Supplement tracking',
        'Diet & nutrition logging',
        'Smart notifications',
        'AI health assistant',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Family Plan',
      price: '$18.99',
      period: '/month',
      description: 'Best for families sharing care responsibilities',
      features: [
        '1 loved one profile',
        'Up to 3 family members',
        'All Personal features',
        'Family member access',
        'Shared notifications',
        'Care coordination tools',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full mb-6">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">For Family Caregivers</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Care for Your Loved Ones, <span className="text-blue-600">Simplified</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            MyHealthGuide helps family caregivers manage medications, track health, and coordinate care
            with confidence and peace of mind.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/family/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Learn More
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            45-day free trial • No credit card required • HIPAA compliant
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 lg:px-8 bg-white dark:bg-gray-800/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Care with Confidence
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Simple, intuitive tools designed for real caregivers by real caregivers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Choose the plan that fits your family&apos;s needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-xl' : 'border shadow-lg'}`}
              >
                <CardContent className="pt-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/family/signup">
                    <Button
                      className="w-full"
                      size="lg"
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 lg:px-8 bg-blue-600 dark:bg-blue-700">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Simplify Caregiving?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of families who trust MyHealthGuide for their care needs
          </p>
          <Link href="/family/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Your Free 45-Day Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
