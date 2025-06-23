import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Email link action handler page
 * This page is deprecated - we now use token-based email verification
 * Redirects to the verification page
 */
export default function AuthActionPage() {
  // Redirect to the email verification page
  redirect(`${ROUTES.AUTH}/verify-email`);
}