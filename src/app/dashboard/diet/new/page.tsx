'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DietAnalysisPanel } from '@/components/ai/DietAnalysisPanel';
import { analyzeDietEntryWithParsing } from '@/lib/ai/geminiService';
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
  const [freeformInput, setFreeformInput] = useState(''); // Free-form text input
  const [parsedItems, setParsedItems] = useState<string[]>([]); // AI-parsed items
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

  const removeItem = (index: number) => {
    setParsedItems(parsedItems.filter((_, i) => i !== index));
    setAnalysis(null); // Clear analysis when items change
  };

  const handleAnalyze = async () => {
    if (!freeformInput.trim() && parsedItems.length === 0) {
      setError('Please describe what was eaten');
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

    // Get elder data for enhanced analysis
    const elder = activeElders.find(e => e.id === elderId);
    const elderAge = elder?.approximateAge || 75;
    const elderConditions = elder?.knownConditions || [];
    const elderWeight = elder?.weight;
    const elderSex = elder?.biologicalSex;
    const elderDietaryRestrictions = elder?.dietaryRestrictions || [];

    setIsAnalyzing(true);
    setError('');

    try {
      // Use the new parsing + analysis function
      const result = await analyzeDietEntryWithParsing(
        {
          meal,
          freeformText: freeformInput.trim(),
          elderAge,
          existingConditions: elderConditions
        },
        userId,
        userRole,
        groupId,
        elderId,
        {
          weight: elderWeight,
          biologicalSex: elderSex,
          dietaryRestrictions: elderDietaryRestrictions
        }
      );

      // Update parsed items from AI response
      if (result.parsedItems && result.parsedItems.length > 0) {
        setParsedItems(result.parsedItems);
      }
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

    if (!freeformInput.trim() && parsedItems.length === 0) {
      setError('Please describe what was eaten');
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

      // Get elder data for enhanced analysis
      const elder = activeElders.find(e => e.id === elderId);
      const elderAge = elder?.approximateAge || 75;
      const elderConditions = elder?.knownConditions || [];
      const elderWeight = elder?.weight;
      const elderSex = elder?.biologicalSex;
      const elderDietaryRestrictions = elder?.dietaryRestrictions || [];

      // Auto-analyze if not already done (this also parses free-form text)
      let finalAnalysis = analysis;
      let finalItems = parsedItems.length > 0 ? parsedItems : [];

      console.log('[DietNew] Starting save:', {
        hasExistingAnalysis: !!analysis,
        existingScore: analysis?.nutritionScore,
        parsedItemsCount: parsedItems.length,
        meal,
        elderId,
        groupId
      });

      if (!finalAnalysis || finalItems.length === 0) {
        console.log('[DietNew] Running auto-analysis...');
        try {
          const result = await analyzeDietEntryWithParsing(
            {
              meal,
              freeformText: freeformInput.trim(),
              elderAge,
              existingConditions: elderConditions
            },
            userId,
            userRole,
            groupId,
            elderId,
            {
              weight: elderWeight,
              biologicalSex: elderSex,
              dietaryRestrictions: elderDietaryRestrictions
            }
          );
          console.log('[DietNew] Auto-analysis result:', {
            hasResult: !!result,
            score: result?.nutritionScore,
            parsedItems: result?.parsedItems?.length
          });
          finalAnalysis = result;
          if (result.parsedItems && result.parsedItems.length > 0) {
            finalItems = result.parsedItems;
            setParsedItems(finalItems);
          }
          setAnalysis(finalAnalysis);
        } catch (analysisErr) {
          console.error('[DietNew] Auto-analysis FAILED:', analysisErr);
          // If parsing failed, use the raw input as a single item
          if (finalItems.length === 0 && freeformInput.trim()) {
            finalItems = [freeformInput.trim()];
          }
        }
      }

      // Ensure we have at least one item
      if (finalItems.length === 0 && freeformInput.trim()) {
        finalItems = [freeformInput.trim()];
      }

      console.log('[DietNew] About to save entry:', {
        hasAiAnalysis: !!finalAnalysis,
        aiAnalysisScore: finalAnalysis?.nutritionScore,
        itemsCount: finalItems.length
      });

      await DietService.createEntry({
        elderId,
        groupId,
        meal: meal as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        items: finalItems,
        notes: freeformInput.trim(), // Store original input as notes
        aiAnalysis: finalAnalysis || undefined,
        timestamp: new Date(),
        loggedBy: user.id,
        method: 'manual',
        createdAt: new Date()
      }, userId, userRole);

      console.log('[DietNew] Entry saved successfully');
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
              <Label htmlFor={activeElders.length === 1 ? undefined : "elderId"}>Elder</Label>
              {activeElders.length === 1 ? (
                // Single elder - show as static text (no htmlFor needed since it's not interactive)
                <div className="flex items-center h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">{activeElders[0].name}</span>
                </div>
              ) : (
                // Multiple elders - show dropdown
                <Select value={elderId} onValueChange={setElderId}>
                  <SelectTrigger id="elderId">
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

            {/* Food Description - Free-form text */}
            <div className="space-y-2">
              <Label htmlFor="foodDescription">What was eaten?</Label>
              <Textarea
                id="foodDescription"
                value={freeformInput}
                onChange={(e) => {
                  setFreeformInput(e.target.value);
                  setAnalysis(null); // Clear analysis when input changes
                }}
                placeholder="Describe the meal in your own words, e.g., 'boiled chicken with rice and steamed vegetables' or 'oatmeal with banana and honey'"
                className="min-h-[100px] placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Just type naturally - our smart system will understand and analyze the meal
              </p>
            </div>

            {/* Parsed Items (shown after analysis) */}
            {parsedItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">Identified food items:</Label>
                <div className="flex flex-wrap gap-2">
                  {parsedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full"
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
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAnalyze}
                disabled={!freeformInput.trim() || isAnalyzing}
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
                disabled={(!freeformInput.trim() && parsedItems.length === 0) || !elderId || isSaving}
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
            items={parsedItems.length > 0 ? parsedItems : [freeformInput.trim()]}
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
