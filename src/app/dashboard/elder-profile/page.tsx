'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  Heart,
  AlertTriangle,
  Activity,
  FileText,
  Phone,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { canAccessElderProfile, getElderProfile } from '@/lib/firebase/elderHealthProfile';
import { ElderProfileTab } from '@/components/elder-profile/ElderProfileTab';
import { HealthConditionsTab } from '@/components/elder-profile/HealthConditionsTab';
import { AllergiesTab } from '@/components/elder-profile/AllergiesTab';
import { SymptomsTab } from '@/components/elder-profile/SymptomsTab';
import { ImportantNotesTab } from '@/components/elder-profile/ImportantNotesTab';
import { EmergencyContactsTab } from '@/components/elder-profile/EmergencyContactsTab';
import { HealthInsightsTab } from '@/components/elder-profile/HealthInsightsTab';
import type { Elder } from '@/types';

export default function ElderProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { selectedElder, availableElders } = useElder();

  const elderIdParam = searchParams.get('elderId');
  const tabParam = searchParams.get('tab');

  const [elder, setElder] = useState<Elder | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');

  // Determine which elder to show
  const elderId = elderIdParam || selectedElder?.id;
  const groupId = selectedElder?.groupId || user?.groups?.[0]?.groupId;

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    loadElderData();
  }, [elderId, groupId, user?.id]);

  const loadElderData = async () => {
    if (!elderId || !groupId || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check access permission
      const canAccess = await canAccessElderProfile(user.id, elderId, groupId);
      setHasAccess(canAccess);

      if (canAccess) {
        const elderData = await getElderProfile(elderId);
        setElder(elderData);
      }
    } catch (error) {
      console.error('Error loading elder data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading health profile...</p>
        </div>
      </div>
    );
  }

  if (!elderId || !groupId) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            No Elder Selected
          </CardTitle>
          <CardDescription>
            Please select an elder from the dropdown above to view their health profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You do not have permission to view this elder's health profile.
            Only group admins and the primary caregiver can access this information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!elder || !user) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle>Elder Not Found</CardTitle>
          <CardDescription>
            The requested elder could not be found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500" />
            {elder.preferredName || elder.name}'s Health Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive health information and care insights
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/manage-elders')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Elders
        </Button>
      </div>

      {/* Disclaimer */}
      <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Important:</strong> This health profile is for caregiving reference only.
          It is not a medical record. Always consult healthcare providers for medical decisions.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center gap-1 text-xs sm:text-sm">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Conditions</span>
          </TabsTrigger>
          <TabsTrigger value="allergies" className="flex items-center gap-1 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Allergies</span>
          </TabsTrigger>
          <TabsTrigger value="symptoms" className="flex items-center gap-1 text-xs sm:text-sm">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Symptoms</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-1 text-xs sm:text-sm">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ElderProfileTab
            elder={elder}
            groupId={groupId}
            userId={user.id}
            onUpdate={loadElderData}
          />
        </TabsContent>

        <TabsContent value="conditions">
          <HealthConditionsTab
            elderId={elderId}
            groupId={groupId}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="allergies">
          <AllergiesTab
            elderId={elderId}
            groupId={groupId}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="symptoms">
          <SymptomsTab
            elderId={elderId}
            groupId={groupId}
            userId={user.id}
            elderName={elder.name}
          />
        </TabsContent>

        <TabsContent value="notes">
          <ImportantNotesTab
            elderId={elderId}
            groupId={groupId}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <EmergencyContactsTab
            elderId={elderId}
            groupId={groupId}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="insights">
          <HealthInsightsTab
            elderId={elderId}
            groupId={groupId}
            userId={user.id}
            elderName={elder.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
