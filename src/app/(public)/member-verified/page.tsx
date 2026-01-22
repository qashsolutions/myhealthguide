'use client';

import { CheckCircle, Mail, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Member Verified Page
 *
 * Simple public page shown to family members after they verify their email.
 * Members don't need to log in - they just receive daily health reports via email.
 */
export default function MemberVerifiedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            You&apos;re All Set!
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your email has been verified and you&apos;ve been added to your family&apos;s care group.
          </p>

          {/* What to Expect */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Daily Health Reports
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You&apos;ll receive a daily email summary with your loved one&apos;s health updates,
                  including medications, meals, and activities.
                </p>
              </div>
            </div>
          </div>

          {/* No Login Needed Message */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <Heart className="w-4 h-4 text-red-400" />
            <span>No login needed - reports come straight to your inbox</span>
          </div>

          {/* CTA */}
          <Link href="/">
            <Button variant="outline" className="w-full">
              Return to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
