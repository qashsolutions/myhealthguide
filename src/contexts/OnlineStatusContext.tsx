'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useOnlineStatus, OnlineStatus } from '@/hooks/useOnlineStatus';

const OnlineStatusContext = createContext<OnlineStatus>({
  isOnline: true,
  wasOffline: false,
});

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const onlineStatus = useOnlineStatus();

  return (
    <OnlineStatusContext.Provider value={onlineStatus}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatusContext(): OnlineStatus {
  return useContext(OnlineStatusContext);
}
