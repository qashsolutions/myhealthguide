'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Dynamically import Firebase and router to avoid SSR issues
const DynamicVerifyContent = dynamic(
  () => import('@/components/beehive/VerifyEmailContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }
);

export default function VerifyEmailPage() {
  return <DynamicVerifyContent />;
}