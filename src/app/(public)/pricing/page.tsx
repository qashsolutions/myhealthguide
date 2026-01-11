/*
  ========================================
  PRICING PAGE - Using Shared Component
  ========================================

  REFACTORED: 2024-11-22

  This page now uses the shared PricingCards component from
  src/components/pricing/PricingCards.tsx

  WHY THIS CHANGE WAS MADE:
  1. Code Duplication: The same pricing cards were duplicated in multiple files:
     - Homepage (src/app/(public)/page.tsx)
     - This dedicated pricing page

  2. Maintenance Issues: Had to update pricing in multiple places (prone to errors)
     - Example: The $144 vs $30 bug occurred because of manual updates in multiple places

  3. No Single Source of Truth: Pricing constants existed but weren't being used

  BENEFITS OF SHARED COMPONENT:
  - Uses PRICING constants from src/lib/constants/pricing.ts
  - Update once, reflects everywhere
  - Prevents inconsistencies
  - Easier to maintain

  The old duplicated code has been commented out below for reference.
*/

'use client';

import { TabbedPricingCards } from '@/components/pricing/TabbedPricingCards';

export default function PricingPage() {
  // Note: We allow logged-in users to view pricing page so they can compare plans
  // and potentially upgrade their subscription

  return (
    <div>
      {/* Page Title */}
      <div className="py-12 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Choose the plan that&apos;s right for you. All plans include a free trial.
          </p>
        </div>
      </div>

      {/* Tabbed Pricing - For Families | For Agencies */}
      <TabbedPricingCards
        showHeader={false}
        showTrialInfo={true}
      />
    </div>
  );
}

/*
  ========================================
  OLD DUPLICATED CODE (COMMENTED OUT)
  ========================================

  The code below was replaced with the shared PricingCards component.
  Keeping it here temporarily for reference, but this should be removed
  once the new component is verified to work correctly.

  DO NOT USE THIS CODE - Use the PricingCards component instead.

'use client';

import { useState } from 'react';
import { Check, Heart, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState('Single Agency');
  const plans = [
    {
      name: 'Family',
      subtitle: 'Perfect for small families',
      price: 8.99,
      ... (150+ lines of duplicated pricing cards code)
    },
  ];

  return (
    <div className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900">
      ... (more duplicated code)
    </div>
  );
}
*/
