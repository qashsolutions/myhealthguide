'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DietAnalysisPanel } from '@/components/ai/DietAnalysisPanel';
import { analyzeDietEntry } from '@/lib/ai/geminiService';
import { DietAnalysis } from '@/types';
import { Utensils, Plus, X, Sparkles, ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { DietService } from '@/lib/firebase/diet';

export default function NewDietEntryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedElder, availableElders } = useElder();

  // Check if user is on multi-agency plan (can have multiple active elders)
  const isMultiAgencyPlan = user?.subscriptionTier === 'multi_agency';

  // For family/single-agency: only show active (non-archived) elders
  const activeElders = availableElders.filter(e => !e.archived);

  const [elderId, setElderId] = useState('');
  const [meal, setMeal] = useState('breakfast');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<DietAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill elder selection from context or auto-select if only one
  useEffect(() => {
    // If only one active elder, always auto-select it
    if (activeElders.length === 1 && activeElders[0]?.id) {
      setElderId(activeElders[0].id);
      return;
    }

    // For multiple elders, only pre-fill if not already set
    if (!elderId && selectedElder && !selectedElder.archived && selectedElder.id) {
      setElderId(selectedElder.id);
    }
  }, [selectedElder, activeElders, elderId]);

  const addItem = () => {
    if (itemInput.trim()) {
      setItems([...items, itemInput.trim()]);
      setItemInput('');
      setAnalysis(null); // Clear previous analysis
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setAnalysis(null); // Clear analysis when items change
  };

  const handleAnalyze = async () => {
    if (items.length === 0) {
      setError('Please add at least one food item');
      return;
    }

    if (!elderId) {
      setError('Please select an elder');
      return;
    }

    if (!user) {
      setError('You must be signed in');
      return;
    }

    const groupId = user.groups[0]?.groupId;
    if (!groupId) {
      setError('You must be part of a group');
      return;
    }

    const userId = user.id;
    const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

    if (!userRole) {
      setError('Unable to determine user role');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const result = await analyzeDietEntry({
        meal,
        items,
        elderAge: 75, // Mock age - replace with actual elder age from Firebase
        existingConditions: [] // Replace with actual conditions
      }, userId, userRole, groupId, elderId);

      setAnalysis(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!elderId) {
      setError('Please select an elder');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one food item');
      return;
    }

    if (!user) {
      setError('You must be signed in');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const groupId = user.groups[0]?.groupId;
      if (!groupId) {
        throw new Error('You must be part of a group');
      }

      const userId = user.id;
      const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

      if (!userRole) {
        throw new Error('Unable to determine user role');
      }

      await DietService.createEntry({
        elderId,
        groupId,
        meal: meal as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        items,
        notes: '',
        aiAnalysis: analysis || undefined,
        timestamp: new Date(),
        loggedBy: user.id,
        method: 'manual',
        createdAt: new Date()
      }, userId, userRole);

      router.push('/dashboard/diet');
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save meal entry. Please try again.');
      setIsSaving(false);
    }
  };

  // Check if no active elders exist
  if (activeElders.length === 0) {
    return (
      <TrialExpirationGate featureName="diet tracking">
        <EmailVerificationGate featureName="diet tracking">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Log Meal Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You need to add an elder before you can log meals.
                  </p>
                  <Button onClick={() => router.push('/dashboard/elders/new')}>
                    Add Elder First
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </EmailVerificationGate>
      </TrialExpirationGate>
    );
  }

  return (
    <TrialExpirationGate featureName="diet tracking">
      <EmailVerificationGate featureName="diet tracking">
        <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/diet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Log Meal Entry
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track meals and get smart nutrition insights
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-orange-600" />
              Meal Details
            </CardTitle>
            <CardDescription>
              Enter meal information and food items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Elder Selection */}
            <div className="space-y-2">
              <Label htmlFor="elderId">Elder</Label>
              {activeElders.length === 1 ? (
                // Single elder - show as static text
                <div className="flex items-center h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">{activeElders[0].name}</span>
                </div>
              ) : (
                // Multiple elders - show dropdown
                <Select value={elderId} onValueChange={setElderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an elder" />
                  </SelectTrigger>
                  <SelectContent>
                    {isMultiAgencyPlan ? (
                      // Multi-agency: show all elders, archived ones disabled and greyed
                      availableElders.map((elder) => (
                        <SelectItem
                          key={elder.id}
                          value={elder.id}
                          disabled={elder.archived}
                          className={elder.archived ? 'text-gray-400 dark:text-gray-600' : ''}
                        >
                          {elder.name}{elder.archived ? ' (Archived)' : ''}
                        </SelectItem>
                      ))
                    ) : (
                      // Family/Single-agency: only show active elders
                      activeElders.map((elder) => (
                        <SelectItem key={elder.id} value={elder.id}>
                          {elder.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Meal Type */}
            <div className="space-y-2">
              <Label htmlFor="meal">Meal Type</Label>
              <select
                id="meal"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            {/* Food Items */}
            <div className="space-y-2">
              <Label htmlFor="items">Food Items</Label>
              <div className="flex gap-2">
                <Input
                  id="items"
                  value={itemInput}
                  onChange={(e) => setItemInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="e.g., oatmeal, banana"
                  className="placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
                <Button onClick={addItem} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-full"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {item}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAnalyze}
                disabled={items.length === 0 || isAnalyzing}
                variant="outline"
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Smart Nutrition Analysis
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={items.length === 0 || !elderId || isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Entry'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        {analysis ? (
          <DietAnalysisPanel
            analysis={analysis}
            meal={meal}
            items={items}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Smart Nutrition
              </CardTitle>
              <CardDescription>
                Add food items and click &quot;Smart Nutrition Analysis&quot; to receive insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No analysis yet
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
