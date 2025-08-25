import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Email link action handler page
 * Authentication is disabled - redirect to dashboard
 */
export default function AuthActionPage() {
  redirect(ROUTES.DASHBOARD);
}