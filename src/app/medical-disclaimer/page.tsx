'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DisclaimerContent } from '@/components/legal/DisclaimerContent';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { AlertCircle, ArrowLeft, FileText } from 'lucide-react';

/**
 * Medical disclaimer page
 * Legal compliance and user acknowledgment
 */
export default function MedicalDisclaimerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [hasRead, setHasRead] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  
  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || ROUTES.DASHBOARD;

  // Handle accept disclaimer
  const handleAccept = async () => {
    setAcceptLoading(true);
    
    try {
      // Store disclaimer acceptance in session
      sessionStorage.setItem('disclaimerAccepted', 'true');
      sessionStorage.setItem('disclaimerAcceptedAt', new Date().toISOString());
      
      // If user is logged in, could also store in database
      // await api.acceptDisclaimer() 
      
      // Redirect to intended page
      router.push(redirectTo);
    } catch (error) {
      console.error('Failed to accept disclaimer:', error);
    } finally {
      setAcceptLoading(false);
    }
  };

  // Handle decline
  const handleDecline = () => {
    // Clear any partial acceptance
    sessionStorage.removeItem('disclaimerAccepted');
    sessionStorage.removeItem('disclaimerAcceptedAt');
    
    // Redirect to home or show message
    router.push('/');
  };

  // Handle scroll to track reading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage = 
      (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    
    // Consider "read" if scrolled to 90% or more
    if (scrollPercentage >= 90 && !hasRead) {
      setHasRead(true);
    }
  };

  return (
    <div className="min-h-screen bg-elder-background py-8">
      <div className="max-w-4xl mx-auto px-4 elder-tablet:px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-elder-base text-primary-600 hover:text-primary-700 mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-50 rounded-elder">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-elder-2xl elder-tablet:text-elder-3xl font-bold text-elder-text mb-2">
                Medical Disclaimer
              </h1>
              <p className="text-elder-lg text-elder-text-secondary">
                Important information about using MyHealth Guide
              </p>
            </div>
          </div>
        </div>

        {/* Alert banner */}
        <div className="bg-health-warning-bg border-2 border-health-warning rounded-elder p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-health-warning flex-shrink-0 mt-1" />
            <div>
              <p className="text-elder-base font-semibold text-elder-text mb-1">
                Please read this disclaimer carefully
              </p>
              <p className="text-elder-sm text-elder-text-secondary">
                You must read and accept this disclaimer before using our health services
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer content */}
        <div 
          className="bg-white border-2 border-elder-border rounded-elder-lg p-6 max-h-[500px] overflow-y-auto"
          onScroll={handleScroll}
        >
          <DisclaimerContent />
        </div>

        {/* Scroll indicator */}
        {!hasRead && (
          <p className="text-elder-sm text-elder-text-secondary text-center mt-4">
            Please scroll to read the entire disclaimer
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-col elder-tablet:flex-row gap-4">
          <Button
            variant="primary"
            size="large"
            onClick={handleAccept}
            disabled={!hasRead}
            loading={acceptLoading}
            className="elder-tablet:flex-1"
          >
            I Understand and Accept
          </Button>
          
          <Button
            variant="secondary"
            size="large"
            onClick={handleDecline}
            disabled={acceptLoading}
            className="elder-tablet:flex-1"
          >
            I Do Not Accept
          </Button>
        </div>

        {/* Additional information */}
        <div className="mt-12 p-6 bg-elder-background-alt rounded-elder-lg">
          <h2 className="text-elder-lg font-semibold mb-3">
            Why This Disclaimer?
          </h2>
          <p className="text-elder-base text-elder-text-secondary mb-4">
            This disclaimer helps ensure you understand the limitations of our AI-powered 
            health information service. Your safety and informed consent are our top priorities.
          </p>
          <p className="text-elder-base text-elder-text-secondary">
            By accepting, you acknowledge that MyHealth Guide provides informational support 
            only and does not replace professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
    </div>
  );
}