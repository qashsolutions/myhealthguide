'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AlertCenter } from '@/components/alerts/AlertCenter';
import { Card } from '@/components/ui/card';

export default function AlertsPage() {
  const { user } = useAuth();

  // Get active group from user (assuming first group for now)
  const groupId = user?.groups?.[0]?.groupId;

  if (!groupId) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No group found. Please join or create a group first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AlertCenter groupId={groupId} />
    </div>
  );
}
