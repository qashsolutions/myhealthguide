/**
 * Browser detection utilities
 * Detects private/incognito browsing mode
 */

/**
 * Detects if the browser is in private/incognito mode
 * Uses multiple detection methods for different browsers
 */
export async function isIncognitoBrowser(): Promise<boolean> {
  try {
    // Method 1: FileSystem API (Chrome/Edge)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      // Chrome incognito typically has ~120MB quota limit
      if (quota && quota < 120000000) {
        return true;
      }
    }

    // Method 2: IndexedDB test (Firefox)
    if (indexedDB && /Firefox/.test(navigator.userAgent)) {
      try {
        await indexedDB.open('test');
      } catch (e) {
        return true;
      }
    }

    // Method 3: Safari private mode detection
    if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
      try {
        const testKey = 'test';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
      } catch (e) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn('Incognito detection failed:', error);
    return false;
  }
}

/**
 * Gets browser information for debugging
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  
  return {
    userAgent,
    cookiesEnabled: navigator.cookieEnabled,
    language: navigator.language,
    platform: navigator.platform,
    isChrome: /Chrome/.test(userAgent) && !/Edge/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isEdge: /Edge/.test(userAgent),
  };
}

/**
 * Checks if third-party cookies are blocked
 * This can affect authentication in some browsers
 */
export function areThirdPartyCookiesBlocked(): boolean {
  // Check if cookies are enabled at all
  if (!navigator.cookieEnabled) {
    return true;
  }

  // Additional checks could be added here
  // But for now, we rely on the basic check
  return false;
}