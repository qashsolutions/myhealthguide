'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface AttentionItem {
  id: string;
  message: string;
  type: 'warning' | 'urgent';
  href: string;
}

export function NeedsAttentionList() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const agencyId = user?.agencies?.[0]?.agencyId;

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    const fetchAttentionItems = async () => {
      try {
        const attentionItems: AttentionItem[] = [];

        // Check for pending/unconfirmed shifts (slots awaiting response)
        const pendingQ = query(
          collection(db, 'scheduledShifts'),
          where('agencyId', '==', agencyId),
          where('status', '==', 'scheduled')
        );
        const pendingSnap = await getDocs(pendingQ);
        if (pendingSnap.size > 0) {
          attentionItems.push({
            id: 'pending-slots',
            message: `${pendingSnap.size} slot${pendingSnap.size > 1 ? 's' : ''} awaiting response`,
            type: 'warning',
            href: '/dashboard/agency?tab=scheduling',
          });
        }

        // Check for elders without caregiver assignment
        const assignQ = query(
          collection(db, 'caregiver_assignments'),
          where('agencyId', '==', agencyId),
          where('status', '==', 'active')
        );
        const assignSnap = await getDocs(assignQ);
        const assignedElderIds = new Set<string>();
        assignSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.elderIds && Array.isArray(data.elderIds)) {
            data.elderIds.forEach((id: string) => assignedElderIds.add(id));
          }
        });

        // Get all agency elders (via groups)
        const groupIds = user?.agencies?.[0]?.assignedGroupIds || [];
        if (groupIds.length > 0) {
          // Check first group for unassigned elders (limitation: batch query max 30)
          const elderQ = query(
            collection(db, 'elders'),
            where('groupId', 'in', groupIds.slice(0, 10))
          );
          const elderSnap = await getDocs(elderQ);
          const unassignedCount = elderSnap.docs.filter(
            doc => !assignedElderIds.has(doc.id)
          ).length;

          if (unassignedCount > 0) {
            attentionItems.push({
              id: 'unassigned-elders',
              message: `${unassignedCount} loved one${unassignedCount > 1 ? 's' : ''} need${unassignedCount === 1 ? 's' : ''} assignment`,
              type: 'urgent',
              href: '/dashboard/agency?tab=assignments',
            });
          }
        }

        // Check for no-show shifts (past shifts with status still 'scheduled' or 'confirmed')
        const now = new Date();
        const noshowQ = query(
          collection(db, 'scheduledShifts'),
          where('agencyId', '==', agencyId),
          where('status', 'in', ['scheduled', 'confirmed'])
        );
        const noshowSnap = await getDocs(noshowQ);
        const missedShifts = noshowSnap.docs.filter(doc => {
          const data = doc.data();
          const shiftDate = data.date?.toDate?.() || new Date(data.date);
          const [hours] = (data.endTime || '17:00').split(':').map(Number);
          const shiftEnd = new Date(shiftDate);
          shiftEnd.setHours(hours, 0, 0, 0);
          return shiftEnd < now;
        });

        if (missedShifts.length > 0) {
          attentionItems.push({
            id: 'missed-shifts',
            message: `${missedShifts.length} shift${missedShifts.length > 1 ? 's' : ''} may have been missed`,
            type: 'urgent',
            href: '/dashboard/agency?tab=scheduling',
          });
        }

        setItems(attentionItems);
      } catch (error) {
        console.error('[NeedsAttentionList] Error fetching attention items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttentionItems();
  }, [agencyId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Needs Attention</h2>
        <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              All good! No issues right now.
            </span>
          </div>
        </Card>
      </div>
    );
  }

  const visibleItems = showAll ? items : items.slice(0, 3);

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Needs Attention</h2>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <Card
            key={item.id}
            className={cn(
              'p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
              item.type === 'urgent' && 'border-red-200 dark:border-red-800'
            )}
            onClick={() => router.push(item.href)}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={cn(
                  'w-4 h-4 shrink-0',
                  item.type === 'urgent' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
                )}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {item.message}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </div>
          </Card>
        ))}

        {items.length > 3 && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-blue-600 dark:text-blue-400"
            onClick={() => setShowAll(true)}
          >
            View all ({items.length} items)
          </Button>
        )}
      </div>
    </div>
  );
}
