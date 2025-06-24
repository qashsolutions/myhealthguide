import { ELDERCARE_CONFIG, VOICE_COMMANDS } from '@/lib/constants';

/**
 * Voice utilities for Web Speech API
 * Eldercare-optimized with slower speech rate
 */

// Check if browser supports speech recognition
export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for Mac Safari specifically
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  if (isSafari && isMac) {
    console.warn('Speech Recognition may have limited support on Safari/Mac');
  }
  
  return !!(
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition
  );
};

// Check if browser supports speech synthesis
export const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
};

// Get speech recognition constructor
export const getSpeechRecognition = (): any => {
  if (typeof window === 'undefined') return null;
  
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition
  );
};

// Create speech recognition instance
export const createSpeechRecognition = () => {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return null;
  
  const recognition = new SpeechRecognition();
  
  // Configure for eldercare use
  recognition.continuous = false; // Stop after single utterance
  recognition.interimResults = true; // Show results while speaking
  recognition.maxAlternatives = 3; // Multiple alternatives for better accuracy
  recognition.lang = 'en-US';
  
  return recognition;
};

// Check microphone permission status
export const checkMicrophonePermission = async (): Promise<PermissionState | null> => {
  if (!navigator.permissions) return null;
  
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (err) {
    console.warn('Cannot check microphone permission:', err);
    return null;
  }
};

// Text to speech with eldercare settings
export const speak = (
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
  }
): void => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported');
    return;
  }
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Eldercare-optimized settings
  utterance.rate = options?.rate || ELDERCARE_CONFIG.VOICE_SPEECH_RATE;
  utterance.pitch = options?.pitch || 1;
  utterance.volume = options?.volume || ELDERCARE_CONFIG.VOICE_VOLUME;
  
  if (options?.voice) {
    utterance.voice = options.voice;
  }
  
  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }
  
  // Error handling
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
  };
  
  window.speechSynthesis.speak(utterance);
};

// Get available voices
export const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([]);
      return;
    }
    
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
    } else {
      // Voices may load asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
};

// Get preferred voice for eldercare (clear, English)
export const getPreferredVoice = async (): Promise<SpeechSynthesisVoice | null> => {
  const voices = await getVoices();
  
  // Prefer US English voices
  const englishVoices = voices.filter(voice => 
    voice.lang.startsWith('en-US') || voice.lang.startsWith('en_US')
  );
  
  // Prefer female voices (often clearer for elderly)
  const femaleVoice = englishVoices.find(voice => 
    voice.name.toLowerCase().includes('female') ||
    voice.name.toLowerCase().includes('samantha') ||
    voice.name.toLowerCase().includes('victoria') ||
    voice.name.toLowerCase().includes('karen')
  );
  
  return femaleVoice || englishVoices[0] || voices[0] || null;
};

// Parse voice command
export const parseVoiceCommand = (transcript: string): {
  command: string | null;
  parameters: Record<string, any>;
} => {
  const lowerTranscript = transcript.toLowerCase().trim();
  
  // Check for known commands
  for (const cmd of VOICE_COMMANDS) {
    const commandText = cmd.command.toLowerCase();
    
    if (lowerTranscript.includes(commandText)) {
      // Extract parameters (e.g., medication name)
      const afterCommand = lowerTranscript.split(commandText)[1]?.trim();
      
      return {
        command: cmd.command,
        parameters: {
          value: afterCommand || '',
        },
      };
    }
  }
  
  // Default: treat as medication name
  return {
    command: 'Add medication',
    parameters: {
      value: transcript,
    },
  };
};

// Format medication name from voice input
export const formatMedicationName = (voiceInput: string): string => {
  // Capitalize first letter of each word
  return voiceInput
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
};

// Common medication name corrections
const MEDICATION_CORRECTIONS: Record<string, string> = {
  'asprin': 'Aspirin',
  'aspirine': 'Aspirin',
  'tylenol': 'Tylenol',
  'advil': 'Advil',
  'motrin': 'Motrin',
  'lipitor': 'Lipitor',
  'metformin': 'Metformin',
  'lisinopril': 'Lisinopril',
  'amlodipine': 'Amlodipine',
  'metoprolol': 'Metoprolol',
  'losartan': 'Losartan',
  'gabapentin': 'Gabapentin',
  'omeprazole': 'Omeprazole',
  'simvastatin': 'Simvastatin',
  'levothyroxine': 'Levothyroxine',
};

// Correct common medication misspellings
export const correctMedicationName = (name: string): string => {
  const lower = name.toLowerCase().trim();
  
  // Check exact matches
  if (MEDICATION_CORRECTIONS[lower]) {
    return MEDICATION_CORRECTIONS[lower];
  }
  
  // Check partial matches
  for (const [key, value] of Object.entries(MEDICATION_CORRECTIONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }
  
  // Return formatted original
  return formatMedicationName(name);
};