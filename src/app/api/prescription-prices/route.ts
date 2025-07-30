import { NextRequest, NextResponse } from 'next/server';

const COST_PLUS_API_URL = 'https://us-central1-costplusdrugs-publicapi.cloudfunctions.net/main';

/**
 * API route for Cost Plus Drugs medication price search
 * Proxies requests to the Cost Plus Drugs API
 */

// Helper function to parse medication name and strength
function parseMedicationSearch(searchTerm: string): { name: string; strength?: string } {
  // Common strength patterns: 10mg, 10 mg, 100mcg, 5ml, etc.
  const strengthPattern = /\b(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|%|unit|units)\b/i;
  const match = searchTerm.match(strengthPattern);
  
  if (match) {
    // Remove the strength from the search term to get the medication name
    const name = searchTerm.replace(match[0], '').trim();
    const strength = match[1] + match[2].toLowerCase();
    return { name, strength };
  }
  
  return { name: searchTerm.trim() };
}

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

    // Parse the search term for medication name and strength
    const { name: medicationName, strength } = parseMedicationSearch(searchTerm);
    console.log('Parsed search:', { medicationName, strength, quantity });

    let allResults: any[] = [];
    let lastError: string | null = null;

    // Strategy 1: Try with medication name AND strength (if strength provided)
    if (strength) {
      try {
        const url = new URL(COST_PLUS_API_URL);
        url.searchParams.append('medication_name', medicationName);
        url.searchParams.append('strength', strength);
        // Temporarily remove quantity_units to test
        // url.searchParams.append('quantity_units', quantity.toString());

        console.log('Strategy 1 - Name + Strength:', url.toString());
        
        const response = await fetch(url.toString());
        const data = await response.json();
        
        console.log('Strategy 1 response:', { 
          status: response.status, 
          resultsCount: data.results?.length || 0,
          data: data 
        });
        
        if (data.results && data.results.length > 0) {
          allResults = [...allResults, ...data.results];
        }
      } catch (error) {
        console.error('Strategy 1 failed:', error);
        lastError = 'Failed to search with medication name and strength';
      }
    }

    // Strategy 2: Try brand name search with generic equivalents
    if (allResults.length === 0) {
      try {
        const brandSearchUrl = new URL(COST_PLUS_API_URL);
        brandSearchUrl.searchParams.append('brand_name', searchTerm.trim());
        brandSearchUrl.searchParams.append('generic_equivalent_ok', 'true');
        // Temporarily remove quantity_units to test
        // brandSearchUrl.searchParams.append('quantity_units', quantity.toString());

        console.log('Strategy 2 - Brand name search:', brandSearchUrl.toString());

        const response = await fetch(brandSearchUrl.toString());
        const data = await response.json();

        console.log('Strategy 2 response:', { 
          status: response.status, 
          resultsCount: data.results?.length || 0 
        });

        if (data.results && data.results.length > 0) {
          allResults = [...allResults, ...data.results];
        }
      } catch (error) {
        console.error('Strategy 2 failed:', error);
        lastError = 'Failed to search by brand name';
      }
    }

    // Strategy 3: Try medication name only (without strength)
    if (allResults.length === 0) {
      try {
        const medicationSearchUrl = new URL(COST_PLUS_API_URL);
        medicationSearchUrl.searchParams.append('medication_name', medicationName);
        // Temporarily remove quantity_units to test
        // medicationSearchUrl.searchParams.append('quantity_units', quantity.toString());

        console.log('Strategy 3 - Medication name only:', medicationSearchUrl.toString());

        const response = await fetch(medicationSearchUrl.toString());
        const data = await response.json();

        console.log('Strategy 3 response:', { 
          status: response.status, 
          resultsCount: data.results?.length || 0 
        });

        if (data.results && data.results.length > 0) {
          allResults = [...allResults, ...data.results];
        }
      } catch (error) {
        console.error('Strategy 3 failed:', error);
        lastError = 'Failed to search by medication name';
      }
    }

    // Remove duplicates based on medication name + strength
    const uniqueResults = allResults.reduce((acc: any[], current) => {
      const key = `${current.medication_name}_${current.strength}`;
      if (!acc.find(item => `${item.medication_name}_${item.strength}` === key)) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Sort results by strength if available
    if (uniqueResults.length > 0) {
      uniqueResults.sort((a: any, b: any) => {
        // Extract numeric values from strength for sorting
        const getNumericStrength = (strength: string) => {
          const match = strength.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        return getNumericStrength(a.strength) - getNumericStrength(b.strength);
      });
    }

    // Format results for the frontend
    const formattedResults = uniqueResults.map(item => ({
      medication_name: item.medication_name || item.brand_name || 'Unknown',
      strength: item.strength || '',
      form: item.form || '',
      manufacturer: item.manufacturer || '',
      // Use requested_quote if available (when we query with quantity_units), otherwise use price
      price: item.requested_quote || item.price || 0,
      price_per_unit: item.price_per_unit || 0,
      quantity: quantity, // Always use the requested quantity
      url: item.url || '',  // Add the Cost Plus Drugs website URL
    }));

    console.log(`Found ${formattedResults.length} results for "${searchTerm}"`);

    return NextResponse.json({
      results: formattedResults,
      searchTerm,
      quantity,
    });

  } catch (error) {
    console.error('Cost Plus Drugs API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: 'Unable to search medication prices. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}