import React from 'react';
import { Pill, MessageCircle, User } from 'lucide-react';
import { FeatureCard } from './FeatureCard';
import { FEATURES_DESCRIPTION } from '@/lib/constants';

/**
 * Dashboard grid layout with 3 feature cards
 * Responsive design for mobile/tablet/desktop
 */
interface DashboardGridProps {
  onFeatureClick: (featureId: string) => void;
}

export function DashboardGrid({ onFeatureClick }: DashboardGridProps): JSX.Element {
  const features = [
    {
      id: 'medication-check',
      ...FEATURES_DESCRIPTION.MEDICATION_CHECK,
      icon: <Pill className="h-12 w-12" />,
      color: 'primary',
      isMain: true,
    },
    {
      id: 'health-qa',
      ...FEATURES_DESCRIPTION.HEALTH_QA,
      icon: <MessageCircle className="h-12 w-12" />,
      color: 'success',
      isMain: false,
    },
    // Disabled for now - My Account page not yet implemented
    // {
    //   id: 'account',
    //   ...FEATURES_DESCRIPTION.MY_ACCOUNT,
    //   icon: <User className="h-12 w-12" />,
    //   color: 'secondary',
    //   isMain: false,
    // },
  ] as const;

  return (
    <div className="grid grid-cols-1 elder-tablet:grid-cols-2 elder-desktop:grid-cols-3 gap-6">
      {features.map((feature) => (
        <FeatureCard
          key={feature.id}
          {...feature}
          onClick={() => onFeatureClick(feature.id)}
        />
      ))}
    </div>
  );
}