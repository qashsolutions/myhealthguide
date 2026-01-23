'use client';

import { useState, useEffect } from 'react';
import { Users, Heart, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface QuickStats {
  caregiverCount: number;
  elderCount: number;
  pendingSlots: number;
}

export function AgencyQuickStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuickStats>({ caregiverCount: 0, elderCount: 0, pendingSlots: 0 });
  const [loading, setLoading] = useState(true);

  const agencyId = user?.agencies?.[0]?.agencyId;

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch caregiver assignments count
        const assignQ = query(
          collection(db, 'caregiver_assignments'),
          where('agencyId', '==', agencyId),
          where('status', '==', 'active')
        );
        const assignSnap = await getDocs(assignQ);
        const caregiverCount = assignSnap.size;

        // Count unique elders across all assignments
        const elderIds = new Set<string>();
        assignSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.elderIds && Array.isArray(data.elderIds)) {
            data.elderIds.forEach((id: string) => elderIds.add(id));
          }
        });

        // Fetch pending scheduled shifts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pendingQ = query(
          collection(db, 'scheduledShifts'),
          where('agencyId', '==', agencyId),
          where('status', '==', 'scheduled')
        );
        const pendingSnap = await getDocs(pendingQ);

        setStats({
          caregiverCount,
          elderCount: elderIds.size,
          pendingSlots: pendingSnap.size,
        });
      } catch (error) {
        console.error('[AgencyQuickStats] Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [agencyId]);

  const statCards = [
    { label: 'Caregivers', value: stats.caregiverCount, icon: Users, color: 'blue' },
    { label: 'Loved Ones', value: stats.elderCount, icon: Heart, color: 'rose' },
    { label: 'Pending', value: stats.pendingSlots, icon: Clock, color: 'amber' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-3 relative">
            <Icon className={`w-4 h-4 absolute top-2 right-2 text-${stat.color}-400 dark:text-${stat.color}-500 opacity-60`} />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : stat.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {stat.label}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
