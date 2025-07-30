'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Heart, FileText, Pill, AlertCircle } from 'lucide-react';

export default function MedicareConnectPage(): JSX.Element {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleMedicareConnect = () => {
    setIsConnecting(true);
    // In production, this would initiate OAuth flow to Medicare.gov
    // For now, we'll show the informational flow
    setTimeout(() => {
      window.open('https://www.medicare.gov/account/login', '_blank');
      setIsConnecting(false);
    }, 1000);
  };

  const dataTypes = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Claims History',
      description: 'View your Medicare Part A, B, and D claims from the past 3 years'
    },
    {
      icon: <Pill className="w-8 h-8" />,
      title: 'Prescription Records',
      description: 'Access your Part D prescription drug history and current medications'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Coverage Information',
      description: 'See your current Medicare coverage and benefits details'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Preventive Services',
      description: 'Track which preventive services you\'ve used and what\'s available'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/eldercare"
          className="inline-flex items-center text-lg text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Resources
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Connect Your Medicare Account
        </h1>
        <p className="text-base text-gray-500">
          Securely access your Medicare data through Blue Button 2.0
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-8">
        <div className="text-center mb-8">
          <Heart className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Medicare Blue Button 2.0
          </h2>
          <p className="text-lg text-gray-700">
            Share your Medicare claims data with trusted applications
          </p>
        </div>

        {/* What you can access */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {dataTypes.map((type, index) => (
            <div key={index} className="bg-white rounded-lg p-6">
              <div className="text-blue-600 mb-3">{type.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {type.title}
              </h3>
              <p className="text-gray-600">
                {type.description}
              </p>
            </div>
          ))}
        </div>

        {/* Connect Button */}
        <div className="text-center">
          <button
            onClick={handleMedicareConnect}
            disabled={isConnecting}
            className="px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Connect to Medicare.gov"
          >
            {isConnecting ? 'Redirecting...' : 'Connect to Medicare.gov'}
          </button>
          <p className="mt-4 text-sm text-gray-600">
            You'll be redirected to Medicare.gov to sign in securely
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          How It Works
        </h2>
        <ol className="space-y-4">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-3">
              1
            </span>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Sign In to Medicare.gov</h3>
              <p className="text-gray-600">Use your Medicare.gov username and password</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-3">
              2
            </span>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Grant Permission</h3>
              <p className="text-gray-600">Authorize MyHealth Guide to access your Medicare data</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-3">
              3
            </span>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">View Your Data</h3>
              <p className="text-gray-600">Access your claims, prescriptions, and coverage information</p>
            </div>
          </li>
        </ol>
      </div>

      {/* Privacy Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your Privacy is Protected
            </h3>
            <ul className="text-gray-700 space-y-2">
              <li>• Your data is encrypted and secure</li>
              <li>• You control what information is shared</li>
              <li>• You can revoke access at any time through Medicare.gov</li>
              <li>• We never store your Medicare login credentials</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}