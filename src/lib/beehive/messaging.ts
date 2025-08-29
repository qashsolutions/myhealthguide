import { supabase } from '@/lib/supabase';
import { geminiModel } from './ai-client';

/**
 * Intelligent Messaging System for Beehive
 * Uses Gemini AI for profanity filtering, suggestions, and conversation guidance
 */

export interface Message {
  id: string;
  booking_id?: string;
  conversation_id?: string;
  sender_id: string;
  receiver_id: string;
  message_type: 'text' | 'system' | 'alert' | 'suggestion';
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  metadata?: {
    filtered?: boolean;
    original_content?: string;
    suggestions?: string[];
    ai_flagged?: string[];
  };
}

export interface Conversation {
  id: string;
  patient_id: string;
  caregiver_id: string;
  booking_id?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  status: 'active' | 'archived' | 'blocked';
}

export interface MessageSuggestion {
  text: string;
  category: 'greeting' | 'question' | 'scheduling' | 'care_needs' | 'emergency' | 'closing';
  priority: number;
}

/**
 * Filter message for profanity and inappropriate content using Gemini
 */
export async function filterMessage(content: string): Promise<{
  filtered: boolean;
  cleanContent: string;
  flags: string[];
}> {
  try {
    const prompt = `
    Analyze this message for a caregiver-patient communication platform.
    Message: "${content}"
    
    Tasks:
    1. Check for profanity, harassment, or inappropriate content
    2. If found, provide a cleaned version
    3. Flag specific concerns (profanity, harassment, personal_info_sharing, medical_advice, etc.)
    
    Response format (JSON):
    {
      "has_issues": boolean,
      "clean_version": "cleaned message or original if OK",
      "flags": ["list", "of", "concerns"],
      "severity": "none" | "low" | "medium" | "high"
    }
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    try {
      const analysis = JSON.parse(text);
      return {
        filtered: analysis.has_issues,
        cleanContent: analysis.clean_version || content,
        flags: analysis.flags || [],
      };
    } catch (parseError) {
      // Fallback to basic filtering
      return {
        filtered: false,
        cleanContent: content,
        flags: [],
      };
    }
  } catch (error) {
    console.error('Message filtering error:', error);
    // Don't block messages if AI fails
    return {
      filtered: false,
      cleanContent: content,
      flags: [],
    };
  }
}

/**
 * Generate smart message suggestions based on conversation context
 */
export async function generateSuggestions(
  conversationHistory: Message[],
  userRole: 'patient' | 'caregiver'
): Promise<MessageSuggestion[]> {
  try {
    // Get last 5 messages for context
    const recentMessages = conversationHistory.slice(-5);
    const context = recentMessages
      .map(m => `${m.sender_id === 'patient' ? 'Patient' : 'Caregiver'}: ${m.content}`)
      .join('\n');

    const prompt = `
    Based on this elder care conversation, suggest 3-4 helpful follow-up messages for the ${userRole}.
    
    Conversation:
    ${context}
    
    Consider:
    - Common ${userRole} needs and questions
    - Appropriate elder care communication
    - Building trust and rapport
    - Practical next steps
    
    Response format (JSON):
    {
      "suggestions": [
        {
          "text": "suggested message",
          "category": "greeting|question|scheduling|care_needs|emergency|closing",
          "priority": 1-5
        }
      ]
    }
    
    Keep suggestions:
    - Short and clear (under 15 words)
    - Respectful and professional
    - Relevant to elder care context
    - Easy to understand
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const data = JSON.parse(text);
      return data.suggestions || [];
    } catch (parseError) {
      // Return default suggestions
      return getDefaultSuggestions(userRole);
    }
  } catch (error) {
    console.error('Suggestion generation error:', error);
    return getDefaultSuggestions(userRole);
  }
}

/**
 * Default suggestions when AI is unavailable
 */
function getDefaultSuggestions(userRole: 'patient' | 'caregiver'): MessageSuggestion[] {
  if (userRole === 'patient') {
    return [
      { text: "What are your available times this week?", category: 'scheduling', priority: 1 },
      { text: "Do you have experience with dementia care?", category: 'question', priority: 2 },
      { text: "Can we schedule a phone call first?", category: 'scheduling', priority: 3 },
      { text: "What languages do you speak?", category: 'question', priority: 4 },
    ];
  } else {
    return [
      { text: "I'm available Monday through Friday", category: 'scheduling', priority: 1 },
      { text: "What specific care needs do you have?", category: 'care_needs', priority: 2 },
      { text: "I'd be happy to discuss your requirements", category: 'greeting', priority: 3 },
      { text: "When would be a good time to start?", category: 'scheduling', priority: 4 },
    ];
  }
}

/**
 * Get conversation guidance - what to ask next
 */
