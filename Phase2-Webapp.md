# Phase 2: Core Care Tracking - Caregiver Webapp

## Overview
**Duration**: Week 2 (5-7 days)  
**Goal**: Implement elder profiles, medication management, supplement tracking, and diet logging with manual entry

## Deliverables
✅ Elder management (add/edit/view elders)  
✅ Medication CRUD with scheduling  
✅ Supplement CRUD with scheduling  
✅ Diet entry logging  
✅ Manual dose logging for medications and supplements  
✅ Visual schedule displays  
✅ Elder-specific data filtering  

---

## Task 2.1: Elder Management

### Objective
Allow users to add, edit, and manage elder profiles within their group.

### File: `src/app/(dashboard)/elders/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ElderCard } from '@/components/care/ElderCard';
import { useRouter } from 'next/navigation';
import { Elder } from '@/types';
import { ElderService } from '@/lib/firebase/elders';
import { useAuth } from '@/hooks/useAuth';

export default function EldersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.groups[0]) {
      loadElders();
    }
  }, [user]);

  const loadElders = async () => {
    try {
      setLoading(true);
      const groupId = user!.groups[0].groupId;
      const data = await ElderService.getEldersByGroup(groupId);
      setElders(data);
    } catch (error) {
      console.error('Error loading elders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Elders
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage elder profiles in your care
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/elders/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Elder
        </Button>
      </div>

      {elders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No elders added yet
          </p>
          <Button onClick={() => router.push('/dashboard/elders/new')}>
            Add Your First Elder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elders.map((elder) => (
            <ElderCard key={elder.id} elder={elder} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `src/components/care/ElderCard.tsx`
```typescript
'use client';

import { Elder } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface ElderCardProps {
  elder: Elder;
}

export function ElderCard({ elder }: ElderCardProps) {
  const router = useRouter();

  const age = new Date().getFullYear() - new Date(elder.dateOfBirth).getFullYear();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={elder.profileImage} />
            <AvatarFallback>
              {elder.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{elder.name}</h3>
            <p className="text-sm text-gray-500">Age {age}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Date of Birth:</span>{' '}
            {format(new Date(elder.dateOfBirth), 'MMM dd, yyyy')}
          </p>
          {elder.notes && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {elder.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/dashboard/elders/${elder.id}`)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            View Care
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### File: `src/app/(dashboard)/elders/new/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ElderForm } from '@/components/care/ElderForm';
import { Elder } from '@/types';
import { ElderService } from '@/lib/firebase/elders';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewElderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: Partial<Elder>) => {
    try {
      setLoading(true);
      setError('');

      const groupId = user!.groups[0].groupId;
      await ElderService.createElder(groupId, {
        ...data,
        createdAt: new Date()
      } as Elder);

      router.push('/dashboard/elders');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add New Elder</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}
          <ElderForm onSubmit={handleSubmit} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### File: `src/components/care/ElderForm.tsx`
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Elder } from '@/types';

const elderSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  notes: z.string().optional()
});

type ElderFormData = z.infer<typeof elderSchema>;

interface ElderFormProps {
  elder?: Elder;
  onSubmit: (data: Partial<Elder>) => Promise<void>;
  loading?: boolean;
}

export function ElderForm({ elder, onSubmit, loading }: ElderFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ElderFormData>({
    resolver: zodResolver(elderSchema),
    defaultValues: elder
      ? {
          name: elder.name,
          dateOfBirth: new Date(elder.dateOfBirth).toISOString().split('T')[0],
          notes: elder.notes
        }
      : undefined
  });

  const handleFormSubmit = async (data: ElderFormData) => {
    await onSubmit({
      ...data,
      dateOfBirth: new Date(data.dateOfBirth)
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="John Smith"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          {...register('dateOfBirth')}
        />
        {errors.dateOfBirth && (
          <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Medical conditions, preferences, etc."
          rows={4}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : elder ? 'Update Elder' : 'Add Elder'}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

### File: `src/lib/firebase/elders.ts`
```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Elder } from '@/types';

export class ElderService {
  private static COLLECTION = 'elders';

  /**
   * Create a new elder
   */
  static async createElder(groupId: string, elder: Omit<Elder, 'id'>): Promise<Elder> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...elder,
      groupId,
      createdAt: Timestamp.fromDate(elder.createdAt)
    });

    return {
      ...elder,
      id: docRef.id
    };
  }

  /**
   * Get elders by group ID
   */
  static async getEldersByGroup(groupId: string): Promise<Elder[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Elder[];
  }

  /**
   * Get elder by ID
   */
  static async getElder(elderId: string): Promise<Elder | null> {
    const docRef = doc(db, this.COLLECTION, elderId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt.toDate()
    } as Elder;
  }

  /**
   * Update elder
   */
  static async updateElder(elderId: string, data: Partial<Elder>): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    await updateDoc(docRef, data);
  }

  /**
   * Delete elder
   */
  static async deleteElder(elderId: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION, elderId);
    await deleteDoc(docRef);
  }
}
```

---

## Task 2.2: Medication Management

### File: `src/app/(dashboard)/medications/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicationCard } from '@/components/care/MedicationCard';
import { useRouter } from 'next/navigation';
import { Medication, Elder } from '@/types';
import { MedicationService } from '@/lib/firebase/medications';
import { ElderService } from '@/lib/firebase/elders';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export default function MedicationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.groups[0]) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const groupId = user!.groups[0].groupId;
      const [medicationsData, eldersData] = await Promise.all([
        MedicationService.getMedicationsByGroup(groupId),
        ElderService.getEldersByGroup(groupId)
      ]);
      setMedications(medicationsData);
      setElders(eldersData);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedications = selectedElder === 'all'
    ? medications
    : medications.filter(med => med.elderId === selectedElder);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Medications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage medication schedules and tracking
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/medications/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </div>

      {/* Filter by Elder */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <Select value={selectedElder} onValueChange={setSelectedElder}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by elder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Elders</SelectItem>
            {elders.map(elder => (
              <SelectItem key={elder.id} value={elder.id}>
                {elder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredMedications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No medications added yet
          </p>
          <Button onClick={() => router.push('/dashboard/medications/new')}>
            Add Your First Medication
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              elder={elders.find(e => e.id === medication.elderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `src/components/care/MedicationCard.tsx`
```typescript
'use client';

import { Medication, Elder } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogDoseModal } from './LogDoseModal';

interface MedicationCardProps {
  medication: Medication;
  elder?: Elder;
}

export function MedicationCard({ medication, elder }: MedicationCardProps) {
  const router = useRouter();
  const [showLogModal, setShowLogModal] = useState(false);

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{medication.name}</h3>
              <p className="text-sm text-gray-500">{medication.dosage}</p>
            </div>
            <Badge variant={medication.frequency.type === 'daily' ? 'default' : 'secondary'}>
              {medication.frequency.type}
            </Badge>
          </div>
          {elder && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              For: {elder.name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Schedule */}
          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Schedule
            </p>
            <div className="flex flex-wrap gap-1">
              {medication.frequency.times.map((time, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {time}
                </Badge>
              ))}
            </div>
          </div>

          {/* Instructions */}
          {medication.instructions && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {medication.instructions}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowLogModal(true)}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Log Dose
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/medications/${medication.id}`)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <LogDoseModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        medication={medication}
        elder={elder}
      />
    </>
  );
}
```

### File: `src/components/care/LogDoseModal.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Medication, Elder, MedicationLog } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MedicationService } from '@/lib/firebase/medications';
import { useAuth } from '@/hooks/useAuth';

interface LogDoseModalProps {
  open: boolean;
  onClose: () => void;
  medication: Medication;
  elder?: Elder;
}

export function LogDoseModal({ open, onClose, medication, elder }: LogDoseModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'taken' | 'missed' | 'skipped'>('taken');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const log: Omit<MedicationLog, 'id'> = {
        groupId: user!.groups[0].groupId,
        elderId: medication.elderId,
        medicationId: medication.id,
        scheduledTime: new Date(),
        actualTime: status === 'taken' ? new Date() : undefined,
        status,
        loggedBy: user!.id,
        method: 'manual',
        notes: notes || undefined,
        createdAt: new Date()
      };

      await MedicationService.logDose(log);
      onClose();
    } catch (error) {
      console.error('Error logging dose:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Medication Dose</DialogTitle>
          <DialogDescription>
            {medication.name} - {medication.dosage}
            {elder && ` for ${elder.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              <Button
                variant={status === 'taken' ? 'default' : 'outline'}
                onClick={() => setStatus('taken')}
                className="flex-1"
              >
                Taken
              </Button>
              <Button
                variant={status === 'missed' ? 'default' : 'outline'}
                onClick={() => setStatus('missed')}
                className="flex-1"
              >
                Missed
              </Button>
              <Button
                variant={status === 'skipped' ? 'default' : 'outline'}
                onClick={() => setStatus('skipped')}
                className="flex-1"
              >
                Skipped
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or reasons..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Log Dose'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/lib/firebase/medications.ts`
```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Medication, MedicationLog } from '@/types';

export class MedicationService {
  private static MEDICATIONS = 'medications';
  private static LOGS = 'medication_logs';

  /**
   * Create medication
   */
  static async createMedication(medication: Omit<Medication, 'id'>): Promise<Medication> {
    const docRef = await addDoc(collection(db, this.MEDICATIONS), {
      ...medication,
      startDate: Timestamp.fromDate(medication.startDate),
      endDate: medication.endDate ? Timestamp.fromDate(medication.endDate) : null,
      createdAt: Timestamp.fromDate(medication.createdAt),
      updatedAt: Timestamp.fromDate(medication.updatedAt)
    });

    return { ...medication, id: docRef.id };
  }

  /**
   * Get medications by group
   */
  static async getMedicationsByGroup(groupId: string): Promise<Medication[]> {
    const q = query(
      collection(db, this.MEDICATIONS),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Medication[];
  }

  /**
   * Log medication dose
   */
  static async logDose(log: Omit<MedicationLog, 'id'>): Promise<MedicationLog> {
    const docRef = await addDoc(collection(db, this.LOGS), {
      ...log,
      scheduledTime: Timestamp.fromDate(log.scheduledTime),
      actualTime: log.actualTime ? Timestamp.fromDate(log.actualTime) : null,
      createdAt: Timestamp.fromDate(log.createdAt)
    });

    return { ...log, id: docRef.id };
  }

  /**
   * Get logs for medication
   */
  static async getLogsByMedication(medicationId: string): Promise<MedicationLog[]> {
    const q = query(
      collection(db, this.LOGS),
      where('medicationId', '==', medicationId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data().scheduledTime.toDate(),
      actualTime: doc.data().actualTime?.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as MedicationLog[];
  }
}
```

---

## Task 2.3: Supplement Management

### File: `src/app/(dashboard)/supplements/page.tsx`
```typescript
// Similar structure to medications page
// Use SupplementCard and SupplementService
// Simpler than medications (no prescription info)
```

### File: `src/lib/firebase/supplements.ts`
```typescript
// Similar to medications.ts but for supplements
// Collections: 'supplements' and 'supplement_logs'
```

---

## Task 2.4: Diet Tracking

### File: `src/app/(dashboard)/diet/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DietEntryCard } from '@/components/care/DietEntryCard';
import { useRouter } from 'next/navigation';
import { DietEntry, Elder } from '@/types';
import { DietService } from '@/lib/firebase/diet';
import { ElderService } from '@/lib/firebase/elders';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function DietPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.groups[0]) {
      loadData();
    }
  }, [user, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const groupId = user!.groups[0].groupId;
      const [entriesData, eldersData] = await Promise.all([
        DietService.getEntriesByDateRange(
          groupId,
          startOfDay(selectedDate),
          endOfDay(selectedDate)
        ),
        ElderService.getEldersByGroup(groupId)
      ]);
      setEntries(entriesData);
      setElders(eldersData);
    } catch (error) {
      console.error('Error loading diet entries:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Diet Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Log meals and monitor nutrition
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/diet/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Log Meal
        </Button>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="border rounded-md px-3 py-2"
        />
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No meals logged for {format(selectedDate, 'MMM dd, yyyy')}
          </p>
          <Button onClick={() => router.push('/dashboard/diet/new')}>
            Log Your First Meal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <DietEntryCard
              key={entry.id}
              entry={entry}
              elder={elders.find(e => e.id === entry.elderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `src/lib/firebase/diet.ts`
```typescript
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { DietEntry } from '@/types';

export class DietService {
  private static COLLECTION = 'diet_entries';

  /**
   * Create diet entry
   */
  static async createEntry(entry: Omit<DietEntry, 'id'>): Promise<DietEntry> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp),
      createdAt: Timestamp.fromDate(entry.createdAt)
    });

    return { ...entry, id: docRef.id };
  }

  /**
   * Get entries by date range
   */
  static async getEntriesByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DietEntry[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('groupId', '==', groupId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
      createdAt: doc.data().createdAt.toDate()
    })) as DietEntry[];
  }
}
```

---

## Task 2.5: Custom Hooks

### File: `src/hooks/useAuth.ts`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { AuthService } from '@/lib/firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await AuthService.getCurrentUserData();
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
```

---

## Phase 2 Checklist

- [ ] Elder management complete (CRUD)
- [ ] Elder profile cards and details
- [ ] Medication management complete
- [ ] Medication scheduling logic
- [ ] Manual dose logging modal
- [ ] Supplement management complete
- [ ] Diet entry logging complete
- [ ] Date filtering for diet entries
- [ ] Elder filtering for medications/supplements
- [ ] All Firebase services implemented
- [ ] Custom hooks created
- [ ] Responsive on all screen sizes
- [ ] No console errors
- [ ] All data persists to Firestore

---

## Testing Phase 2

### Manual Testing Checklist
1. **Elder Management**
   - [ ] Can add new elder
   - [ ] Can edit elder details
   - [ ] Elder cards display correctly
   - [ ] Age calculated correctly

2. **Medications**
   - [ ] Can add medication with schedule
   - [ ] Can log dose (taken/missed/skipped)
   - [ ] Medication cards show schedule
   - [ ] Can filter by elder

3. **Supplements**
   - [ ] Can add supplement
   - [ ] Can log supplement intake
   - [ ] Similar functionality to medications

4. **Diet**
   - [ ] Can log meals
   - [ ] Can select date
   - [ ] Entries display correctly
   - [ ] Can view by elder

---

## Next Steps (Phase 3)

With Phase 2 complete, move to Phase 3:
- Voice input integration (Google Speech-to-Text)
- Voice-powered logging for meds, supplements, and diet
- Voice transcript parsing
- Real-time feedback during recording

---

**Phase 2 Duration**: 5-7 days  
**Estimated Lines of Code**: ~4,000 lines
