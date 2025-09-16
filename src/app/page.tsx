import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Home page that redirects to Beehive landing
 * Since Beehive is now the main entry point for the platform
 * Using server-side redirect for better performance
 */
export default function HomePage() {
  redirect(ROUTES.BEEHIVE);
}