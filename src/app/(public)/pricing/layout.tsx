import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for myguide.health. Choose from Family, Single Agency, or Multi Agency plans. All plans include a 45-day free trial.',
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
