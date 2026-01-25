'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { VoiceTranscriptDialog } from '@/components/voice/VoiceTranscriptDialog';
import { VoiceRecordingIndicator } from '@/components/voice/VoiceRecordingIndicator';
import { BrowserSupportAlert } from '@/components/voice/BrowserSupportAlert';
import { DietAnalysisPanel } from '@/components/ai/DietAnalysisPanel';
import { VoiceParseResult } from '@/lib/voice/speechRecognition';
import { analyzeDietEntry } from '@/lib/ai/geminiService';
import { DietAnalysis } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Utensils, Info, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TrialExpirationGate } from '@/components/auth/TrialExpirationGate';
import { DietService } from '@/lib/firebase/diet';
import { ElderService } from '@/lib/firebase/elders';
import { createDietEntryOfflineAware } from '@/lib/offline';

export default function VoiceDietPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [analysis, setAnalysis] = useState<DietAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRecordingStart = () => {
    setIsRecording(true);
    setInterimTranscript('');
    setError('');
  };

  const handleInterimResult = (interim: string) => {
    setInterimTranscript(interim);
  };

  const handleRecordingComplete = (transcriptText: string) => {
    setTranscript(transcriptText);
    setInterimTranscript('');
    setShowDialog(true);
    setIsRecording(false);
    setError('');
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setIsRecording(false);
    setInterimTranscript('');
  };

  const handleGetAnalysis = async (parsedData: VoiceParseResult) => {
    if (!parsedData.items || parsedData.items.length === 0) {
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

    // Try to find elder ID by name
    const elderName = parsedData.elderName || 'Unknown';
    const elders = await ElderService.getEldersByGroup(groupId, userId, userRole);
    const elder = elders.find(e => e.name.toLowerCase().trim() === elderName.toLowerCase().trim());
    const elderId = elder?.id || elderName;

    setIsAnalyzing(true);
    try {
      const result = await analyzeDietEntry({
        meal: parsedData.meal || 'meal',
        items: parsedData.items,
        elderAge: 75, // Mock - replace with actual elder age
        existingConditions: []
      }, userId, userRole, groupId, elderId);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing diet:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async (parsedData: VoiceParseResult, editedTranscript: string) => {
    try {
      if (!user) {
        throw new Error('You must be signed in');
      }

      const groupId = user.groups[0]?.groupId;
      if (!groupId) {
        throw new Error('You must be part of a group');
      }

      const userId = user.id;
      const userRole = user.groups[0]?.role as 'admin' | 'caregiver' | 'member';

      if (!userRole) {
        throw new Error('Unable to determine user role');
      }

      // Try to find elder ID by name
      const elderName = parsedData.elderName || 'Unknown';
      const elders = await ElderService.getEldersByGroup(groupId, userId, userRole);
      const elder = elders.find(e => e.name.toLowerCase().trim() === elderName.toLowerCase().trim());
      const elderId = elder?.id || elderName; // Fallback to name if not found

      const result = await createDietEntryOfflineAware({
        elderId,
        groupId,
        meal: parsedData.meal || 'snack',
        items: parsedData.items || [],
        notes: '',
        voiceTranscript: editedTranscript,
        aiAnalysis: analysis || undefined,
        timestamp: new Date(),
        loggedBy: user.id,
        method: 'voice',
        createdAt: new Date()
      }, userId, userRole);

      if (!result.success) {
        throw new Error(result.error || 'Failed to log meal');
      }

      const mealType = parsedData.meal || 'meal';
      const queuedMsg = result.queued ? ' (will sync when online)' : '';
      setSuccess(`Successfully logged ${mealType} for ${elderName}${queuedMsg}`);
      setShowDialog(false);
      setAnalysis(null);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/diet');
      }, 2000);
    } catch (error: any) {
      console.error('Error logging diet entry:', error);
      setError(error.message || 'Failed to log meal. Please try again.');
    }
  };

  const handleRetry = () => {
    setShowDialog(false);
    setTranscript('');
    setError('');
    setAnalysis(null);
    setTimeout(() => {
      setIsRecording(true);
    }, 500);
  };

  return (
    <TrialExpirationGate featureName="voice diet entry">
      <EmailVerificationGate featureName="voice diet entry">
        <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/diet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Voice Meal Log
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Use voice to quickly log meals and food intake
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
          <AlertDescription className="ml-2 text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-600" />
            Record Meal Entry
          </CardTitle>
          <CardDescription>
            Speak naturally to log meals and food items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <p className="font-medium mb-2">How to use voice input:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Click the &quot;Voice Input&quot; button below</li>
                <li>Speak clearly: &quot;[Name] had [Meal]: [food items]&quot;</li>
                <li>Example: &quot;Mary had breakfast: oatmeal, orange juice, and toast&quot;</li>
                <li>Review and confirm the transcription</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Recording Button */}
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isRecording
                ? 'bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800 animate-pulse'
                : 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800'
            }`}>
              <Utensils className={`w-16 h-16 ${isRecording ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>

            <VoiceRecordButton
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={handleRecordingStart}
              onInterimResult={handleInterimResult}
              onError={handleError}
              isRecording={isRecording}
              size="lg"
              className="px-8"
            />

            {isRecording && (
              <div className="text-center space-y-2">
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium animate-pulse">
                  Listening... Speak now
                </p>
                {interimTranscript && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 max-w-xs">
                    &quot;{interimTranscript}&quot;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Examples */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Example phrases:
            </p>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>• &quot;John had breakfast: eggs, toast, and coffee&quot;</p>
              <p>• &quot;Mary had lunch: chicken salad and water&quot;</p>
              <p>• &quot;Sarah ate dinner: pasta and vegetables&quot;</p>
              <p>• &quot;Tom had a snack: apple and crackers&quot;</p>
            </div>
          </div>

          {/* Manual Entry Option */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3">
              Prefer manual entry?
            </p>
            <Link href="/dashboard/diet/new">
              <Button variant="outline" className="w-full">
                Use Manual Entry Form
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Dialog */}
      <VoiceTranscriptDialog
        open={showDialog}
        onClose={() => {
          setShowDialog(false);
          setAnalysis(null);
        }}
        transcript={transcript}
        onConfirm={handleConfirm}
        onRetry={handleRetry}
      />

        {/* Recording Indicator */}
        <VoiceRecordingIndicator isRecording={isRecording} />
        </div>
      </EmailVerificationGate>
    </TrialExpirationGate>
  );
}
