'use client';

import { useEffect, useState } from 'react';

export default function DebugFirebase() {
  const [config, setConfig] = useState<any>(null);
  
  useEffect(() => {
    // Firebase client config has been removed
    // This page now shows the deprecation status
    setConfig({
      status: 'deprecated',
      message: 'Client-side Firebase has been removed',
      authMethod: 'Server-side sessions via cookies',
      apiEndpoints: [
        '/api/auth/login',
        '/api/auth/logout', 
        '/api/auth/signup',
        '/api/auth/session',
      ],
      environmentVariables: {
        removed: [
          'NEXT_PUBLIC_FIREBASE_API_KEY',
          'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
          'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
          'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
          'NEXT_PUBLIC_FIREBASE_APP_ID',
        ],
        serverOnly: [
          'FIREBASE_SERVER_API_KEY',
          'FIREBASE_ADMIN_PROJECT_ID',
          'FIREBASE_ADMIN_CLIENT_EMAIL',
          'FIREBASE_ADMIN_PRIVATE_KEY',
        ],
      },
    });
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Debug</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(config, null, 2)}
      </pre>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Environment Check</h2>
        <p>Build Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}