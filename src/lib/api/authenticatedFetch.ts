/**
 * Authenticated Fetch Utility
 *
 * Provides helper functions for making authenticated API requests
 * by automatically including the Firebase ID token in the Authorization header.
 */

import { getAuth } from 'firebase/auth';

/**
 * Get the current user's Firebase ID token
 * @returns The ID token string or null if not authenticated
 */
export async function getIdToken(): Promise<string | null> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    console.warn('[getIdToken] No authenticated user found');
    return null;
  }

  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('[getIdToken] Error getting ID token:', error);
    return null;
  }
}

/**
 * Create headers object with Authorization bearer token
 * @param additionalHeaders Optional additional headers to include
 * @returns Headers object with Authorization header
 */
export async function getAuthHeaders(
  additionalHeaders?: Record<string, string>
): Promise<HeadersInit> {
  const token = await getIdToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated fetch request
 * Automatically includes the Firebase ID token in the Authorization header
 *
 * @param url The URL to fetch
 * @param options Fetch options (method, body, etc.)
 * @returns The fetch Response
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getIdToken();

  if (!token) {
    throw new Error('Not authenticated. Please sign in to continue.');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Make an authenticated POST request with JSON body
 *
 * @param url The URL to post to
 * @param body The request body (will be JSON stringified)
 * @returns The parsed JSON response
 */
export async function authenticatedPost<T = any>(
  url: string,
  body: Record<string, any>
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Make an authenticated GET request
 *
 * @param url The URL to fetch (can include query parameters)
 * @returns The parsed JSON response
 */
export async function authenticatedGet<T = any>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
