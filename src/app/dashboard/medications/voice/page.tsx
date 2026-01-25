'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecordButton } from '@/components/voice/VoiceRecordButton';
import { BrowserSupportAlert } from '@/components/voice/BrowserSupportAlert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, CheckCircle, ArrowLeft, Loader2, User, Pill } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useElder } from '@/contexts/ElderContext';
import { MedicationService } from '@/lib/firebase/medications';
import { logMedicationDoseOfflineAware } from '@/lib/offline';
import { cn } from '@/lib/utils';

interface Medication {
  id: string;
  name: string;
  dosage?: string;
}

export default function VoiceMedicationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableElders, isLoading: eldersLoading } = useElder();

  // Elder selection state
  const [selectedElderId, setSelectedElderId] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // AI parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parsedMedication, setParsedMedication] = useState<{
    id: string;
    name: string;
    confidence: string;
  } | null>(null);

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

  // Load medications when elder is selected
  useEffect(() => {
    async function loadMedications() {
      if (!selectedElderId || !user) return;

      setMedicationsLoading(true);
      setMedications([]);
      setParsedMedication(null);

      try {
        const elder = availableElders.find(e => e.id === selectedElderId);
        if (!elder) return;

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

        const meds = await MedicationService.getMedicationsByElder(
          elder.id,
          elder.groupId,
          user.id,
          userRole
        );

        setMedications(meds.map(m => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
        })));
      } catch (err) {
        console.error('Error loading medications:', err);
        setError('Failed to load medications');
      } finally {
        setMedicationsLoading(false);
      }
    }

    loadMedications();
  }, [selectedElderId, user, availableElders]);

  const selectedElder = useMemo(() =>
    availableElders.find(e => e.id === selectedElderId),
    [availableElders, selectedElderId]
  );

  const handleListeningStart = () => {
    setIsListening(true);
    setTranscript('');
    setError('');
    setParsedMedication(null);
  };

  const handleInterimResult = (interim: string) => {
    setTranscript(interim);
  };

  const handleListeningComplete = async (finalTranscript: string) => {
    setTranscript(finalTranscript);
    setIsListening(false);

    // Auto-parse if we have transcript and medications
    if (finalTranscript.trim() && medications.length > 0) {
      await parseMedication(finalTranscript);
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setIsListening(false);
  };

  // Parse medication using AI
  const parseMedication = async (text: string) => {
    if (!text.trim() || medications.length === 0) return;

    setIsParsing(true);
    setError('');
    setParsedMedication(null);

    try {
      const response = await fetch('/api/voice/parse-medication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          medications,
          elderName: selectedElder?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse medication');
      }

      const result = await response.json();

      if (result.medicationId && result.confidence !== 'none') {
        setParsedMedication({
          id: result.medicationId,
          name: result.medicationName,
          confidence: result.confidence,
        });
      } else {
        setError(`Could not match "${text}" to any medication. Please select manually or try again.`);
      }
    } catch (err) {
      console.error('Parse error:', err);
      // Fallback: try simple match
      const simpleMatch = medications.find(m =>
        text.toLowerCase().includes(m.name.toLowerCase()) ||
        m.name.toLowerCase().includes(text.toLowerCase())
      );

      if (simpleMatch) {
        setParsedMedication({
          id: simpleMatch.id,
          name: simpleMatch.name,
          confidence: 'medium',
        });
      } else if (medications.length === 1) {
        // Only one medication - auto-select
        setParsedMedication({
          id: medications[0].id,
          name: medications[0].name,
          confidence: 'low',
        });
      } else {
        setError('Could not identify medication. Please select manually.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Manual medication selection
  const handleSelectMedication = (med: Medication) => {
    setParsedMedication({
      id: med.id,
      name: med.name,
      confidence: 'high',
    });
    setError('');
  };

  // Submit the log
  const handleSubmit = async () => {
    if (!parsedMedication || !selectedElderId || !user) {
      setError('Please select a medication first');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const elder = availableElders.find(e => e.id === selectedElderId);
      if (!elder) throw new Error('Elder not found');

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

      const result = await logMedicationDoseOfflineAware({
        medicationId: parsedMedication.id,
        groupId: elder.groupId,
        elderId: elder.id,
        scheduledTime: new Date(),
        actualTime: new Date(),
        status: 'taken',
        notes: transcript || `Logged via voice: ${parsedMedication.name}`,
        method: 'voice',
        voiceTranscript: transcript,
        loggedBy: user.id,
        createdAt: new Date(),
      }, user.id, userRole);

      if (!result.success) {
        throw new Error(result.error || 'Failed to log medication');
      }

      const queuedMsg = result.queued ? ' (will sync when online)' : '';
      setSuccess(`Logged ${parsedMedication.name} for ${elder.name}${queuedMsg}`);
      setTranscript('');
      setParsedMedication(null);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/medications');
      }, 2000);
    } catch (err: any) {
      console.error('Error logging medication:', err);
      setError(err.message || 'Failed to log medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setParsedMedication(null);
    setError('');
  };

  // Check if ready to use voice
  const canUseVoice = selectedElderId && medications.length > 0 && !medicationsLoading;

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
            Log medication with your voice
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

      {/* Step 1: Select Loved One */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-blue-600" />
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
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <User className="w-4 h-4 text-blue-600" />
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
                    setParsedMedication(null);
                    setTranscript('');
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    selectedElderId === elder.id
                      ? 'bg-blue-600 text-white'
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

      {/* Step 2: Voice Input */}
      {selectedElderId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="w-4 h-4 text-blue-600" />
              Step 2: Say the Medication
            </CardTitle>
            <CardDescription className="text-sm">
              {medicationsLoading
                ? 'Loading medications...'
                : medications.length === 0
                  ? 'No medications found for this loved one'
                  : `Say: "${medications[0]?.name || 'medication name'}"`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {medicationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : medications.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-3">
                  Add medications for {selectedElder?.name} first
                </p>
                <Link href="/dashboard/medications/new">
                  <Button size="sm">Add Medication</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Voice Input Button */}
                <div className="flex flex-col items-center py-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all mb-4 ${
                    isListening
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800'
                  }`}>
                    <Mic className={`w-10 h-10 ${isListening ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
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
                    {isListening ? 'Listening...' : isParsing ? 'Matching medication...' : 'What was said:'}
                  </label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value);
                      setParsedMedication(null);
                    }}
                    placeholder={isListening ? 'Speak now...' : 'Your speech will appear here'}
                    className="min-h-[60px] text-base"
                    disabled={isListening || isParsing}
                  />
                  {transcript && !isListening && !isParsing && !parsedMedication && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => parseMedication(transcript)}
                    >
                      Match Medication
                    </Button>
                  )}
                </div>

                {/* Parsing Indicator */}
                {isParsing && (
                  <div className="flex items-center justify-center gap-2 py-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Matching to medications...</span>
                  </div>
                )}

                {/* Parsed Result */}
                {parsedMedication && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">
                        Matched: {parsedMedication.name}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Confidence: {parsedMedication.confidence}
                    </p>
                  </div>
                )}

                {/* Manual Selection (when parsing fails or for correction) */}
                {!parsedMedication && !isParsing && medications.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Or select manually:</p>
                    <div className="flex flex-wrap gap-2">
                      {medications.slice(0, 6).map(med => (
                        <button
                          key={med.id}
                          onClick={() => handleSelectMedication(med)}
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          {med.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm & Log */}
      {parsedMedication && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Step 3: Confirm & Log
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
                  <span className="text-gray-500">Medication:</span>{' '}
                  <span className="font-medium">{parsedMedication.name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="font-medium text-green-600">Taken</span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
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
        <Link href="/dashboard/medications/new" className="text-sm text-blue-600 hover:underline">
          Use detailed form instead
        </Link>
      </div>
    </div>
  );
}
