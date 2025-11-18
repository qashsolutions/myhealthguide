'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertType } from '@/types';
import { AlertCard } from './AlertCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, BellOff, Filter, RefreshCw } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { handleRefillAlertAction } from '@/lib/ai/medicationRefillPrediction';

interface AlertCenterProps {
  groupId: string;
  elderId?: string; // Optional - filter by specific elder
  compact?: boolean; // Compact mode for sidebar
}

export function AlertCenter({ groupId, elderId, compact = false }: AlertCenterProps) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'active' | 'dismissed'>('all');
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');

  // Real-time alert subscription
  useEffect(() => {
    if (!groupId || !user?.id) return;

    let q = query(
      collection(db, 'alerts'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    // Filter by elder if provided
    if (elderId) {
      q = query(q, where('elderId', '==', elderId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        dismissedAt: doc.data().dismissedAt?.toDate(),
        actionedAt: doc.data().actionedAt?.toDate()
      })) as Alert[];

      setAlerts(alertsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, elderId, user?.id]);

  const filteredAlerts = alerts.filter((alert) => {
    // Tab filter
    if (activeTab === 'critical' && alert.severity !== 'critical') return false;
    if (activeTab === 'active' && alert.status !== 'active') return false;
    if (activeTab === 'dismissed' && alert.status !== 'dismissed') return false;

    // Type filter
    if (filterType !== 'all' && alert.type !== filterType) return false;

    return true;
  });

  const handleAlertAction = async (alertId: string, action: string, data?: Record<string, any>) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return;

    try {
      // Handle specific alert types
      switch (alert.type) {
        case 'medication_refill':
          await handleRefillAlertAction(
            alertId,
            action,
            user!.id,
            alert.data.medicationId,
            data?.newQuantity
          );
          break;

        case 'emergency_pattern':
          if (action === 'mark_reviewed') {
            await updateDoc(doc(db, 'emergencyPatterns', alert.data.patternId), {
              status: 'reviewed',
              reviewedBy: user!.id,
              reviewedAt: new Date()
            });

            await updateDoc(doc(db, 'alerts', alertId), {
              status: 'actioned',
              actionedAt: new Date(),
              actionedBy: user!.id,
              actionTaken: 'Marked as reviewed'
            });
          }
          break;

        default:
          // Generic action handling
          await updateDoc(doc(db, 'alerts', alertId), {
            status: 'actioned',
            actionedAt: new Date(),
            actionedBy: user!.id,
            actionTaken: action
          });
      }
    } catch (error) {
      console.error('Error handling alert action:', error);
    }
  };

  const handleAlertDismiss = async (alertId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: user!.id,
        dismissalReason: reason
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Compact mode for notification panel
  if (compact) {
    const activeAlerts = alerts.filter((a) => a.status === 'active').slice(0, 5);

    if (activeAlerts.length === 0) {
      return (
        <div className="text-center py-8">
          <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">No active alerts</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {activeAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAction={handleAlertAction}
            onDismiss={handleAlertDismiss}
            compact
          />
        ))}
      </div>
    );
  }

  // Full alert center
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alerts</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {alerts.filter((a) => a.status === 'active').length} active alerts
          </p>
        </div>

        {/* Filter by type */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AlertType | 'all')}
            className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800"
          >
            <option value="all">All Types</option>
            <option value="medication_refill">Medication Refills</option>
            <option value="emergency_pattern">Emergency Patterns</option>
            <option value="health_change">Health Changes</option>
            <option value="shift_handoff">Shift Handoffs</option>
            <option value="appointment_reminder">Appointments</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({alerts.filter((a) => a.severity === 'critical').length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({alerts.filter((a) => a.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="dismissed">
            Dismissed ({alerts.filter((a) => a.status === 'dismissed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAction={handleAlertAction}
                  onDismiss={handleAlertDismiss}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
