/**
 * Browser Support Detection for Camera API
 *
 * Camera support is generally available in all modern browsers,
 * but permission handling may vary.
 */

export interface CameraSupportInfo {
  isSupported: boolean;
  browserName: string;
  recommendation?: string;
  hasKnownIssues?: boolean;
}

/**
 * Check if the browser supports camera access
 */
export function checkCameraSupport(): CameraSupportInfo {
  // Check for MediaDevices API support
  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  // Detect browser
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browserName = 'Unknown';
  let recommendation: string | undefined;
  let hasKnownIssues = false;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    // Safari requires HTTPS for camera access
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      hasKnownIssues = true;
      recommendation = 'Safari requires HTTPS for camera access. Please access this page via HTTPS.';
    }
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
  } else {
    browserName = 'Unknown';
  }

  if (!isSupported) {
    recommendation = 'Camera access is not supported in this browser. Please try Chrome, Safari, Edge, or Firefox.';
  }

  return {
    isSupported,
    browserName,
    recommendation,
    hasKnownIssues,
  };
}

/**
 * Check if camera permission has been granted
 */
export async function checkCameraPermission(): Promise<PermissionState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return 'prompt';
    }

    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state;
  } catch (error) {
    // Some browsers don't support permissions API for camera
    console.warn('Camera permissions API not supported:', error);
    return 'prompt';
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately - we just needed to trigger permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
}

/**
 * Get available cameras
 */
export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Failed to enumerate cameras:', error);
    return [];
  }
}
