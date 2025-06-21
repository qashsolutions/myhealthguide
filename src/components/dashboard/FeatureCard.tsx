import React from 'react';
import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';

/**
 * Feature card component for dashboard
 * Large, accessible cards with clear CTAs
 */
interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'secondary';
  isMain?: boolean;
  onClick: () => void;
}

export function FeatureCard({
  title,
  description,
  icon,
  color,
  isMain = false,
  onClick,
}: FeatureCardProps): JSX.Element {
  const colorClasses = {
    primary: {
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      icon: 'text-primary-600',
      hover: 'hover:border-primary-300 hover:shadow-primary-100',
    },
    success: {
      bg: 'bg-health-safe-bg',
      border: 'border-health-safe/30',
      icon: 'text-health-safe',
      hover: 'hover:border-health-safe/50 hover:shadow-green-100',
    },
    secondary: {
      bg: 'bg-elder-background-alt',
      border: 'border-elder-border',
      icon: 'text-elder-text-secondary',
      hover: 'hover:border-elder-border-dark hover:shadow-gray-100',
    },
  };

  const classes = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative w-full text-left transition-all duration-200',
        'bg-white rounded-elder-lg border-2 p-6',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        classes.border,
        classes.hover,
        'hover:shadow-elder-hover',
        isMain && 'elder-desktop:col-span-2 elder-desktop:p-8'
      )}
    >
      {/* Icon */}
      <div className={clsx(
        'inline-flex p-4 rounded-elder mb-4',
        classes.bg
      )}>
        <div className={classes.icon}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <h3 className={clsx(
        'font-semibold mb-2',
        isMain ? 'text-elder-xl' : 'text-elder-lg'
      )}>
        {title}
      </h3>
      
      <p className={clsx(
        'text-elder-text-secondary mb-4',
        isMain ? 'text-elder-base' : 'text-elder-sm'
      )}>
        {description}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-2 text-primary-600 font-semibold">
        <span className={isMain ? 'text-elder-base' : 'text-elder-sm'}>
          Get Started
        </span>
        <ArrowRight 
          className={clsx(
            'transition-transform group-hover:translate-x-1',
            isMain ? 'h-6 w-6' : 'h-5 w-5'
          )} 
        />
      </div>

      {/* Main feature badge */}
      {isMain && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-primary-600 text-white text-elder-sm font-semibold rounded-full">
          Recommended
        </div>
      )}
    </button>
  );
}