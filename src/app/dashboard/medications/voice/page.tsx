'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { VoiceTranscriptDialog } from '@/components/voice/VoiceTranscriptDialog';
import { VoiceRecordingIndicator } from '@/components/voice/VoiceRecordingIndicator';
import { BrowserSupportAlert } from '@/components/voice/BrowserSupportAlert';
import { VoiceParseResult } from '@/lib/voice/speechRecognition';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Info, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { MedicationService } from '@/lib/firebase/medications';
import { ElderService } from '@/lib/firebase/elders';

export default function VoiceMedicationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRecordingComplete = (transcriptText: string) => {
    setTranscript(transcriptText);
    setShowDialog(true);
    setIsRecording(false);
    setError('');
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setIsRecording(false);
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

      if (!elder) {
        throw new Error(`Elder "${elderName}" not found. Please add them first.`);
      }

      // Try to find medication by name
      const medications = await MedicationService.getMedicationsByElder(elder.id, elder.groupId, userId, userRole);
      const medication = medications.find(m =>
        m.name.toLowerCase().trim() === parsedData.itemName.toLowerCase().trim()
      );

      if (!medication) {
        throw new Error(`Medication "${parsedData.itemName}" not found for ${elderName}. Please add it first.`);
      }

      await MedicationService.logDose({
        medicationId: medication.id,
        groupId,
        elderId: elder.id,
        scheduledTime: new Date(),
        actualTime: new Date(),
        status: 'taken',
        notes: editedTranscript,
        method: 'voice',
        voiceTranscript: editedTranscript,
        createdAt: new Date()
      }, userId, userRole);

      setSuccess(`Successfully logged ${parsedData.itemName} for ${elderName}`);
      setShowDialog(false);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/medications');
      }, 2000);
    } catch (error: any) {
      console.error('Error logging medication:', error);
      setError(error.message || 'Failed to log medication. Please try again.');
    }
  };

  const handleRetry = () => {
    setShowDialog(false);
    setTranscript('');
    setError('');
    // Automatically start recording again
    setTimeout(() => {
      setIsRecording(true);
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/medications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Voice Medication Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Use voice to quickly log medication doses
          </p>
        </div>
      </div>

      {/* Browser Support Alert */}
      <BrowserSupportAlert manualEntryUrl="/dashboard/medications/new" />

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
            <Mic className="w-5 h-5 text-blue-600" />
            Record Medication Dose
          </CardTitle>
          <CardDescription>
            Speak naturally to log medication intake
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <p className="font-medium mb-2">How to use voice input:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Click the "Start Recording" button below</li>
                <li>Speak clearly: "[Name] took [Medication] [Dosage] at [Time]"</li>
                <li>Example: "John took Lisinopril 10mg at 9am"</li>
                <li>Review and confirm the transcription</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Recording Button */}
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center shadow-lg">
              <Mic className={`w-16 h-16 text-blue-600 dark:text-blue-400 ${isRecording ? 'animate-pulse' : ''}`} />
            </div>

            <VoiceRecordButton
              onRecordingComplete={handleRecordingComplete}
              onError={handleError}
              isRecording={isRecording}
              size="lg"
              className="px-8"
            />

            {isRecording && (
              <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
                Listening... Speak now
              </p>
            )}
          </div>

          {/* Examples */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Example phrases:
            </p>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>• "Mary took Metformin 500mg at 8am"</p>
              <p>• "John had his morning Lisinopril"</p>
              <p>• "Sarah took aspirin 81mg"</p>
            </div>
          </div>

          {/* Manual Entry Option */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3">
              Prefer manual entry?
            </p>
            <Link href="/dashboard/medications/new">
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
        onClose={() => setShowDialog(false)}
        transcript={transcript}
        onConfirm={handleConfirm}
        onRetry={handleRetry}
      />

      {/* Recording Indicator */}
      <VoiceRecordingIndicator isRecording={isRecording} />
    </div>
  );
}
