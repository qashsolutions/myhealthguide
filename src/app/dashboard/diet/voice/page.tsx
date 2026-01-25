'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { BrowserSupportAlert } from '@/components/voice/BrowserSupportAlert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Utensils, CheckCircle, ArrowLeft, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { createDietEntryOfflineAware } from '@/lib/offline';
import { cn } from '@/lib/utils';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const;

export default function VoiceDietPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableElders, isLoading: eldersLoading } = useElder();

  // Elder selection state
  const [selectedElderId, setSelectedElderId] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Parsed items state
  const [parsedItems, setParsedItems] = useState<string[]>([]);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select elder if only one available
  useEffect(() => {
    if (!eldersLoading && availableElders.length === 1 && !selectedElderId) {
      setSelectedElderId(availableElders[0].id);
    }
  }, [availableElders, eldersLoading, selectedElderId]);

  // Auto-select meal type based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      setSelectedMealType('breakfast');
    } else if (hour >= 11 && hour < 15) {
      setSelectedMealType('lunch');
    } else if (hour >= 15 && hour < 20) {
      setSelectedMealType('dinner');
    } else {
      setSelectedMealType('snack');
    }
  }, []);

  const selectedElder = useMemo(() =>
    availableElders.find(e => e.id === selectedElderId),
    [availableElders, selectedElderId]
  );

  const handleListeningStart = () => {
    setIsListening(true);
    setTranscript('');
    setError('');
    setParsedItems([]);
  };

  const handleInterimResult = (interim: string) => {
    setTranscript(interim);
  };

  const handleListeningComplete = async (finalTranscript: string) => {
    setTranscript(finalTranscript);
    setIsListening(false);

    // Auto-parse food items from transcript
    if (finalTranscript.trim()) {
      parseItems(finalTranscript);
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setIsListening(false);
  };

  // Parse food items from transcript
  const parseItems = (text: string) => {
    // Split by common delimiters: comma, "and", "with", "plus"
    const items = text
      .toLowerCase()
      .split(/,|\band\b|\bwith\b|\bplus\b|&/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      // Capitalize first letter of each item
      .map(item => item.charAt(0).toUpperCase() + item.slice(1));

    if (items.length > 0) {
      setParsedItems(items);
    } else {
      // If no delimiters found, treat entire transcript as one item
      setParsedItems([text.charAt(0).toUpperCase() + text.slice(1)]);
    }
  };

  // Remove an item from parsed list
  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit the log
  const handleSubmit = async () => {
    if (parsedItems.length === 0 || !selectedElderId || !user) {
      setError('Please add at least one food item');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const elder = availableElders.find(e => e.id === selectedElderId);
      if (!elder) throw new Error('Loved one not found');

      // Determine user role
      let userRole: 'admin' | 'caregiver' | 'member' = 'member';
      if (user.agencies && user.agencies.length > 0) {
        const agencyRole = user.agencies[0].role;
        if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') {
          userRole = 'admin';
        } else if (agencyRole === 'caregiver') {
          userRole = 'caregiver';
        }
      } else if (user.groups && user.groups.length > 0) {
        userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
      }

      const result = await createDietEntryOfflineAware({
        elderId: elder.id,
        groupId: elder.groupId,
        meal: selectedMealType,
        items: parsedItems,
        notes: '',
        voiceTranscript: transcript,
        timestamp: new Date(),
        loggedBy: user.id,
        method: 'voice',
        createdAt: new Date(),
      }, user.id, userRole);

      if (!result.success) {
        throw new Error(result.error || 'Failed to log meal');
      }

      const queuedMsg = result.queued ? ' (will sync when online)' : '';
      setSuccess(`Logged ${selectedMealType} for ${elder.name}${queuedMsg}`);
      setTranscript('');
      setParsedItems([]);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/diet');
      }, 2000);
    } catch (err: any) {
      console.error('Error logging diet:', err);
      setError(err.message || 'Failed to log meal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setParsedItems([]);
    setError('');
  };

  // Check if ready to use voice
  const canUseVoice = selectedElderId && !eldersLoading;

  return (
    <TrialExpirationGate featureName="voice diet entry">
      <EmailVerificationGate featureName="voice diet entry">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard/diet">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Voice Log
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Log meals with your voice
              </p>
            </div>
          </div>

          {/* Browser Support Alert */}
          <BrowserSupportAlert manualEntryUrl="/dashboard/diet/new" />

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2 text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Select Loved One */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-orange-600" />
                Step 1: Select Loved One
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eldersLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : availableElders.length === 0 ? (
                <p className="text-sm text-gray-500">No loved ones found.</p>
              ) : availableElders.length === 1 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <User className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">{availableElders[0].name}</span>
                  <span className="text-xs text-gray-500">(auto-selected)</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableElders.map(elder => (
                    <button
                      key={elder.id}
                      onClick={() => {
                        setSelectedElderId(elder.id);
                        setParsedItems([]);
                        setTranscript('');
                      }}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        selectedElderId === elder.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {elder.name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Meal Type */}
          {selectedElderId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Utensils className="w-4 h-4 text-orange-600" />
                  Step 2: Select Meal Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {MEAL_TYPES.map(meal => (
                    <button
                      key={meal.value}
                      onClick={() => setSelectedMealType(meal.value)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        selectedMealType === meal.value
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {meal.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Voice Input */}
          {selectedElderId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Utensils className="w-4 h-4 text-orange-600" />
                  Step 3: Say the Food Items
                </CardTitle>
                <CardDescription className="text-sm">
                  Say: &quot;eggs, toast, and orange juice&quot;
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice Input Button */}
                <div className="flex flex-col items-center py-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all mb-4 ${
                    isListening
                      ? 'bg-orange-500 animate-pulse'
                      : 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800'
                  }`}>
                    <Utensils className={`w-10 h-10 ${isListening ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} />
                  </div>

                  <VoiceRecordButton
                    onRecordingComplete={handleListeningComplete}
                    onRecordingStart={handleListeningStart}
                    onInterimResult={handleInterimResult}
                    onError={handleError}
                    isRecording={isListening}
                    size="lg"
                    className="px-6"
                    disabled={!canUseVoice}
                  />
                </div>

                {/* Transcript Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isListening ? 'Listening...' : 'What was said:'}
                  </label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value);
                      setParsedItems([]);
                    }}
                    placeholder={isListening ? 'Speak now...' : 'Your speech will appear here'}
                    className="min-h-[60px] text-base"
                    disabled={isListening}
                  />
                  {transcript && !isListening && parsedItems.length === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => parseItems(transcript)}
                    >
                      Parse Items
                    </Button>
                  )}
                </div>

                {/* Parsed Items */}
                {parsedItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Food items to log:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parsedItems.map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-sm"
                        >
                          {item}
                          <button
                            onClick={() => removeItem(index)}
                            className="ml-1 text-orange-600 hover:text-orange-800 dark:text-orange-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Confirm & Log */}
          {parsedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Step 4: Confirm & Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm">
                      <span className="text-gray-500">Loved One:</span>{' '}
                      <span className="font-medium">{selectedElder?.name}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Meal:</span>{' '}
                      <span className="font-medium capitalize">{selectedMealType}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500">Items:</span>{' '}
                      <span className="font-medium">{parsedItems.join(', ')}</span>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging...
                        </>
                      ) : (
                        'Confirm & Log'
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleClear}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Entry Link */}
          <div className="text-center">
            <Link href="/dashboard/diet/new" className="text-sm text-orange-600 hover:underline">
              Use detailed form instead
            </Link>
          </div>
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
