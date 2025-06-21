'use client';

import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';

/**
 * Client-side providers wrapper
 * Wraps the app with necessary providers like AuthProvider
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}