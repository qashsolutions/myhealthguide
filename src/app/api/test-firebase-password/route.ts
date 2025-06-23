import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test-firebase-password
 * Direct test of Firebase REST API password verification
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );
    
    const data = await response.json();
    
    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      requestSent: {
        email,
        passwordLength: password?.length || 0,
      },
      response: data,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}