/**
 * Voice Input Service - Google Speech-to-Text Integration
 * Phase 3: Voice Input
 */

export interface VoiceRecordingResult {
  transcript: string;
  confidence: number;
  duration: number;
}

export interface VoiceParseResult {
  type: 'medication' | 'supplement' | 'diet';
  elderName?: string;
  itemName: string;
  dosage?: string;
  time?: string;
  meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items?: string[];
  rawTranscript: string;
}

/**
 * Start voice recording using browser's built-in speech recognition
 * For production, this will use Google Cloud Speech-to-Text API
 */
export async function startVoiceRecording(): Promise<VoiceRecordingResult> {
  // Check if browser supports speech recognition
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    throw new Error('Speech recognition not supported in this browser');
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      const duration = Date.now() - startTime;

      resolve({
        transcript,
        confidence,
        duration
      });
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.start();
  });
}

/**
 * Parse voice transcript into structured data
 * Uses pattern matching and NLP to extract information
 */
export function parseVoiceTranscript(transcript: string): VoiceParseResult | null {
  const lowerTranscript = transcript.toLowerCase();

  // Pattern: "John took Lisinopril 10mg at 9am"
  const medicationPattern = /(\w+)\s+(?:took|had|administered)\s+(\w+)\s*(\d+\s*mg)?(?:\s+at\s+)?(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))?/i;
  const medMatch = lowerTranscript.match(medicationPattern);

  if (medMatch) {
    return {
      type: 'medication',
      elderName: medMatch[1],
      itemName: medMatch[2],
      dosage: medMatch[3] || undefined,
      time: medMatch[4] || undefined,
      rawTranscript: transcript
    };
  }

  // Pattern: "Mary had breakfast: oatmeal, orange juice, toast"
  const dietPattern = /(\w+)\s+(?:had|ate)\s+(breakfast|lunch|dinner|snack)(?::\s*)?(.+)?/i;
  const dietMatch = lowerTranscript.match(dietPattern);

  if (dietMatch) {
    const itemsString = dietMatch[3] || '';
    const items = itemsString
      .split(/,|and/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    return {
      type: 'diet',
      elderName: dietMatch[1],
      itemName: dietMatch[2],
      meal: dietMatch[2] as any,
      items: items.length > 0 ? items : undefined,
      rawTranscript: transcript
    };
  }

  // Pattern: "John took vitamin D"
  const supplementPattern = /(\w+)\s+(?:took|had)\s+(.+?)(?:\s+supplement|\s+vitamin)?$/i;
  const suppMatch = lowerTranscript.match(supplementPattern);

  if (suppMatch) {
    return {
      type: 'supplement',
      elderName: suppMatch[1],
      itemName: suppMatch[2],
      rawTranscript: transcript
    };
  }

  return null;
}

/**
 * Google Cloud Speech-to-Text API integration
 * This will be used in production
 */
export async function transcribeAudioWithGoogleAPI(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('Google Cloud API key not configured');
  }

  // Convert blob to base64
  const base64Audio = await blobToBase64(audioBlob);

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: base64Audio,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to transcribe audio');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('No transcription results');
  }

  return data.results[0].alternatives[0].transcript;
}

/**
 * Helper function to convert Blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Record audio using MediaRecorder API
 */
export async function recordAudio(durationMs: number = 5000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      resolve(audioBlob);
    };

    mediaRecorder.onerror = (event) => {
      stream.getTracks().forEach(track => track.stop());
      reject(new Error('Recording error'));
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), durationMs);
  });
}
