'use client';

import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

// Email verification is disabled - redirect to dashboard
export default function VerifyEmailRequiredPage() {
  redirect(ROUTES.DASHBOARD);
}