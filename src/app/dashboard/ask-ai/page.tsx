'use client';

/**
 * ASK AI PAGE - REDIRECTS TO /dashboard/insights (Jan 27, 2026)
 *
 * This page has been consolidated into the Insights page.
 * All users are redirected to /dashboard/insights which now contains:
 * - Health Trends tab (weekly summaries, compliance charts, AI insights)
 * - Clinical Notes tab (doctor visit preparation)
 * - Reports tab (medication adherence, nutrition analysis)
 *
 * The Health Chat is accessible via:
 * - Icon in the header/IconRail (desktop)
 * - Direct link at /dashboard/health-chat
 *
 * HISTORY:
 * - Jan 26, 2026: Hidden for agency owners only
 * - Jan 27, 2026: Consolidated into /dashboard/insights for all users
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function AskAIRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Map old tab names to new ones if needed
    const oldTab = searchParams.get('tab');
    let newTab = 'trends';

    if (oldTab === 'clinical-notes') {
      newTab = 'clinical-notes';
    } else if (oldTab === 'reports') {
      newTab = 'reports';
    }

    router.replace(`/dashboard/insights?tab=${newTab}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">Redirecting to Insights...</span>
    </div>
  );
}

export default function AskAIPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AskAIRedirect />
    </Suspense>
  );
}
