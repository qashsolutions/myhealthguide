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
  Stethoscope
} from 'lucide-react';

export default function FeaturesPage() {
  const [activeSection, setActiveSection] = useState('voice');
  const featureCategories = [
    {
      id: 'voice',
      title: 'Just Speak to Log',
      description: 'No typing needed — just say what happened and we\'ll record it',
      icon: Mic,
      color: 'blue',
      features: [
        {
          name: 'Log Medications by Voice',
          description: 'Say "Mom took her blood pressure pill at 9am" and it\'s saved',
          icon: Pill
        },
        {
          name: 'Log Meals by Voice',
          description: 'Say "Dad had oatmeal and coffee for breakfast" — done!',
          icon: Utensils
        },
        {
          name: 'Works on Any Device',
          description: 'Use your phone, tablet, or computer — whatever is handy',
          icon: Mic
        }
      ]
    },
    {
      id: 'ai',
      title: 'Helpful Summaries',
      description: 'See what\'s happening at a glance — no digging through records',
      icon: Brain,
      color: 'purple',
      features: [
        {
          name: 'Daily Overview',
          description: 'See a simple summary of medications taken, meals logged, and anything missed',
          icon: Sparkles
        },
        {
          name: 'Notes for Doctor Visits',
          description: 'Get a printable summary to share with your loved one\'s doctor',
          icon: FileText
        },
        {
          name: 'Ask Questions',
          description: 'Type a question like "What medications did Mom take this week?" and get answers',
          icon: MessageSquare
        },
        {
          name: 'Spot Patterns',
          description: 'Notice things like "morning doses are often missed" so you can adjust',
          icon: TrendingUp
        },
        {
          name: 'Prepare for Appointments',
          description: 'Have all the info ready before seeing the doctor',
          icon: Stethoscope
        }
      ]
    },
    {
      id: 'tracking',
      title: 'Everything in One Place',
      description: 'Medications, meals, vitamins — all organized and easy to find',
      icon: Heart,
      color: 'red',
      features: [
        {
          name: 'Medication List',
          description: 'Keep track of all pills, doses, and when to take them',
          icon: Pill
        },
        {
          name: 'Meal Tracking',
          description: 'Log what your loved one eats each day',
          icon: Utensils
        },
        {
          name: 'Vitamins & Supplements',
          description: 'Track vitamins alongside regular medications',
          icon: Apple
        },
        {
          name: 'Daily Activities',
          description: 'Note walks, exercises, or other activities',
          icon: Activity
        },
        {
          name: 'Refill Reminders',
          description: 'Get reminded when it\'s time to refill prescriptions',
          icon: Clock
        }
      ]
    },
    {
      id: 'safety',
      title: 'Safety Checks',
      description: 'Catch potential problems before they become serious',
      icon: AlertTriangle,
      color: 'orange',
      features: [
        {
          name: 'Drug Interaction Warnings',
          description: 'Get alerted if two medications shouldn\'t be taken together',
          icon: AlertTriangle
        },
        {
          name: 'Timing Conflicts',
          description: 'Know if medications need to be taken at different times',
          icon: Clock
        },
        {
          name: 'Health Change Alerts',
          description: 'Notice when eating or activity patterns change unexpectedly',
          icon: Brain
        },
        {
          name: 'Caregiver Support',
          description: 'Reminders to take care of yourself too',
          icon: Heart
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Reminders That Work',
      description: 'Never forget a dose or appointment again',
      icon: Bell,
      color: 'green',
      features: [
        {
          name: 'Medication Reminders',
          description: 'Get a notification when it\'s time for each dose',
          icon: Bell
        },
        {
          name: 'Missed Dose Alerts',
          description: 'Know right away if a dose was missed',
          icon: AlertTriangle
        },
        {
          name: 'Daily Summary',
          description: 'See how the day went with a simple end-of-day update',
          icon: TrendingUp
        },
        {
          name: 'Works Everywhere',
          description: 'Get reminders on your phone, tablet, or computer',
          icon: Bell
        }
      ]
    },
    {
      id: 'collaboration',
      title: 'Share with Family',
      description: 'Keep everyone in the loop — siblings, spouse, or hired help',
      icon: Users,
      color: 'indigo',
      features: [
        {
          name: 'Invite Family Members',
          description: 'Add up to 4 people to help with caregiving',
          icon: Users
        },
        {
          name: 'Control Who Sees What',
          description: 'Decide what each person can view or change',
          icon: UserCheck
        },
        {
          name: 'Easy Invites',
          description: 'Send a simple link to invite someone',
          icon: Shield
        },
        {
          name: 'See Who Did What',
          description: 'Know who logged medications or made changes',
          icon: FileText
        },
        {
          name: 'Approve New Members',
          description: 'You control who joins your care team',
          icon: UserCheck
        }
      ]
    },
    {
      id: 'agency',
      title: 'For Professional Caregivers',
      description: 'Home care agencies can manage multiple clients easily',
      icon: Building2,
      color: 'teal',
      features: [
        {
          name: 'Manage Multiple Clients',
          description: 'See all your clients from one dashboard',
          icon: Building2
        },
        {
          name: 'Assign Caregivers',
          description: 'Match the right caregiver to each client',
          icon: Users
        },
        {
          name: 'Track Performance',
          description: 'See how well medications are being given on time',
          icon: TrendingUp
        },
        {
          name: 'Staff Access Levels',
          description: 'Give managers and caregivers different permissions',
          icon: Shield
        }
      ]
    },
    {
      id: 'analytics',
      title: 'See the Big Picture',
      description: 'Understand trends and spot changes over time',
      icon: TrendingUp,
      color: 'pink',
      features: [
        {
          name: 'Medication Tracking',
          description: 'See how well medications are being taken each week',
          icon: TrendingUp
        },
        {
          name: 'Eating Patterns',
          description: 'Notice if eating habits are changing',
          icon: Apple
        },
        {
          name: 'Weekly Updates',
          description: 'Compare this week to last week at a glance',
          icon: TrendingUp
        },
        {
          name: 'Family Updates',
          description: 'Send reports to family members who live far away',
          icon: FileText
        },
        {
          name: 'Change Alerts',
          description: 'Get notified when something seems different',
          icon: AlertTriangle
        }
      ]
    },
    {
      id: 'security',
      title: 'Your Information is Safe',
      description: 'We protect your loved one\'s health information',
      icon: Shield,
      color: 'gray',
      features: [
        {
          name: 'Private & Secure',
          description: 'Health information is encrypted and protected',
          icon: FileText
        },
        {
          name: 'HIPAA Standards',
          description: 'We follow the same rules as hospitals and doctors',
          icon: Database
        },
        {
          name: 'Safe Sharing',
          description: 'Invite links expire and can only be used once',
          icon: Shield
        },
        {
          name: 'You\'re in Control',
          description: 'Choose what features to use and what data to share',
          icon: UserCheck
        }
      ]
    },
    {
      id: 'data',
      title: 'Your Data, Your Choice',
      description: 'Download or delete your information anytime',
      icon: Download,
      color: 'blue',
      features: [
        {
          name: 'Download Everything',
          description: 'Get a copy of all your data whenever you want',
          icon: Download
        },
        {
          name: 'Print Reports',
          description: 'Create PDF reports to take to doctor appointments',
          icon: FileText
        },
        {
          name: 'Take It With You',
          description: 'Your data belongs to you — export it anytime',
          icon: Shield
        },
        {
          name: 'Delete Anytime',
          description: 'Close your account and we\'ll delete everything',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Simple Badge */}
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <Heart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Built for Family Caregivers
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Keep Track of Your Loved One's Health — Simply
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Log medications, meals, and daily activities. Get reminders. Share updates with family. All in one easy-to-use app.
            </p>

            {/* Key Highlights - Simple Language */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Speak to Log</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Never Miss a Dose</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Share with Family</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Navigation - Two Rows */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 py-4">
            {featureCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isActive = activeSection === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => scrollToSection(category.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <CategoryIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-center leading-tight">{category.title}</span>
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
    </div>
  );
}
