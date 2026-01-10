'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  Users,
  Calendar,
  ClipboardList,
  Clock,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export default function AgencyPage() {
  const features = [
    {
      icon: Users,
      title: 'Multi-Client Management',
      description: 'Manage multiple clients and caregivers from a single dashboard',
    },
    {
      icon: Calendar,
      title: 'Scheduling & Shifts',
      description: 'Coordinate caregiver schedules, shifts, and availability',
    },
    {
      icon: ClipboardList,
      title: 'Care Documentation',
      description: 'Professional clinical notes and care documentation tools',
    },
    {
      icon: Clock,
      title: 'Timesheet Management',
      description: 'Track caregiver hours and generate accurate timesheets',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Comprehensive reporting for compliance and quality assurance',
    },
    {
      icon: Shield,
      title: 'HIPAA Compliance',
      description: 'Enterprise-grade security and compliance features',
    },
  ];

  const benefits = [
    'Unlimited caregivers per agency',
    'Up to 3 clients per caregiver',
    'Client-specific caregiver assignments',
    'Real-time care coordination',
    'Professional documentation tools',
    'Compliance reporting',
    'Priority support',
    'Custom onboarding',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full mb-6">
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">For Care Agencies</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Scale Your Care Agency with <span className="text-purple-600">Confidence</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            MyHealthGuide provides professional care agencies with the tools to manage multiple
            clients, coordinate caregivers, and deliver exceptional care at scale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/agency/signup">
              <Button size="lg" className="text-lg px-8 py-6 bg-purple-600 hover:bg-purple-700">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                See All Features
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            30-day free trial • No credit card required • HIPAA compliant
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 lg:px-8 bg-white dark:bg-gray-800/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Built for Professional Care Agencies
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Enterprise features designed for agencies managing multiple clients and caregivers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
        <div className="mx-auto max-w-4xl">
          <Card className="border-2 border-purple-500 shadow-xl overflow-hidden">
            <div className="bg-purple-600 text-white py-4 px-6 text-center">
              <span className="text-sm font-medium uppercase tracking-wide">Agency Plan</span>
            </div>
            <CardContent className="pt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Multi-Agency Plan
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Complete solution for professional care agencies
                  </p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">$55</span>
                    <span className="text-gray-500">/client/month</span>
                  </div>
                  <Link href="/agency/signup">
                    <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700">
                      Start 30-Day Free Trial
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    No credit card required
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Everything you need:
                  </h4>
                  <ul className="space-y-3">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 lg:px-8 bg-purple-600 dark:bg-purple-700">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Agency?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join leading care agencies who trust MyHealthGuide for professional care coordination
          </p>
          <Link href="/agency/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Your Free 30-Day Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
