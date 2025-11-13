import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart,
  Mic,
  Brain,
  Bell,
  Users,
  Shield,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Intelligent Caregiving Made Simple
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Voice-powered medication tracking, AI-driven insights, and real-time collaboration
              for families and caregiving agencies.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/features">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Cancel anytime • US-based support
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400">
              Powerful Features
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to provide better care
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
            <dl className="grid max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1: Voice Input */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Voice-Powered Logging
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Simply say "John took Lisinopril at 9am" and we'll log it instantly.
                    No typing required.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2: AI Insights */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      AI-Driven Insights
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get daily summaries and pattern detection to spot missed doses and
                    improve medication compliance.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3: SMS Alerts */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Bell className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Smart Notifications
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Receive SMS alerts for missed doses. Customizable frequency and content
                    to fit your needs.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4: Multi-User */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Real-Time Collaboration
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Multiple family members or caregivers can work together seamlessly
                    with instant updates.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 5: Agency Dashboard */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Agency Management
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage up to 10 client groups with analytics, compliance tracking,
                    and priority alerts.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 6: Security */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="rounded-lg bg-blue-600 p-3">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      HIPAA-Aware Security
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Enterprise-grade security with encrypted data, secure authentication,
                    and audit logs.
                  </p>
                </CardContent>
              </Card>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to transform your caregiving?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Start your 7-day free trial today. No credit card required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
