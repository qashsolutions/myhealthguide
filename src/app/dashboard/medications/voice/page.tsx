'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { BrowserSupportAlert } from '@/components/voice/BrowserSupportAlert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { MedicationService } from '@/lib/firebase/medications';
import { ElderService } from '@/lib/firebase/elders';
import { logMedicationDoseOfflineAware } from '@/lib/offline';

export default function VoiceMedicationPage() {
  const router = useRouter();
  const { user } = useAuth();
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
      setError('Please speak or type a medication entry');
      return;
    }

    setIsSubmitting(true);
    setError('');

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

      // Simple parsing: try to extract name and medication from transcript
      // Format expected: "[Name] took [Medication]..."
      const text = transcript.toLowerCase();
      const tookMatch = text.match(/^(\w+)\s+took\s+(.+?)(?:\s+at|\s+\d|$)/i);
      const hadMatch = text.match(/^(\w+)\s+had\s+(?:his|her|their)?\s*(.+?)(?:\s+at|\s+\d|$)/i);

      const match = tookMatch || hadMatch;
      if (!match) {
        throw new Error('Could not understand. Please use format: "[Name] took [Medication]"');
      }

      const elderName = match[1].trim();
      const medicationName = match[2].trim().replace(/\s*(morning|evening|daily)\s*/gi, '').trim();

      // Find elder
      const elders = await ElderService.getEldersByGroup(groupId, userId, userRole);
      const elder = elders.find(e => e.name.toLowerCase().includes(elderName.toLowerCase()));

      if (!elder) {
        throw new Error(`"${elderName}" not found. Please check the name.`);
      }

      // Find medication
      const medications = await MedicationService.getMedicationsByElder(elder.id, elder.groupId, userId, userRole);
      const medication = medications.find(m =>
        m.name.toLowerCase().includes(medicationName.toLowerCase()) ||
        medicationName.toLowerCase().includes(m.name.toLowerCase())
      );

      if (!medication) {
        throw new Error(`Medication "${medicationName}" not found for ${elder.name}.`);
      }

      const result = await logMedicationDoseOfflineAware({
        medicationId: medication.id,
        groupId,
        elderId: elder.id,
        scheduledTime: new Date(),
        actualTime: new Date(),
        status: 'taken',
        notes: transcript,
        method: 'voice',
        voiceTranscript: transcript,
        loggedBy: userId,
        createdAt: new Date()
      }, userId, userRole);

      if (!result.success) {
        throw new Error(result.error || 'Failed to log medication');
      }

      const queuedMsg = result.queued ? ' (will sync when online)' : '';
      setSuccess(`Logged ${medication.name} for ${elder.name}${queuedMsg}`);
      setTranscript('');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/medications');
      }, 2000);
    } catch (error: any) {
      console.error('Error logging medication:', error);
      setError(error.message || 'Failed to log medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setError('');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/medications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Voice Log
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Say who took what medication
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
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="w-5 h-5 text-blue-600" />
            Log Medication
          </CardTitle>
          <CardDescription className="text-sm">
            Example: &quot;John took Lisinopril 10mg&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Input Button + Mic Icon */}
          <div className="flex flex-col items-center py-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all mb-4 ${
              isListening
                ? 'bg-blue-500 animate-pulse'
                : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800'
            }`}>
              <Mic className={`w-12 h-12 ${isListening ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
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
              disabled={!transcript.trim() || isSubmitting || isListening}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging...
                </>
              ) : (
                'Log Medication'
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
            <Link href="/dashboard/medications/new" className="text-sm text-blue-600 hover:underline">
              Use detailed form instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
