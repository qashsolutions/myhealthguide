'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { DietService } from '@/lib/firebase/diet';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { Loader2, ArrowLeft, Utensils } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { DietEntry } from '@/types';

export default function EditDietEntryPage() {
  const router = useRouter();
  const params = useParams();
  const mealId = params.mealId as string;
  const { user } = useAuth();
  const { availableElders } = useElder();

  const [entry, setEntry] = useState<DietEntry | null>(null);
  const [formData, setFormData] = useState({
    meal: 'breakfast' as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    items: '',
    notes: ''
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

  // Load diet entry data
  useEffect(() => {
    const loadEntry = async () => {
      if (!user || !mealId) return;

      try {
        const userRole = getUserRole();
        const dietEntry = await DietService.getEntry(mealId, user.id, userRole);

        if (!dietEntry) {
          setError('Diet entry not found');
          setLoading(false);
          return;
        }

        setEntry(dietEntry);
        setFormData({
          meal: dietEntry.meal,
          items: dietEntry.items.join(', '),
          notes: dietEntry.notes || ''
        });
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading diet entry:', err);
        setError(err.message || 'Failed to load diet entry');
        setLoading(false);
      }
    };

    loadEntry();
  }, [user, mealId, getUserRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!user || !entry) {
        throw new Error('Unable to update diet entry');
      }

      // Parse items into array
      const itemsArray = formData.items
        .split(/[,]+/)
        .map(item => item.trim())
        .filter(item => item.length > 0);

      if (itemsArray.length === 0) {
        throw new Error('Please enter at least one food item');
      }

      const userRole = getUserRole();

      await DietService.updateEntry(
        mealId,
        {
          meal: formData.meal,
          items: itemsArray,
          notes: formData.notes || undefined
        },
        user.id,
        userRole
      );

      router.push('/dashboard/diet');
    } catch (err: any) {
      console.error('Error updating diet entry:', err);
      setError(err.message || 'Failed to update diet entry');
      setSaving(false);
    }
  };

  // Get elder name for display
  const elderName = entry
    ? availableElders.find(e => e.id === entry.elderId)?.name || 'Unknown'
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Link href="/dashboard/diet">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Diet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TrialExpirationGate featureName="diet tracking">
      <EmailVerificationGate featureName="diet tracking">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/diet">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <Utensils className="w-5 h-5 text-orange-600" />
                <CardTitle>Edit Meal Entry</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Loved One</Label>
                  <div className="flex items-center h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-gray-100">{elderName}</span>
                  </div>
                  <p className="text-xs text-gray-500">Loved one cannot be changed.</p>
                </div>

                {entry && (
                  <div className="space-y-2">
                    <Label>Logged</Label>
                    <div className="flex items-center h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-gray-100">
                        {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="meal">Meal Type</Label>
                  <select
                    id="meal"
                    value={formData.meal}
                    onChange={(e) => setFormData({...formData, meal: e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snack'})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="items">Food Items (comma separated)</Label>
                  <Textarea
                    id="items"
                    placeholder="e.g., Scrambled eggs, Toast, Orange juice"
                    value={formData.items}
                    onChange={(e) => setFormData({...formData, items: e.target.value})}
                    rows={3}
                    required
                  />
                  <p className="text-xs text-gray-500">Separate each food item with a comma</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about this meal"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                  />
                </div>

                {entry?.aiAnalysis && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      This entry has AI nutrition analysis (Score: {entry.aiAnalysis.nutritionScore}/100).
                      Editing items will preserve the existing analysis.
                    </p>
                  </div>
                )}

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
