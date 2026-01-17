'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <span className="text-2xl font-bold">
            <span className="text-gray-900">MyHealth</span>
            <span className="text-blue-600">Guide</span>
          </span>
        </Link>

        {/* Error Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to access it.
        </p>

        {/* Countdown */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">
            Redirecting to dashboard in{' '}
            <span className="font-bold text-blue-900">{countdown}</span>{' '}
            {countdown === 1 ? 'second' : 'seconds'}...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
        </div>

        {/* Help Link */}
        <p className="mt-8 text-sm text-gray-500">
          Need help?{' '}
          <Link href="/help" className="text-blue-600 hover:underline">
            Visit our Help Center
          </Link>
        </p>
      </div>
    </div>
  );
}
