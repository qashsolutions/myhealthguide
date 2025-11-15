/**
 * Browser Support Detection for Web Speech API
 */

export interface BrowserSupportInfo {
  isSupported: boolean;
  browserName: string;
  recommendation?: string;
}

/**
 * Check if the browser supports Web Speech API
 */
export function checkVoiceInputSupport(): BrowserSupportInfo {
  // Check for Web Speech API support
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  // Detect browser
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browserName = 'Unknown';
  let recommendation: string | undefined;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    recommendation = 'Voice input requires Chrome, Safari, or Edge. Please switch browsers or use manual entry.';
  } else {
    browserName = 'Unknown';
    recommendation = 'Voice input may not be supported in this browser. Please try Chrome, Safari, or Edge.';
  }

  return {
    isSupported,
    browserName,
    recommendation: !isSupported ? recommendation : undefined
  };
}

/**
 * Check if microphone permission has been granted
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return 'prompt';
    }

    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (error) {
    // Some browsers don't support permissions API
    console.warn('Permissions API not supported:', error);
    return 'prompt';
  }
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just needed to trigger permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
}
