import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Authentication page
 * Authentication is disabled - redirect to dashboard
 */
export default function AuthPage() {
  redirect(ROUTES.DASHBOARD);
}