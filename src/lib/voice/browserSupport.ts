/**
 * Browser Support Detection for Web Speech API
 *
 * Note: Web Speech API support varies by browser:
 * - Chrome: Full support (uses Google's speech recognition)
 * - Safari: Full support (uses Apple's speech recognition)
 * - Edge: Partial support (may require online connection, can be unreliable)
 * - Firefox: No support for speech recognition
 */

export interface BrowserSupportInfo {
  isSupported: boolean;
  browserName: string;
  recommendation?: string;
  hasKnownIssues?: boolean;
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
  let hasKnownIssues = false;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    // Edge has known issues with Web Speech API - it may not work reliably
    hasKnownIssues = true;
    if (isSupported) {
      recommendation = 'Voice input in Edge may be unreliable. For best results, try Chrome or Safari.';
    }
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    recommendation = 'Voice input requires Chrome, Safari, or Edge. Please switch browsers or use text search.';
  } else {
    browserName = 'Unknown';
    recommendation = 'Voice input may not be supported in this browser. Please try Chrome, Safari, or Edge.';
  }

  return {
    isSupported,
    browserName,
    recommendation: !isSupported || hasKnownIssues ? recommendation : undefined,
    hasKnownIssues
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
