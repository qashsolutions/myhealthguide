'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mic,
  Brain,
  Pill,
  Apple,
  Utensils,
  Activity,
  Bell,
  Users,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileText,
  Sparkles,
  Heart,
  Database,
  MessageSquare,
  Download,
  UserCheck,
  Building2,
  Stethoscope,
  ChevronRight
} from 'lucide-react';

export default function FeaturesPage() {
  const [activeSection, setActiveSection] = useState('voice');
  const featureCategories = [
    {
      id: 'voice',
      title: 'Voice-Powered Caregiving',
      description: 'Log medications, meals, and activities hands-free using natural language',
      icon: Mic,
      color: 'blue',
      features: [
        {
          name: 'Voice Medication Logging',
          description: 'Say "John took Lisinopril 10mg at 9am" and it\'s instantly logged',
          icon: Pill
        },
        {
          name: 'Voice Diet Tracking',
          description: 'Record meals naturally: "Mary ate oatmeal with blueberries for breakfast"',
          icon: Utensils
        },
        {
          name: 'Web Speech API Integration',
          description: 'Browser-based speech recognition with fallback to Google Cloud Speech-to-Text',
          icon: Mic
        }
      ]
    },
    {
      id: 'ai',
      title: 'AI-Driven Intelligence',
      description: 'Advanced AI powered by Google Gemini and MedGemma for clinical-grade insights',
      icon: Brain,
      color: 'purple',
      features: [
        {
          name: 'Daily Health Summaries',
          description: 'AI analyzes medication compliance, diet patterns, and health changes every day',
          icon: Sparkles
        },
        {
          name: 'Clinical Note Generation',
          description: 'MedGemma creates comprehensive clinical notes for doctor visits',
          icon: FileText
        },
        {
          name: 'Health Chat Assistant',
          description: 'Ask questions about care, medications, and health in natural language',
          icon: MessageSquare
        },
        {
          name: 'Pattern Detection',
          description: 'AI identifies missed doses, health changes, and concerning trends',
          icon: TrendingUp
        },
        {
          name: 'Doctor Visit Preparation',
          description: 'Automated visit summaries with key questions and concerns',
          icon: Stethoscope
        }
      ]
    },
    {
      id: 'tracking',
      title: 'Comprehensive Health Tracking',
      description: 'Track medications, diet, supplements, and activities in one place',
      icon: Heart,
      color: 'red',
      features: [
        {
          name: 'Medication Management',
          description: 'Track doses, schedules, refills, and compliance with ease',
          icon: Pill
        },
        {
          name: 'Diet & Nutrition',
          description: 'Log meals with AI-powered nutritional analysis and concerns',
          icon: Utensils
        },
        {
          name: 'Supplement Tracking',
          description: 'Monitor vitamins and supplements alongside medications',
          icon: Apple
        },
        {
          name: 'Activity Logging',
          description: 'Record daily activities, exercise, and mobility',
          icon: Activity
        },
        {
          name: 'Refill Predictions',
          description: 'AI predicts when medications need refilling based on usage patterns',
          icon: Clock
        }
      ]
    },
    {
      id: 'safety',
      title: 'Medical Safety Features',
      description: 'FDA-integrated drug checking and clinical screening tools',
      icon: AlertTriangle,
      color: 'orange',
      features: [
        {
          name: 'Drug Interaction Detection',
          description: 'Real-time FDA drug label checking for interactions between medications',
          icon: AlertTriangle
        },
        {
          name: 'Schedule Conflict Detection',
          description: 'Identifies timing conflicts between multiple medications',
          icon: Clock
        },
        {
          name: 'Dementia Screening',
          description: 'Pattern-based screening flags behavioral changes for professional assessment',
          icon: Brain
        },
        {
          name: 'Caregiver Burnout Detection',
          description: 'AI monitors caregiver activity patterns and alerts for burnout risk',
          icon: Heart
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Smart Notifications',
      description: 'Push notifications to keep everyone informed and on schedule',
      icon: Bell,
      color: 'green',
      features: [
        {
          name: 'Medication Reminders',
          description: 'Push notifications for upcoming doses across all devices',
          icon: Bell
        },
        {
          name: 'Missed Dose Alerts',
          description: 'Automatic alerts when medications are missed',
          icon: AlertTriangle
        },
        {
          name: 'Daily Compliance Updates',
          description: 'Summary notifications showing daily adherence progress',
          icon: TrendingUp
        },
        {
          name: 'Multi-Device Support',
          description: 'Firebase Cloud Messaging syncs across web, mobile, and tablet',
          icon: Bell
        }
      ]
    },
    {
      id: 'collaboration',
      title: 'Real-Time Collaboration',
      description: 'Multiple family members and caregivers coordinating seamlessly',
      icon: Users,
      color: 'indigo',
      features: [
        {
          name: 'Family Groups',
          description: 'Up to 4 members per group with role-based permissions',
          icon: Users
        },
        {
          name: 'Granular Permissions',
          description: 'Control who can view, edit, or manage each type of data',
          icon: UserCheck
        },
        {
          name: 'Secure Invite System',
          description: 'Encrypted invite codes with expiration and usage limits',
          icon: Shield
        },
        {
          name: 'Activity History',
          description: 'Complete audit trail of who did what and when',
          icon: FileText
        },
        {
          name: 'Member Approval Workflow',
          description: 'Admin approval required for new members joining groups',
          icon: UserCheck
        }
      ]
    },
    {
      id: 'agency',
      title: 'Agency Management',
      description: 'Professional caregiving agencies managing multiple client groups',
      icon: Building2,
      color: 'teal',
      features: [
        {
          name: 'Multi-Tenant Support',
          description: 'Agencies manage multiple caregiver groups from one dashboard',
          icon: Building2
        },
        {
          name: 'Caregiver Assignment',
          description: 'Assign specific caregivers to specific elders with access control',
          icon: Users
        },
        {
          name: 'Agency Analytics',
          description: 'Aggregate compliance, alerts, and performance metrics',
          icon: TrendingUp
        },
        {
          name: 'Role-Based Access',
          description: 'Super admin, caregiver admin, and caregiver roles with different permissions',
          icon: Shield
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Health Analytics',
      description: 'Insights and trends to improve care quality over time',
      icon: TrendingUp,
      color: 'pink',
      features: [
        {
          name: 'Medication Adherence Tracking',
          description: 'Compliance predictions and pattern analysis',
          icon: TrendingUp
        },
        {
          name: 'Nutrition Analysis',
          description: 'Dietary pattern analysis with nutritional recommendations',
          icon: Apple
        },
        {
          name: 'Weekly Trends Dashboard',
          description: 'Week-over-week health metric comparisons',
          icon: TrendingUp
        },
        {
          name: 'Family Update Reports',
          description: 'Automated summaries for family members',
          icon: FileText
        },
        {
          name: 'Health Change Detection',
          description: 'AI alerts for significant changes in health patterns',
          icon: AlertTriangle
        }
      ]
    },
    {
      id: 'security',
      title: 'HIPAA-Aware Security',
      description: 'Enterprise-grade security and privacy protection',
      icon: Shield,
      color: 'gray',
      features: [
        {
          name: 'PHI Audit Logging',
          description: 'Complete audit trail of all PHI access with WHO, WHAT, WHEN, WHERE',
          icon: FileText
        },
        {
          name: 'Third-Party Disclosure Tracking',
          description: '6-year accounting of disclosures for HIPAA compliance',
          icon: Database
        },
        {
          name: 'Encrypted Invite Codes',
          description: 'End-to-end encryption for group invitation system',
          icon: Shield
        },
        {
          name: 'IP Address Hashing',
          description: 'SHA-256 hashed IP addresses, never stored in plain text',
          icon: Shield
        },
        {
          name: 'Medical Consent Management',
          description: 'Granular consent tracking for AI features and data usage',
          icon: UserCheck
        }
      ]
    },
    {
      id: 'data',
      title: 'Data Ownership',
      description: 'Your data, your control, with easy export and deletion',
      icon: Download,
      color: 'blue',
      features: [
        {
          name: 'Complete Data Export',
          description: 'Download all data in JSON/CSV formats for portability',
          icon: Download
        },
        {
          name: 'PDF Export',
          description: 'Generate PDF reports for medications, diet, and health summaries',
          icon: FileText
        },
        {
          name: 'GDPR Compliance',
          description: 'Right to portability and right to erasure fully supported',
          icon: Shield
        },
        {
          name: 'Account Deletion',
          description: 'Complete data deletion within 48 hours of account closure',
          icon: AlertTriangle
        }
      ]
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // Account for sticky nav height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-120px 0px -50% 0px' }
    );

    featureCategories.forEach((category) => {
      const element = document.getElementById(category.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Everything You Need for Better Caregiving
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              HealthGuide combines voice-powered logging, AI-driven insights, and real-time collaboration
              to help families and agencies provide the best possible care for their elders.
            </p>
          </div>
        </div>
      </section>

      {/* Sticky Navigation */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {featureCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isActive = activeSection === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => scrollToSection(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <CategoryIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{category.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Categories */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="space-y-12">
            {featureCategories.map((category, categoryIndex) => {
              const CategoryIcon = category.icon;
              const colorClasses = {
                blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
                teal: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
                pink: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
                gray: 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
              };

              return (
                <Card
                  key={categoryIndex}
                  id={category.id}
                  className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-8 scroll-mt-32"
                >
                  <div className="space-y-8">
                    {/* Category Header */}
                    <div className="flex items-start gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                      <div className={`inline-flex p-4 rounded-2xl ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                        <CategoryIcon className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                          {category.title}
                        </h2>
                        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                          {category.description}
                        </p>
                      </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {category.features.map((feature, featureIndex) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <Card key={featureIndex} className="border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md">
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                                  <FeatureIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {feature.name}
                                  </h3>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {feature.description}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 dark:bg-blue-900 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your caregiving?
            </h2>
            <p className="mt-6 text-lg leading-8 text-blue-100">
              Start your 14-day free trial today. No credit card required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="/signup"
                className="rounded-md bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
              >
                Start Free Trial
                <ChevronRight className="w-5 h-5" />
              </a>
              <a
                href="/pricing"
                className="text-base font-semibold leading-7 text-white hover:text-blue-100 transition-colors"
              >
                View Pricing <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
