'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { useFeatureTracking, useTabTracking } from '@/hooks/useFeatureTracking';
import { useElderDataLoader } from '@/hooks/useDataLoader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pill,
  Leaf,
  Utensils,
  Zap,
  Plus,
  Clock,
  Bell,
  Calendar,
  Download,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSuperAdmin } from '@/lib/utils/getUserRole';
import Link from 'next/link';
import { MedicationService } from '@/lib/firebase/medications';
import { SupplementService } from '@/lib/firebase/supplements';
import { DietService } from '@/lib/firebase/diet';
import { ReminderDialog } from '@/components/notifications/ReminderDialog';
import { LogDoseModal } from '@/components/care/LogDoseModal';
import type { Medication, Supplement, DietEntry } from '@/types';
import { format, isToday } from 'date-fns';

type TabType = 'medications' | 'supplements' | 'diet' | 'activity';

function DailyCareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder } = useElder();

  // Get active tab from URL or default to medications
  const activeTab = (searchParams.get('tab') as TabType) || 'medications';

  // Feature tracking with tab support
  useTabTracking('daily_care', activeTab, {
    medications: 'daily_care_medications',
    supplements: 'daily_care_supplements',
    diet: 'daily_care_diet',
    activity: 'daily_care_activity',
  });

  // Dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [logDoseModalOpen, setLogDoseModalOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // Determine user's role (needed for ReminderDialog and write access)
  const getUserRole = (): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
    if (agencyRole === 'caregiver') return 'caregiver';
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') return 'admin';
    return 'member';
  };

  // Check if user has write access to health data
  // - Family members (read-only) cannot write
  // - Super admins can view all data but CANNOT write to health data (they manage agency, not health records)
  // - Only caregivers and family admins can write
  const userRole = getUserRole();
  const canWrite = userRole !== 'member' && !isSuperAdmin(user);

  // Load medications
  const { data: medications, loading: medsLoading } = useElderDataLoader<Medication[]>({
    fetcher: (elder, user, role) =>
      MedicationService.getMedicationsByElder(elder.id, elder.groupId, user.id, role),
    elder: selectedElder,
    user,
    errorPrefix: 'Failed to load medications',
  });

  // Load supplements
  const { data: supplements, loading: suppsLoading } = useElderDataLoader<Supplement[]>({
    fetcher: (elder, user, role) =>
      SupplementService.getSupplementsByElder(elder.id, elder.groupId, user.id, role),
    elder: selectedElder,
    user,
    errorPrefix: 'Failed to load supplements',
  });

  // Load diet entries (filtered to today)
  const { data: dietEntries, loading: dietLoading } = useElderDataLoader<DietEntry[]>({
    fetcher: (elder, user, role) =>
      DietService.getEntriesByElder(elder.id, elder.groupId, user.id, role),
    elder: selectedElder,
    user,
    transform: (entries) => entries.filter(d => isToday(new Date(d.timestamp))),
    errorPrefix: 'Failed to load diet entries',
  });

  // Combined loading state
  const loading = medsLoading || suppsLoading || dietLoading;

  // Change tab
  const setActiveTab = (tab: TabType) => {
    router.push(`/dashboard/daily-care?tab=${tab}`, { scroll: false });
  };

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number | string }[] = [
    { id: 'medications', label: 'Medications', icon: Pill, count: medications.length },
    { id: 'supplements', label: 'Supplements', icon: Leaf, count: supplements.length },
    { id: 'diet', label: 'Diet', icon: Utensils, count: `${dietEntries.length}/3` },
    { id: 'activity', label: 'Activity', icon: Zap },
  ];

  // Quick action handlers
  const handleSetReminder = () => {
    setReminderDialogOpen(true);
  };

  const handleViewSchedule = () => {
    router.push('/dashboard/activity');
  };

  const handleComparePrices = () => {
    alert('Coming Soon: Price comparison feature is under development');
  };

  // Handle opening log dose modal
  const handleLogDose = (medication: Medication) => {
    setSelectedMedication(medication);
    setLogDoseModalOpen(true);
  };

  // Handle closing log dose modal
  const handleLogDoseClose = () => {
    setLogDoseModalOpen(false);
    setSelectedMedication(null);
  };

  if (!selectedElder) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Please select a loved one from the header to view daily care.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Daily Care
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track {selectedElder.name}&apos;s medications, supplements, diet & activity
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => {
            if (activeTab === 'medications') router.push('/dashboard/medications/new');
            else if (activeTab === 'supplements') router.push('/dashboard/supplements/new');
            else if (activeTab === 'diet') router.push('/dashboard/diet/new');
            else router.push('/dashboard/activity');
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Log Entry
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleSetReminder}>
          <Bell className="w-4 h-4 mr-2" />
          Set Reminder
        </Button>
        <Button variant="outline" size="sm" onClick={handleViewSchedule}>
          <Calendar className="w-4 h-4 mr-2" />
          View Schedule
        </Button>
        <Button variant="outline" size="sm" onClick={handleComparePrices}>
          <Download className="w-4 h-4 mr-2" />
          Compare Prices
        </Button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {activeTab === 'medications' && (
            <MedicationsTab
              medications={medications}
              elderId={selectedElder.id}
              canWrite={canWrite}
              onLogDose={handleLogDose}
            />
          )}
          {activeTab === 'supplements' && (
            <SupplementsTab supplements={supplements} elderId={selectedElder.id} canWrite={canWrite} />
          )}
          {activeTab === 'diet' && (
            <DietTab dietEntries={dietEntries} elderId={selectedElder.id} canWrite={canWrite} />
          )}
          {activeTab === 'activity' && (
            <ActivityTab elderId={selectedElder.id} />
          )}
        </>
      )}

      {/* Reminder Dialog */}
      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        medications={medications}
        supplements={supplements}
        groupId={selectedElder.groupId}
        elderId={selectedElder.id}
        userId={user?.id || ''}
        userRole={userRole}
        isFullyVerified={!!(user?.emailVerified && user?.phoneVerified)}
      />

      {/* Log Dose Modal */}
      {selectedMedication && (
        <LogDoseModal
          open={logDoseModalOpen}
          onClose={handleLogDoseClose}
          medication={selectedMedication}
          elder={selectedElder}
        />
      )}
    </div>
  );
}

