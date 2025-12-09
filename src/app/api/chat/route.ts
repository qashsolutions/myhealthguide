export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, ChatContext } from '@/lib/ai/chatService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, conversationHistory } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    const result = await generateChatResponse(
      message,
      context as ChatContext,
      conversationHistory || []
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