export async function getConversationGuidance(
  conversationHistory: Message[],
  userRole: 'patient' | 'caregiver'
): Promise<string> {
  try {
    const hasDiscussed = {
      schedule: conversationHistory.some(m => 
        m.content.toLowerCase().includes('available') || 
        m.content.toLowerCase().includes('schedule')
      ),
      experience: conversationHistory.some(m => 
        m.content.toLowerCase().includes('experience') || 
        m.content.toLowerCase().includes('years')
      ),
      rates: conversationHistory.some(m => 
        m.content.toLowerCase().includes('rate') || 
        m.content.toLowerCase().includes('cost') ||
        m.content.toLowerCase().includes('$')
      ),
      languages: conversationHistory.some(m => 
        m.content.toLowerCase().includes('language') || 
        m.content.toLowerCase().includes('speak')
      ),
    };

    const prompt = `
    Suggest what important topic to discuss next in this elder care conversation.
    User is a ${userRole}.
    
    Topics already discussed:
    - Schedule: ${hasDiscussed.schedule}
    - Experience: ${hasDiscussed.experience}
    - Rates: ${hasDiscussed.rates}
    - Languages: ${hasDiscussed.languages}
    
    Provide a brief, friendly guidance message (max 20 words).
    Focus on what hasn't been discussed yet.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let guidance = response.text().trim();
    
    // Remove quotes if present
    guidance = guidance.replace(/^["']|["']$/g, '');
    
    return guidance;
  } catch (error) {
    console.error('Guidance generation error:', error);
    // Return helpful default
    if (userRole === 'patient') {
      return "Consider asking about their experience and availability";
    } else {
      return "Ask about specific care needs and preferred schedule";
    }
  }
}

/**
 * Send a message with AI filtering
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  bookingId?: string,
  conversationId?: string
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    // Filter message for inappropriate content
    const { filtered, cleanContent, flags } = await filterMessage(content);
    
    // Block high-severity content
    if (flags.includes('harassment') || flags.includes('threat')) {
      return {
        success: false,
        error: 'Message contains inappropriate content and cannot be sent.',
      };
    }

    // Insert message into database
    const { data, error } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        message_type: 'text',
        content: cleanContent,
        metadata: filtered ? {
          filtered: true,
          original_content: content,
          ai_flagged: flags,
        } : undefined,
      })
      .select()
      .single();

    if (error) throw error;

    // Log if message was flagged
    if (flags.length > 0) {
      await supabase.from('message_flags').insert({
        message_id: data.id,
        flags: flags,
        severity: flags.includes('harassment') ? 'high' : 'low',
      });
    }

    return { success: true, message: data };
  } catch (error: any) {
    console.error('Send message error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
    };
  }
}

/**
 * Get conversation history
 */
export async function getConversation(
  userId: string,
  otherUserId: string,
  bookingId?: string
): Promise<Message[]> {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
      .order('created_at', { ascending: true });

    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Mark messages as read
    await markMessagesAsRead(userId, otherUserId);

    return data || [];
  } catch (error) {
    console.error('Get conversation error:', error);
    return [];
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  userId: string,
  senderId: string
): Promise<void> {
  try {
    await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId)
      .is('read_at', null);
  } catch (error) {
    console.error('Mark as read error:', error);
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    return count || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
}

/**
 * Set up real-time message subscription
 */
export function subscribeToMessages(
  userId: string,
  onNewMessage: (message: Message) => void
) {
  const subscription = supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Analyze conversation sentiment for safety monitoring
 */
export async function analyzeConversationSentiment(
  messages: Message[]
): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative' | 'concerning';
  riskFactors: string[];
  shouldEscalate: boolean;
}> {
  try {
    const conversation = messages
      .map(m => `${m.sender_id}: ${m.content}`)
      .join('\n');

    const prompt = `
    Analyze this caregiver-patient conversation for safety concerns.
    
    Conversation:
    ${conversation}
    
    Look for:
    - Aggressive or hostile language
    - Requests for money or personal information
    - Medical advice beyond caregiver scope
    - Signs of elder abuse or neglect
    - Boundary violations
    
    Response format (JSON):
    {
      "sentiment": "positive|neutral|negative|concerning",
      "risk_factors": ["list of concerns"],
      "should_escalate": boolean,
      "explanation": "brief explanation"
    }
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const analysis = JSON.parse(text);
      return {
        sentiment: analysis.sentiment || 'neutral',
        riskFactors: analysis.risk_factors || [],
        shouldEscalate: analysis.should_escalate || false,
      };
    } catch (parseError) {
      return {
        sentiment: 'neutral',
        riskFactors: [],
        shouldEscalate: false,
      };
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      sentiment: 'neutral',
      riskFactors: [],
      shouldEscalate: false,
    };
  }
}