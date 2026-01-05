/**
 * Offline Utilities
 * Helpers for handling offline state in the application
 */

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Check if an error is due to being offline
 */
export function isOfflineError(error: unknown): boolean {
  if (!error) return false;

  // Check for common offline error patterns
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (
      message.includes('failed to fetch') ||
      message.includes('network request failed') ||
      message.includes('networkerror') ||
      message.includes('load failed')
    ) {
      return true;
    }
  }

  // Check for Firebase offline errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('offline') ||
      message.includes('network') ||
      message.includes('unavailable') ||
      message.includes('client is offline')
    ) {
      return true;
    }
  }

  // Check navigator.onLine as fallback
  return !isOnline();
}

/**
 * Get a user-friendly error message for offline scenarios
 */
export function getOfflineErrorMessage(error: unknown): string {
  if (isOfflineError(error)) {
    return "You're offline. Please check your internet connection and try again.";
  }

  if (error instanceof Error) {
    // Return the error message but make it more user-friendly
    const message = error.message;

    // Firebase-specific errors
    if (message.includes('permission-denied')) {
      return "You don't have permission to perform this action.";
    }
    if (message.includes('not-found')) {
      return 'The requested data was not found.';
    }
    if (message.includes('already-exists')) {
      return 'This item already exists.';
    }

    return message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Execute an action only if online, otherwise show a message
 * @param action The async action to execute
 * @param offlineMessage Optional custom message to show when offline
 * @returns The result of the action or null if offline
 */
export async function executeIfOnline<T>(
  action: () => Promise<T>,
  offlineMessage?: string
): Promise<{ success: true; data: T } | { success: false; offline: boolean; message: string }> {
  if (!isOnline()) {
    return {
      success: false,
      offline: true,
      message: offlineMessage || "You're offline. This action requires an internet connection.",
    };
  }

  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    if (isOfflineError(error)) {
      return {
        success: false,
        offline: true,
        message: offlineMessage || "You're offline. This action requires an internet connection.",
      };
    }
    throw error;
  }
}

/**
 * Wrapper for fetch that handles offline gracefully
 */
export async function offlineSafeFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  if (!isOnline()) {
    throw new Error("You're offline. Please check your internet connection.");
  }

  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error("You're offline. Please check your internet connection.");
    }
    throw error;
  }
}
