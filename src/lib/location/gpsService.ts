/**
 * GPS Location Service
 *
 * Handles GPS capture and distance calculation for shift verification.
 * Uses the Haversine formula for accurate distance calculation.
 */

import {
  GPSCapture,
  GeoCoordinates,
  GPS_VERIFIED_RADIUS_METERS,
} from '@/types/timesheet';

// ============= GPS Capture =============

export interface GPSCaptureResult {
  success: boolean;
  gps?: GPSCapture;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
}

/**
 * Capture current GPS coordinates from the device
 */
export async function captureGPS(
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }
): Promise<GPSCaptureResult> {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    return {
      success: false,
      error: 'Geolocation is not supported by this browser',
      errorCode: 'NOT_SUPPORTED',
    };
  }

  const { enableHighAccuracy = true, timeout = 10000, maximumAge = 0 } = options || {};

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          gps: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp),
          },
        });
      },
      (error) => {
        let errorCode: GPSCaptureResult['errorCode'];
        let errorMessage: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorCode = 'PERMISSION_DENIED';
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorCode = 'POSITION_UNAVAILABLE';
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorCode = 'TIMEOUT';
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorCode = 'POSITION_UNAVAILABLE';
            errorMessage = 'An unknown error occurred while getting location.';
        }

        resolve({
          success: false,
          error: errorMessage,
          errorCode,
        });
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  });
}

// ============= Distance Calculation =============

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  point1: GeoCoordinates,
  point2: GeoCoordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============= Location Verification =============

export interface LocationVerificationResult {
  verified: boolean;
  distanceMeters: number;
  gpsAccuracy: number;
  message: string;
}

/**
 * Verify if GPS location is within acceptable radius of elder's address
 */
export function verifyLocation(
  gps: GPSCapture,
  elderCoordinates: GeoCoordinates,
  radiusMeters: number = GPS_VERIFIED_RADIUS_METERS
): LocationVerificationResult {
  const distance = calculateDistance(
    { latitude: gps.latitude, longitude: gps.longitude },
    elderCoordinates
  );

  const verified = distance <= radiusMeters;

  let message: string;
  if (verified) {
    message = `Location verified (${Math.round(distance)}m from elder's address)`;
  } else if (distance <= 50) {
    message = `Location is ${Math.round(distance)}m away (requires override)`;
  } else if (distance <= 500) {
    message = `Location is ${Math.round(distance)}m away - please verify you're at the correct location`;
  } else if (distance <= 1000) {
    message = `Location is ${(distance / 1000).toFixed(1)}km away`;
  } else {
    message = `Location is ${(distance / 1000).toFixed(1)}km away - significant distance from elder's address`;
  }

  return {
    verified,
    distanceMeters: Math.round(distance),
    gpsAccuracy: gps.accuracy,
    message,
  };
}

// ============= Address Geocoding =============

export interface GeocodeResult {
  success: boolean;
  coordinates?: GeoCoordinates;
  formattedAddress?: string;
  error?: string;
}

/**
 * Geocode an address to get coordinates
 * Uses Google Geocoding API
 */
export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zipCode: string,
  country: string = 'USA'
): Promise<GeocodeResult> {
  const address = `${street}, ${city}, ${state} ${zipCode}, ${country}`;

  try {
    const response = await fetch(
      `/api/geocode?address=${encodeURIComponent(address)}`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data.success && data.coordinates) {
      return {
        success: true,
        coordinates: data.coordinates,
        formattedAddress: data.formattedAddress,
      };
    }

    return {
      success: false,
      error: data.error || 'Could not geocode address',
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: 'Failed to geocode address. Please try again.',
    };
  }
}

// ============= Device ID =============

/**
 * Get or generate a unique device identifier
 * Uses localStorage to persist across sessions
 */
export function getDeviceId(): string {
  const DEVICE_ID_KEY = 'careguide_device_id';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a random device ID
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

// ============= Format Helpers =============

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format GPS accuracy for display
 */
export function formatAccuracy(meters: number): string {
  if (meters <= 5) {
    return 'Excellent';
  } else if (meters <= 10) {
    return 'Good';
  } else if (meters <= 20) {
    return 'Fair';
  } else {
    return 'Poor';
  }
}
