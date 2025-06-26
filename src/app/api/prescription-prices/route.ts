import { NextRequest, NextResponse } from 'next/server';

const COST_PLUS_API_URL = 'https://us-central1-costplusdrugs-publicapi.cloudfunctions.net/main';

/**
 * API route for Cost Plus Drugs medication price search
 * Proxies requests to the Cost Plus Drugs API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerm, quantity = 30 } = body;

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    // Try searching by brand name first with generic equivalents
    const brandSearchUrl = new URL(COST_PLUS_API_URL);
    brandSearchUrl.searchParams.append('brand_name', searchTerm);
    brandSearchUrl.searchParams.append('generic_equivalent_ok', 'true');
    brandSearchUrl.searchParams.append('quantity_units', quantity.toString());

    console.log('Searching Cost Plus Drugs API:', brandSearchUrl.toString());

    let response = await fetch(brandSearchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    let data = await response.json();

    // If no results from brand search, try medication name search
    if (!data.results || data.results.length === 0) {
      const medicationSearchUrl = new URL(COST_PLUS_API_URL);
      medicationSearchUrl.searchParams.append('medication_name', searchTerm);
      medicationSearchUrl.searchParams.append('quantity_units', quantity.toString());

      console.log('Trying medication name search:', medicationSearchUrl.toString());

      response = await fetch(medicationSearchUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      data = await response.json();
    }

    // Sort results by strength if available
    if (data.results && data.results.length > 0) {
      data.results.sort((a: any, b: any) => {
        // Extract numeric values from strength for sorting
        const getNumericStrength = (strength: string) => {
          const match = strength.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        return getNumericStrength(a.strength) - getNumericStrength(b.strength);
      });
    }

    return NextResponse.json({
      results: data.results || [],
      searchTerm,
      quantity,
    });

  } catch (error) {
    console.error('Cost Plus Drugs API error:', error);
    return NextResponse.json(
      { error: 'Failed to search medication prices' },
      { status: 500 }
    );
  }
}