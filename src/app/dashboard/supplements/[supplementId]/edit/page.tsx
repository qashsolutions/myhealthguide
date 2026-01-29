'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidationError } from '@/components/ui/ValidationError';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { SupplementService } from '@/lib/firebase/supplements';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { useNameValidation } from '@/hooks/useNameValidation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Supplement } from '@/types';

export default function EditSupplementPage() {
  const router = useRouter();
  const params = useParams();
  const supplementId = params.supplementId as string;
  const { user } = useAuth();
  const { availableElders } = useElder();

  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Name validation hook
  const { validateField, getError, getSuggestion, applySuggestion, clearError } = useNameValidation();

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

  // Load supplement data
  useEffect(() => {
    const loadSupplement = async () => {
      if (!user || !supplementId) return;

      try {
        const userRole = getUserRole();
        const supp = await SupplementService.getSupplement(supplementId, user.id, userRole);

        if (!supp) {
          setError('Supplement not found');
          setLoading(false);
          return;
        }

        setSupplement(supp);
        setFormData({
          name: supp.name,
          dosage: supp.dosage,
          frequency: supp.frequency.type,
          times: supp.frequency.times.join(', '),
          notes: supp.notes || ''
        });
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading supplement:', err);
        setError(err.message || 'Failed to load supplement');
        setLoading(false);
      }
    };

    loadSupplement();
  }, [user, supplementId, getUserRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name field before submission
    if (!validateField('name', formData.name, 'supplement')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (!user || !supplement) {
        throw new Error('Unable to update supplement');
      }

      // Parse times into array
      const timesArray = formData.times
        .split(/[,\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const userRole = getUserRole();

      await SupplementService.updateSupplement(
        supplementId,
        {
          name: formData.name,
          dosage: formData.dosage,
          frequency: {
            type: formData.frequency as 'daily' | 'weekly' | 'asNeeded',
            times: timesArray
          },
          notes: formData.notes
        },
        user.id,
        userRole
      );

      router.push('/dashboard/supplements');
    } catch (err: any) {
      console.error('Error updating supplement:', err);
      setError(err.message || 'Failed to update supplement');
      setSaving(false);
    }
  };

  // Get elder name for display
  const elderName = supplement
    ? availableElders.find(e => e.id === supplement.elderId)?.name || 'Unknown'
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !supplement) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Link href="/dashboard/supplements">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Supplements
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TrialExpirationGate featureName="supplements">
      <EmailVerificationGate featureName="supplements">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/supplements">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <CardTitle>Edit Supplement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Loved One</Label>
                  <div className="flex items-center h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-gray-100">{elderName}</span>
                  </div>
                  <p className="text-xs text-gray-500">Loved one cannot be changed. Create a new supplement for a different loved one.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Supplement Name</Label>
                  <Input
                    id="name"
                    placeholder="Vitamin D"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      clearError('name');
                    }}
                    onBlur={() => validateField('name', formData.name, 'supplement')}
                    required
                  />
                  <ValidationError
                    error={getError('name')}
                    suggestion={getSuggestion('name')}
                    onApplySuggestion={() => {
                      const suggested = applySuggestion('name');
                      if (suggested) setFormData({...formData, name: suggested});
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    placeholder="1000 IU"
                    value={formData.dosage}
                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="times">Times (comma separated)</Label>
                  <Input
                    id="times"
                    placeholder="8 am"
                    value={formData.times}
                    onChange={(e) => setFormData({...formData, times: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Take with breakfast"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
