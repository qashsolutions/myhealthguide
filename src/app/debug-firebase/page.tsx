'use client';

import { useEffect, useState } from 'react';

export default function DebugFirebase() {
  const [config, setConfig] = useState<any>(null);
  
  useEffect(() => {
    // Import Firebase config to see what values it has
    import('@/lib/firebase/config').then((module) => {
      // Get the auth instance to see if it's initialized
      const auth = module.auth;
      const app = module.default;
      
      // Try to get the app config
      const appConfig = app.options || {};
      
      setConfig({
        apiKey: appConfig.apiKey,
        authDomain: appConfig.authDomain,
        projectId: appConfig.projectId,
        storageBucket: appConfig.storageBucket,
        messagingSenderId: appConfig.messagingSenderId,
        appId: appConfig.appId,
        authInitialized: !!auth,
        appInitialized: !!app,
      });
    }).catch(err => {
      setConfig({ error: err.message });
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