import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Home page that redirects to dashboard
 * Since all features are now public, we go directly to the dashboard
 * Using server-side redirect for better performance
 */
export default function HomePage() {
  redirect(ROUTES.DASHBOARD);
}