// Medications Tab Content
function MedicationsTab({
  medications,
  elderId,
  canWrite,
  onLogDose
}: {
  medications: Medication[];
  elderId: string;
  canWrite: boolean;
  onLogDose: (medication: Medication) => void;
}) {
  if (medications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Medications
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {canWrite ? 'Add medications to start tracking' : 'No medications have been added yet'}
        </p>
        {canWrite && (
          <Link href="/dashboard/medications/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
            </Button>
          </Link>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => (
        <Card key={med.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{med.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {med.dosage} • {med.frequency?.type === 'daily' ? 'Daily' : med.frequency?.type === 'weekly' ? 'Weekly' : 'As needed'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-gray-500 hidden sm:block">
                {med.frequency?.times?.[0] || '--:--'}
              </span>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 hidden sm:flex">
                <Check className="w-3 h-3 mr-1" />
                Active
              </Badge>
              {canWrite && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onLogDose(med)}
                  className="whitespace-nowrap"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Log Dose
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Supplements Tab Content
function SupplementsTab({ supplements, elderId, canWrite }: { supplements: Supplement[]; elderId: string; canWrite: boolean }) {
  if (supplements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Leaf className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Supplements
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {canWrite ? 'Add supplements to start tracking' : 'No supplements have been added yet'}
        </p>
        {canWrite && (
          <Link href="/dashboard/supplements/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Supplement
            </Button>
          </Link>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {supplements.map((supp) => (
        <Card key={supp.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Leaf className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{supp.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {supp.dosage} • {supp.frequency?.type === 'daily' ? 'Daily' : supp.frequency?.type === 'weekly' ? 'Weekly' : 'As needed'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {supp.frequency?.times?.[0] || '--:--'}
              </span>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <Check className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Diet Tab Content
function DietTab({ dietEntries, elderId, canWrite }: { dietEntries: DietEntry[]; elderId: string; canWrite: boolean }) {
  const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="space-y-3">
      {mealTypes.map((mealType) => {
        const entry = dietEntries.find(d => d.meal === mealType);
        const isLogged = !!entry;

        return (
          <Card key={mealType} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isLogged
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-gray-100 dark:bg-gray-700"
                )}>
                  <Utensils className={cn(
                    "w-5 h-5",
                    isLogged
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400"
                  )} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                    {mealType}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isLogged ? entry?.notes || `${entry?.items?.length || 0} items logged` : 'Not logged yet'}
                  </p>
                </div>
              </div>
              <div>
                {isLogged ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    <Check className="w-3 h-3 mr-1" />
                    Logged
                  </Badge>
                ) : canWrite ? (
                  <Link href="/dashboard/diet/new">
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Log
                    </Button>
                  </Link>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-200">
                    <X className="w-3 h-3 mr-1" />
                    Not logged
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Activity Tab Content
function ActivityTab({ elderId }: { elderId: string }) {
  return (
    <Card className="p-8 text-center">
      <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Activity Tracking
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        View today&apos;s schedule and mark items as complete
      </p>
      <Link href="/dashboard/activity">
        <Button>
          <Calendar className="w-4 h-4 mr-2" />
          Go to Activity
        </Button>
      </Link>
    </Card>
  );
}

export default function DailyCarePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <DailyCareContent />
    </Suspense>
  );
}
