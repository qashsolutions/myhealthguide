/**
 * AI Router API Endpoint
 *
 * Provides access to the centralized AI Router for testing and integration.
 *
 * Endpoints:
 * - POST /api/ai-router - Send a query to the AI Router
 * - GET /api/ai-router/test - Test provider connectivity
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  routeAIRequest,
  testProviders,
  type AIRouterRequest,
} from '@/lib/ai/aiRouter';

// POST - Send query to AI Router
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query field' },
        { status: 400 }
      );
    }

    // Build request
    const aiRequest: AIRouterRequest = {
      query: body.query,
      systemPrompt: body.systemPrompt,
      requestType: body.requestType,
      forceProvider: body.forceProvider,
      forceComplexity: body.forceComplexity,
      context: body.context,
      useThinking: body.useThinking,
      thinkingLevel: body.thinkingLevel,
    };

    // Route the request
    const response = await routeAIRequest(aiRequest);

    // Return response
    return NextResponse.json({
      success: response.success,
      response: response.response,
      error: response.error,
      errorCode: response.errorCode,
      metadata: {
        provider: response.metadata.provider,
        model: response.metadata.model,
        latencyMs: response.metadata.latencyMs,
        usedFallback: response.metadata.usedFallback,
        complexity: response.metadata.complexity,
      },
    });
  } catch (error) {
    console.error('[AI Router API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// GET - Test provider connectivity
export async function GET() {
  try {
    const results = await testProviders();

    return NextResponse.json({
      success: true,
      providers: results,
      summary: {
        geminiAvailable: results.gemini.available,
        claudeAvailable: results.claude.available,
        atLeastOneAvailable:
          results.gemini.available || results.claude.available,
      },
    });
  } catch (error) {
    console.error('[AI Router API] Test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test providers',
      },
      { status: 500 }
    );
  }
}
