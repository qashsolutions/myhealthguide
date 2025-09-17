'use client';

import { BeehiveAuthProvider } from '@/contexts/BeehiveAuthContext';

export default function BeehiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BeehiveAuthProvider>
      {children}
    </BeehiveAuthProvider>
  );
}