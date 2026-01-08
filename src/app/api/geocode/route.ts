import { NextRequest, NextResponse } from 'next/server';

interface GeocodeRequest {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * POST /api/geocode
 * Converts an address to latitude/longitude coordinates using Google Maps Geocoding API
 */
export async function POST(request: NextRequest) {
  try {
    const body: GeocodeRequest = await request.json();
    const { street, city, state, zipCode, country = 'USA' } = body;

    // Validate required fields
    if (!street || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required address fields' },
        { status: 400 }
      );
    }

    // Build the address string
    const address = `${street}, ${city}, ${state} ${zipCode}, ${country}`;
    const encodedAddress = encodeURIComponent(address);

    // Get API key from environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not configured, returning mock coordinates');
      // Return mock coordinates for development (center of Dallas, TX)
      return NextResponse.json({
        latitude: 32.7767,
        longitude: -96.7970,
        formattedAddress: address,
        mock: true,
      });
    }

    // Call Google Maps Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;

      return NextResponse.json({
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
      });
    } else if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', data.error_message);
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 503 }
      );
    } else {
      console.error('Google Maps API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: 'Failed to geocode address' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geocode
 * Alternative GET method for simpler requests
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Missing address parameter' },
      { status: 400 }
    );
  }

  // Get API key from environment
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not configured, returning mock coordinates');
    return NextResponse.json({
      latitude: 32.7767,
      longitude: -96.7970,
      formattedAddress: address,
      mock: true,
    });
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;

      return NextResponse.json({
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
      });
    } else {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
