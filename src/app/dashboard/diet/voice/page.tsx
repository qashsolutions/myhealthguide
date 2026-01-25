'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { BrowserSupportAlert } from '@/components/voice/BrowserSupportAlert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Utensils, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { createDietEntryOfflineAware } from '@/lib/offline';

export default function VoiceDietPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableElders, isLoading: eldersLoading } = useElder();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleListeningStart = () => {
    setIsListening(true);
    setTranscript('');
    setError('');
  };

  const handleInterimResult = (interim: string) => {
    setTranscript(interim);
  };

  const handleListeningComplete = (finalTranscript: string) => {
    setTranscript(finalTranscript);
    setIsListening(false);
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setIsListening(false);
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      setError('Please speak or type a meal entry');
      return;
    }

    if (eldersLoading) {
      setError('Loading loved ones... please wait');
      return;
    }

    if (availableElders.length === 0) {
      setError('No loved ones found. Please add a loved one first.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (!user) {
        throw new Error('You must be signed in');
      }

      const userId = user.id;

      // Determine user role - check agency membership first, then group membership
      let userRole: 'admin' | 'caregiver' | 'member' = 'member';
      if (user.agencies && user.agencies.length > 0) {
        const agencyRole = user.agencies[0].role;
        if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') {
          userRole = 'admin';
        } else if (agencyRole === 'caregiver') {
          userRole = 'caregiver';
        } else {
          userRole = 'member';
        }
      } else if (user.groups && user.groups.length > 0) {
        userRole = user.groups[0].role as 'admin' | 'caregiver' | 'member';
      }

      // Simple parsing: try to extract name, meal type, and items
      // Format expected: "[Name] had [meal]: [items]" or "[Name] ate [items]"
      const text = transcript.toLowerCase();

      // Try to match patterns
      const hadMealMatch = text.match(/^(\w+)\s+had\s+(breakfast|lunch|dinner|snack)[\s:]+(.+)/i);
      const ateMatch = text.match(/^(\w+)\s+(?:ate|had)\s+(.+)/i);

      let elderName = '';
      let mealType = 'meal';
      let items: string[] = [];

      if (hadMealMatch) {
        elderName = hadMealMatch[1].trim();
        mealType = hadMealMatch[2].toLowerCase();
        items = hadMealMatch[3].split(/,|and/).map(s => s.trim()).filter(Boolean);
      } else if (ateMatch) {
        elderName = ateMatch[1].trim();
        items = ateMatch[2].split(/,|and/).map(s => s.trim()).filter(Boolean);
      } else {
        throw new Error('Could not understand. Please use format: "[Name] had breakfast: eggs, toast"');
      }

      // Find elder from available elders (provided by ElderContext - already filtered for user's access)
      const elder = availableElders.find(e =>
        e.name.toLowerCase().includes(elderName.toLowerCase())
      );

      if (!elder) {
        const availableNames = availableElders.map(e => e.name).join(', ');
        throw new Error(`"${elderName}" not found. Available: ${availableNames || 'none'}`);
      }

      // Use elder's groupId for logging
      const groupId = elder.groupId;

      const result = await createDietEntryOfflineAware({
        elderId: elder.id,
        groupId,
        meal: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        items,
        notes: '',
        voiceTranscript: transcript,
        timestamp: new Date(),
        loggedBy: userId,
        method: 'voice',
        createdAt: new Date()
      }, userId, userRole);

      if (!result.success) {
        throw new Error(result.error || 'Failed to log meal');
      }

      const queuedMsg = result.queued ? ' (will sync when online)' : '';
      setSuccess(`Logged ${mealType} for ${elder.name}${queuedMsg}`);
      setTranscript('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/diet');
      }, 2000);
    } catch (error: any) {
      console.error('Error logging diet:', error);
      setError(error.message || 'Failed to log meal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setError('');
  };

  // Show available loved one names as hint
  const elderNames = availableElders.map(e => e.name).join(', ');

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
                Say who ate what meal
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

          {/* Main Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="w-5 h-5 text-orange-600" />
                Log Meal
              </CardTitle>
              <CardDescription className="text-sm">
                {elderNames
                  ? `Say: "${availableElders[0]?.name || 'Name'} had breakfast: eggs and toast"`
                  : 'Loading loved ones...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voice Input Button + Icon */}
              <div className="flex flex-col items-center py-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all mb-4 ${
                  isListening
                    ? 'bg-orange-500 animate-pulse'
                    : 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800'
                }`}>
                  <Utensils className={`w-12 h-12 ${isListening ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>

                <VoiceRecordButton
                  onRecordingComplete={handleListeningComplete}
                  onRecordingStart={handleListeningStart}
                  onInterimResult={handleInterimResult}
                  onError={handleError}
                  isRecording={isListening}
                  size="lg"
                  className="px-6"
                />
              </div>

              {/* Editable Transcript Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isListening ? 'Listening...' : 'What was said (edit if needed):'}
                </label>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={isListening ? 'Speak now...' : 'Your speech will appear here, or type manually'}
                  className="min-h-[80px] text-base"
                  disabled={isListening}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!transcript.trim() || isSubmitting || isListening || eldersLoading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    'Log Meal'
                  )}
                </Button>
                {transcript && !isListening && (
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Manual Entry Link */}
              <div className="pt-2 text-center">
                <Link href="/dashboard/diet/new" className="text-sm text-orange-600 hover:underline">
                  Use detailed form instead
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
