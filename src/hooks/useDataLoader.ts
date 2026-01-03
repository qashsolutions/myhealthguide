/**
 * Data Loader Hook
 *
 * Generic hook for loading data with consistent loading, error, and data state management.
 * Reduces boilerplate across dashboard pages that follow the same pattern.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data: medications, loading, error, reload } = useDataLoader({
 *   fetcher: () => MedicationService.getMedicationsByElder(elderId, groupId, userId, role),
 *   dependencies: [elderId, groupId, userId],
 *   ready: !!elderId && !!userId,
 * });
 *
 * // With transform
 * const { data: activeMedications } = useDataLoader({
 *   fetcher: () => MedicationService.getMedicationsByElder(...),
 *   transform: (meds) => meds.filter(m => !m.endDate || new Date(m.endDate) > new Date()),
 *   dependencies: [elderId],
 *   ready: !!elderId,
 * });
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface UseDataLoaderOptions<T> {
  /**
   * Async function that fetches the data
   */
  fetcher: () => Promise<T>;

  /**
   * Dependencies that trigger a refetch when changed
   * Similar to useEffect dependencies
   */
  dependencies?: any[];

  /**
   * Condition that must be true before fetching
   * If false, data is set to defaultValue and loading is false
   * @default true
   */
  ready?: boolean;

  /**
   * Optional transform function applied to fetched data
   */
  transform?: (data: T) => T;

  /**
   * Default value when not ready or on error
   * @default [] for arrays, null otherwise
   */
  defaultValue?: T;

  /**
   * Whether to fetch immediately on mount
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Error message prefix for logging
   */
  errorPrefix?: string;

  /**
   * Callback when fetch completes successfully
   */
  onSuccess?: (data: T) => void;

  /**
   * Callback when fetch fails
   */
  onError?: (error: Error) => void;
}

export interface UseDataLoaderReturn<T> {
  /**
   * The loaded data
   */
  data: T;

  /**
   * Whether data is currently being fetched
   */
  loading: boolean;

  /**
   * Error message if fetch failed
   */
  error: string | null;

  /**
   * Manually trigger a reload
   */
  reload: () => Promise<void>;

  /**
   * Reset to initial state
   */
  reset: () => void;

  /**
   * Whether data has been loaded at least once
   */
  hasLoaded: boolean;
}

/**
 * Generic hook for loading data with consistent state management
 */
export function useDataLoader<T>(
  options: UseDataLoaderOptions<T>
): UseDataLoaderReturn<T> {
  const {
    fetcher,
    dependencies = [],
    ready = true,
    transform,
    defaultValue,
    fetchOnMount = true,
    errorPrefix = 'Error loading data',
    onSuccess,
    onError,
  } = options;

  // Infer default value based on type (assume array if not provided)
  // Memoize to prevent re-renders
  const inferredDefault = useMemo(
    () => (defaultValue !== undefined ? defaultValue : []) as T,
    [defaultValue]
  );

  const [data, setData] = useState<T>(inferredDefault);
  const [loading, setLoading] = useState(fetchOnMount && ready);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    // If not ready, reset to default state
    if (!ready) {
      setData(inferredDefault);
      setLoading(false);
      setError(null);
      return;
    }

    // Generate a unique ID for this fetch to handle race conditions
    const fetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      // Check if this is still the latest fetch and component is mounted
      if (!isMounted.current || fetchId !== fetchIdRef.current) {
        return;
      }

      // Apply transform if provided
      const transformedData = transform ? transform(result) : result;
      setData(transformedData);
      setHasLoaded(true);
      onSuccess?.(transformedData);
    } catch (err: any) {
      // Check if this is still the latest fetch and component is mounted
      if (!isMounted.current || fetchId !== fetchIdRef.current) {
        return;
      }

      const errorMessage = err.message || 'Unknown error';
      console.error(`${errorPrefix}:`, err);
      setError(errorMessage);
      onError?.(err);
    } finally {
      if (isMounted.current && fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fetcher, transform, errorPrefix, ...dependencies]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (fetchOnMount) {
      fetchData();
    }
  }, [fetchData, fetchOnMount]);

  const reload = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(inferredDefault);
    setLoading(false);
    setError(null);
    setHasLoaded(false);
  }, [inferredDefault]);

  return {
    data,
    loading,
    error,
    reload,
    reset,
    hasLoaded,
  };
}

/**
 * Simplified version for elder-specific data loading
 * Automatically handles the common pattern of loading data for a selected elder
 *
 * @example
 * ```tsx
 * const { data: medications, loading, error } = useElderDataLoader({
 *   fetcher: (elder, user, role) =>
 *     MedicationService.getMedicationsByElder(elder.id, elder.groupId, user.id, role),
 * });
 * ```
 */
export interface UseElderDataLoaderOptions<T> {
  /**
   * Fetcher that receives elder, user, and role
   */
  fetcher: (
    elder: { id: string; groupId: string; name: string },
    user: { id: string },
    role: 'admin' | 'caregiver' | 'member'
  ) => Promise<T>;

  /**
   * The selected elder object
   */
  elder: { id: string; groupId: string; name: string } | null;

  /**
   * The authenticated user
   */
  user: { id: string; agencies?: any[]; groups?: any[] } | null;

  /**
   * Optional transform function
   */
  transform?: (data: T) => T;

  /**
   * Additional dependencies beyond elder and user
   */
  extraDependencies?: any[];

  /**
   * Error message prefix
   */
  errorPrefix?: string;
}

/**
 * Determine user's role from their memberships
 * This follows the same logic used across dashboard pages
 */
function determineUserRole(user: { agencies?: any[]; groups?: any[] } | null): 'admin' | 'caregiver' | 'member' {
  if (!user) return 'member';

  // Check agency role first (higher priority)
  const agencyRole = user.agencies?.[0]?.role;
  if (agencyRole === 'super_admin' || agencyRole === 'caregiver_admin') return 'admin';
  if (agencyRole === 'caregiver') return 'caregiver';

  // Check group role
  const groupRole = user.groups?.[0]?.role;
  if (groupRole === 'admin') return 'admin';

  return 'member';
}

export function useElderDataLoader<T>(
  options: UseElderDataLoaderOptions<T>
): UseDataLoaderReturn<T> {
  const {
    fetcher,
    elder,
    user,
    transform,
    extraDependencies = [],
    errorPrefix = 'Error loading data',
  } = options;

  const role = determineUserRole(user);

  return useDataLoader({
    fetcher: () => fetcher(elder!, user!, role),
    dependencies: [elder?.id, elder?.groupId, user?.id, role, ...extraDependencies],
    ready: !!elder && !!user,
    transform,
    errorPrefix,
    defaultValue: [] as T,
  });
}
