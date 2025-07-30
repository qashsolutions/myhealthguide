'use client';

import { EldercareResourceCards } from '@/components/eldercare/EldercareResourceCards';

export default function EldercarePage(): JSX.Element {
  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
        Healthcare.gov resources
      </h1>
      <p className="text-base text-gray-500 text-center mb-8 max-w-3xl mx-auto">
        Access Medicare data, find local services, browse health guides, and locate quality care providers - all in one place.
      </p>
      
      <EldercareResourceCards />
    </div>
  );
}