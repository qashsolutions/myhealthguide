'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { isReadOnlyForElderCare } from '@/lib/utils/getUserRole';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Medication } from '@/types';

export default function EditMedicationPage() {
  const router = useRouter();
  const params = useParams();
  const medicationId = params.medicationId as string;
  const { user } = useAuth();
  const { availableElders } = useElder();

  // Check if user has read-only access for elder care data
  // Agency Owner (super_admin) is read-only, only caregivers can edit medications
  const readOnly = isReadOnlyForElderCare(user);

  const [medication, setMedication] = useState<Medication | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: '',
    instructions: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Determine user's role for HIPAA audit logging
  const getUserRole = useCallback((): 'admin' | 'caregiver' | 'member' => {
    const agencyRole = user?.agencies?.[0]?.role;
    if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') {
      return 'admin';
    }
    if (agencyRole === 'caregiver') {
      return 'caregiver';
    }
    const groupRole = user?.groups?.[0]?.role;
    if (groupRole === 'admin') {
      return 'admin';
    }
    return 'member';
  }, [user?.agencies, user?.groups]);

  // Load medication data
  useEffect(() => {
    const loadMedication = async () => {
      if (!user || !medicationId) return;

      try {
        const userRole = getUserRole();
        const med = await MedicationService.getMedication(medicationId, user.id, userRole);

        if (!med) {
          setError('Medication not found');
          setLoading(false);
          return;
        }

        setMedication(med);
        setFormData({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency.type,
          times: med.frequency.times.join(', '),
          instructions: med.instructions || '',
          startDate: med.startDate.toISOString().split('T')[0],
          endDate: med.endDate ? med.endDate.toISOString().split('T')[0] : ''
        });
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading medication:', err);
        setError(err.message || 'Failed to load medication');
        setLoading(false);
      }
    };

    loadMedication();
  }, [user, medicationId, getUserRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!user || !medication) {
        throw new Error('Unable to update medication');
      }

      // Parse times into array
      const timesArray = formData.times
        .split(/[,\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const userRole = getUserRole();

      // Build update data - only include endDate if it has a value
      const updateData: Partial<Medication> = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: {
          type: formData.frequency as 'daily' | 'weekly' | 'asNeeded',
          times: timesArray
        },
        instructions: formData.instructions,
        startDate: new Date(formData.startDate),
      };

      // Only add endDate if it's provided (Firestore doesn't accept undefined)
      if (formData.endDate) {
        updateData.endDate = new Date(formData.endDate);
      }

      await MedicationService.updateMedication(
        medicationId,
        updateData,
        user.id,
        userRole
      );

      router.push('/dashboard/medications');
    } catch (err: any) {
      console.error('Error updating medication:', err);
      setError(err.message || 'Failed to update medication');
      setSaving(false);
    }
  };

  // Get elder name for display
  const elderName = medication
    ? availableElders.find(e => e.id === medication.elderId)?.name || 'Unknown'
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Block read-only users from accessing this page
  if (readOnly) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You have view-only access. Only caregivers can edit medications.
              </p>
              <Button onClick={() => router.push('/dashboard/medications')}>
                Back to Medications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !medication) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Link href="/dashboard/medications">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Medications
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TrialExpirationGate featureName="medications">
      <EmailVerificationGate featureName="medications">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/medications">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <CardTitle>Edit Medication</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Loved One</Label>
                  <div className="flex items-center h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-gray-100">{elderName}</span>
                  </div>
                  <p className="text-xs text-gray-500">Loved one cannot be changed. Create a new medication for a different loved one.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Medication Name</Label>
                  <Input
                    id="name"
                    placeholder="Lisinopril"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    placeholder="100mg"
                    value={formData.dosage}
                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="times">Times (comma separated)</Label>
                  <Input
                    id="times"
                    placeholder="7 am, 12 pm, 7 pm"
                    value={formData.times}
                    onChange={(e) => setFormData({...formData, times: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    />
                    <p className="text-xs text-gray-500">Leave empty if ongoing</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Take with food"
                    rows={3}
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
