'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { OnlineStatusProvider } from '@/contexts/OnlineStatusContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <OnlineStatusProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </OnlineStatusProvider>
    </AuthProvider>
  );
}
