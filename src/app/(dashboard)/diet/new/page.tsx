'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DietAnalysisPanel } from '@/components/ai/DietAnalysisPanel';
import { analyzeDietEntry } from '@/lib/ai/geminiService';
import { DietAnalysis } from '@/types';
import { Utensils, Plus, X, Sparkles, ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NewDietEntryPage() {
  const router = useRouter();
  const [elderName, setElderName] = useState('');
  const [meal, setMeal] = useState('breakfast');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<DietAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

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

    setIsAnalyzing(true);
    setError('');

    try {
      const result = await analyzeDietEntry({
        meal,
        items,
        elderAge: 75, // Mock age - replace with actual elder age from Firebase
        existingConditions: [] // Replace with actual conditions
      });

      setAnalysis(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!elderName.trim()) {
      setError('Please enter elder name');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one food item');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // TODO: Connect to Firebase to save diet entry
      console.log('Saving diet entry:', {
        elderName,
        meal,
        items,
        analysis,
        timestamp: new Date()
      });

      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));

      router.push('/dashboard/diet');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save meal entry. Please try again.');
      setIsSaving(false);
    }
  };

  return (
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
            Track meals and get AI-powered nutrition insights
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
            {/* Elder Name */}
            <div className="space-y-2">
              <Label htmlFor="elderName">Elder Name</Label>
              <Input
                id="elderName"
                value={elderName}
                onChange={(e) => setElderName(e.target.value)}
                placeholder="Enter name"
              />
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
                  onKeyPress={(e) => e.key === 'Enter' && addItem()}
                  placeholder="e.g., oatmeal, banana"
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
                    Get AI Analysis
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={items.length === 0 || !elderName || isSaving}
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
                AI Nutrition Analysis
              </CardTitle>
              <CardDescription>
                Add food items and click "Get AI Analysis" to receive nutrition insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  No analysis yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Add items and click "Get AI Analysis" to see nutrition insights powered by Gemini AI
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
