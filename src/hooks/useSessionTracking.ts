'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { updateSessionContext } from '@/lib/session/sessionManager';

/**
 * Hook to automatically track session context (page, elder, action)
 * for cross-device session continuity
 */
export function useSessionTracking() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { selectedElder } = useElder();
  const lastTrackedRef = useRef<string>('');

  // Track page changes
  useEffect(() => {
    if (!user?.id) return;

    // Debounce to avoid excessive writes
    const trackingKey = `${pathname}-${selectedElder?.id || ''}`;
    if (trackingKey === lastTrackedRef.current) return;
    lastTrackedRef.current = trackingKey;

    // Don't track auth pages or non-dashboard pages
    if (!pathname.startsWith('/dashboard')) return;

    // Update session context
    updateSessionContext({
      page: pathname,
      elderId: selectedElder?.id,
      elderName: selectedElder?.name,
      action: getActionFromPath(pathname)
    });
  }, [pathname, user?.id, selectedElder?.id, selectedElder?.name]);
}

/**
 * Get a human-readable action from the current path
 */
function getActionFromPath(path: string): string {
  if (path.includes('/new')) return 'adding';
  if (path.includes('/edit')) return 'editing';
  if (path.includes('/daily-care')) return 'managing care';
  if (path.includes('/elder-profile')) return 'viewing profile';
  if (path.includes('/ask-ai')) return 'using AI assistant';
  if (path.includes('/safety-alerts')) return 'reviewing alerts';
  if (path.includes('/analytics')) return 'viewing analytics';
  if (path.includes('/medications')) return 'managing medications';
  if (path.includes('/supplements')) return 'managing supplements';
  if (path.includes('/diet')) return 'managing diet';
  if (path.includes('/notes')) return 'viewing notes';
  if (path.includes('/timesheet')) return 'managing timesheet';
  if (path.includes('/shift-handoff')) return 'shift handoff';
  return 'viewing';
}
