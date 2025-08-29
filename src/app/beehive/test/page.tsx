'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/firebase';

export default function TestConnectionsPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testSupabase = async () => {
    setLoading(true);
    const testResults: any = {};
    
    try {
      // Call API route for server-side testing
      const response = await fetch('/api/beehive/test-connection');
      const apiResults = await response.json();
      
      // Format Supabase results
      if (apiResults.supabase.connection) {
        testResults.supabaseConnection = apiResults.supabase.connection.includes('Connected') 
          ? `✅ ${apiResults.supabase.connection}`
          : `❌ ${apiResults.supabase.connection}`;
      }
      
      if (apiResults.supabase.scenarioCount !== undefined) {
        testResults.scenarioCount = apiResults.supabase.scenarioCount === 0
          ? '⚠️ No scenarios found - Run SQL migrations'
          : `✅ Found ${apiResults.supabase.scenarioCount} scenarios`;
      }
      
      // Add environment check results
      testResults.apiKeys = apiResults.environment.claudeApi && apiResults.environment.geminiApi
        ? '✅ AI APIs configured'
        : '❌ AI APIs not configured on server';
      
    } catch (err: any) {
      testResults.supabaseConnection = `❌ API Error: ${err.message}`;
    }
    
    // Test Firebase (client-side)
    testResults.firebaseAuth = auth 
      ? '✅ Firebase initialized'
      : '❌ Firebase not initialized';
    
    testResults.currentUser = auth.currentUser
      ? `✅ Logged in as: ${auth.currentUser.email || auth.currentUser.phoneNumber}`
      : '⚠️ No user logged in';
    
    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-elder-lg shadow-elder p-8 border border-elder-border">
          <h1 className="text-elder-2xl font-bold text-elder-text mb-6">
            Beehive Connection Test
          </h1>
          
          <button
            onClick={testSupabase}
            disabled={loading}
            className="mb-6 py-3 px-6 bg-primary-600 text-white text-elder-base font-medium rounded-elder hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test All Connections'}
          </button>
          
          {Object.keys(results).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-elder-lg font-semibold mb-3">Test Results:</h2>
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 rounded-elder">
                  <span className="font-medium">{key}:</span> {value as string}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-8 p-4 bg-blue-50 rounded-elder">
            <h3 className="text-elder-base font-semibold text-blue-900 mb-2">
              Environment Status:
            </h3>
            <ul className="text-elder-sm text-blue-800 space-y-1">
              <li>• Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}</li>
              <li>• Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}</li>
              <li>• Firebase API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Not set'}</li>
              <li>• Claude API: {process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}</li>
              <li>• Gemini API: {process.env.GOOGLE_AI_API_KEY ? '✅ Set' : '❌ Not set'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}