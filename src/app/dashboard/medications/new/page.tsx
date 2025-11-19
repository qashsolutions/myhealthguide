'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { MedicationService } from '@/lib/firebase/medications';
import { ElderService } from '@/lib/firebase/elders';
import { Elder } from '@/types';

export default function NewMedicationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [formData, setFormData] = useState({
    elderId: '',
    name: '',
    dosage: '',
    frequency: 'daily',
    times: '',
    instructions: '',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load elders for selection
  useEffect(() => {
    async function loadElders() {
      if (user?.groups[0]?.groupId) {
        try {
          const eldersList = await ElderService.getEldersByGroup(user.groups[0].groupId);
          setElders(eldersList);
        } catch (err) {
          console.error('Error loading elders:', err);
        }
      }
    }
    loadElders();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user) {
        throw new Error('You must be signed in');
      }

      const groupId = user.groups[0]?.groupId;
      if (!groupId) {
        throw new Error('You must be part of a group');
      }

      if (!formData.elderId) {
        throw new Error('Please select an elder');
      }

      // Parse times into array
      const timesArray = formData.times
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await MedicationService.createMedication({
        elderId: formData.elderId,
        groupId,
        name: formData.name,
        dosage: formData.dosage,
        frequency: {
          type: formData.frequency as 'daily' | 'weekly' | 'asNeeded',
          times: timesArray
        },
        instructions: formData.instructions,
        startDate: new Date(formData.startDate),
        endDate: undefined,
        reminders: true,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      router.push('/dashboard/medications');
    } catch (err: any) {
      console.error('Error creating medication:', err);
      setError(err.message || 'Failed to add medication');
      setLoading(false);
    }
  };

  // Check if no elders exist
  if (elders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Add New Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You need to add an elder before you can add medications.
              </p>
              <Button onClick={() => router.push('/dashboard/elders/new')}>
                Add Elder First
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add New Medication</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="elderId">Elder</Label>
              <Select value={formData.elderId} onValueChange={(value) => setFormData({...formData, elderId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an elder" />
                </SelectTrigger>
                <SelectContent>
                  {elders.map((elder) => (
                    <SelectItem key={elder.id} value={elder.id}>
                      {elder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Medication Name</Label>
              <Input
                id="name"
                placeholder="Lisinopril"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                placeholder="100"
                value={formData.dosage}
                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                required
                className="placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="times">Times (comma separated)</Label>
              <Input
                id="times"
                placeholder="7 am"
                value={formData.times}
                onChange={(e) => setFormData({...formData, times: e.target.value})}
                required
                className="placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
                className="placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Take with food"
                rows={3}
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                className="placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Add Medication'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
