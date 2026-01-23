'use client';

import { AgencyGreeting } from '@/components/agency/AgencyGreeting';
import { AgencyQuickStats } from '@/components/agency/AgencyQuickStats';
import { NeedsAttentionList } from '@/components/agency/NeedsAttentionList';
import { ManageActionGrid } from '@/components/agency/ManageActionGrid';
import { TodaysShiftsList } from '@/components/agency/TodaysShiftsList';

export function AgencyOwnerDashboard() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AgencyGreeting />
      <AgencyQuickStats />
      <NeedsAttentionList />
      <ManageActionGrid />
      <TodaysShiftsList />
    </div>
  );
}
