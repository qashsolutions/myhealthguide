'use client';

import { useAuth } from '@/contexts/AuthContext';

export function AgencyGreeting() {
  const { user } = useAuth();

  const firstName = user?.firstName || '';
  const agencyName = user?.agencies?.[0]
    ? (user.agencies[0] as any).agencyName || ''
    : '';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Hi {firstName}
      </h1>
      {agencyName && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {agencyName}
        </p>
      )}
    </div>
  );
}
